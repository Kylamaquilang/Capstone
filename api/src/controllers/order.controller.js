import { pool } from '../database/db.js'
import { createOrderStatusNotification } from '../utils/notification-helper.js'
import { emitOrderUpdate, emitNewOrderAlert, createAndEmitNotification, emitUserNotification, emitAdminDataRefresh, emitUserDataRefresh } from '../utils/socket-helper.js'
import { sendDeliveredOrderEmail } from '../utils/emailService.js'

// Helper function to create delivered order notification for admin confirmation
const createDeliveredOrderNotification = async (orderId, userId) => {
  try {
    // Get all admin users
    const [adminUsers] = await pool.query(`
      SELECT id, name FROM users WHERE role = 'admin'
    `);
    
    // Get customer info and product summary for the order
    const [orderInfo] = await pool.query(`
      SELECT u.name as customer_name,
             GROUP_CONCAT(CONCAT(oi.quantity, 'x ', p.name, 
               CASE WHEN ps.size IS NOT NULL THEN CONCAT(' (', ps.size, ')') ELSE '' END
             ) SEPARATOR ', ') as product_summary
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_sizes ps ON oi.size_id = ps.id
      WHERE o.id = ?
      GROUP BY o.id, u.name
    `, [orderId]);
    
    const customerName = orderInfo[0]?.customer_name || 'Customer';
    const productSummary = orderInfo[0]?.product_summary || 'items';
    
    // Create notification for each admin user
    for (const admin of adminUsers) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, related_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        admin.id,
        `📦 ${productSummary} Order Delivered - Confirmation Needed`,
        `Order for ${productSummary} from ${customerName} has been delivered. Please confirm receipt.`,
        'delivered_confirmation',
        orderId
      ]);
    }
    
    console.log(`✅ Delivered order confirmation notifications created for order #${orderId}`);
  } catch (error) {
    console.error('❌ Error creating delivered order notification:', error);
  }
}

// Helper function to create cancelled order notification for admin
const createCancelledOrderNotification = async (orderId, userId) => {
  try {
    // Get all admin users
    const [adminUsers] = await pool.query(`
      SELECT id, name FROM users WHERE role = 'admin'
    `);
    
    // Get customer info and product summary for the order
    const [orderInfo] = await pool.query(`
      SELECT u.name as customer_name,
             GROUP_CONCAT(CONCAT(oi.quantity, 'x ', p.name, 
               CASE WHEN ps.size IS NOT NULL THEN CONCAT(' (', ps.size, ')') ELSE '' END
             ) SEPARATOR ', ') as product_summary
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_sizes ps ON oi.size_id = ps.id
      WHERE o.id = ?
      GROUP BY o.id, u.name
    `, [orderId]);
    
    const customerName = orderInfo[0]?.customer_name || 'Customer';
    const productSummary = orderInfo[0]?.product_summary || 'items';
    
    // Create notification for each admin user
    for (const admin of adminUsers) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, related_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        admin.id,
        `❌ ${productSummary} Order Cancelled`,
        `Order for ${productSummary} from ${customerName} has been cancelled.`,
        'order_cancelled',
        orderId
      ]);
    }
    
    console.log(`✅ Cancelled order notifications created for order #${orderId}`);
  } catch (error) {
    console.error('❌ Error creating cancelled order notification:', error);
  }
}

// 📄 User gets their order details (for thank you page)
export const getUserOrderDetails = async (req, res) => {
  const user_id = req.user.id
  const order_id = req.params.id

  try {
    // Get order details
    const [orders] = await pool.query(`
      SELECT id, total_amount, payment_method, pay_at_counter, status, payment_status, created_at
      FROM orders 
      WHERE id = ? AND user_id = ?
    `, [order_id, user_id])

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const order = orders[0]

    // Get order items
    const [items] = await pool.query(`
      SELECT product_name, quantity, unit_price, unit_cost, total_price
      FROM order_items 
      WHERE order_id = ?
    `, [order_id])

    res.json({
      ...order,
      items: items
    })

  } catch (error) {
    console.error('Error fetching user order details:', error)
    res.status(500).json({ error: 'Failed to fetch order details' })
  }
}

// 📄 User views their orders
export const getUserOrders = async (req, res) => {
  const user_id = req.user.id

  try {
    const [orders] = await pool.query(`
      SELECT id, total_amount, payment_method, pay_at_counter, status, created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [user_id])

    // Get order items for each order to include product names
    for (let order of orders) {
      const [items] = await pool.query(`
        SELECT 
          oi.quantity, 
          oi.unit_price,
          oi.total_price,
          CASE 
            WHEN oi.product_id IS NULL THEN 'Unavailable Product'
            ELSE p.name 
          END as product_name, 
          CASE 
            WHEN oi.product_id IS NULL THEN NULL
            ELSE p.image 
          END as image, 
          oi.product_id,
          ps.size as size_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_sizes ps ON oi.size_id = ps.id
        WHERE oi.order_id = ?
      `, [order.id])
      
      order.items = items
    }

    res.json(orders)
  } catch (err) {
    console.error('User order history error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// 👩‍💼 Admin views all orders
export const getAllOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT 
        o.id, 
        o.user_id, 
        u.name AS user_name,
        u.student_id,
        u.email,
        u.degree,
        u.year_level,
        u.section,
        o.total_amount, 
        o.payment_method, 
        o.pay_at_counter,
        o.payment_status,
        o.status, 
        o.created_at,
        o.updated_at,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
        (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as total_quantity
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `)

    // Get order items for each order to include product names
    for (let order of orders) {
      const [items] = await pool.query(`
        SELECT 
          oi.quantity, 
          oi.unit_price,
          oi.unit_cost,
          oi.total_price,
          CASE 
            WHEN oi.product_id IS NULL THEN 'Unavailable Product'
            ELSE p.name 
          END as product_name, 
          CASE 
            WHEN oi.product_id IS NULL THEN NULL
            ELSE p.image 
          END as image, 
          oi.product_id,
          ps.size as size_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_sizes ps ON oi.size_id = ps.id
        WHERE oi.order_id = ?
      `, [order.id])
      
      order.items = items
    }

    res.json(orders)
  } catch (err) {
    console.error('Admin orders fetch error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// 📦 Get order items (with size)
export const getOrderItems = async (req, res) => {
  const { id } = req.params

  try {
    const [items] = await pool.query(`
      SELECT 
        oi.quantity, 
        oi.size, 
        oi.unit_price, 
        oi.unit_cost, 
        oi.total_price, 
        CASE 
          WHEN oi.product_id IS NULL THEN 'Unavailable Product'
          ELSE p.name 
        END as name, 
        CASE 
          WHEN oi.product_id IS NULL THEN NULL
          ELSE p.image 
        END as image, 
        oi.product_id
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [id])

    res.json(items)
  } catch (err) {
    console.error('Get order items error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// 📋 Get single order with details
export const getOrderById = async (req, res) => {
  const { id } = req.params

  try {
    // Get order details
    const [orders] = await pool.query(`
      SELECT 
        o.id, 
        o.user_id, 
        u.name AS user_name,
        u.student_id,
        u.email,
        o.total_amount, 
        o.payment_method, 
        o.pay_at_counter,
        o.status, 
        o.created_at,
        o.updated_at
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [id])

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const order = orders[0]

    // Get order items
    const [items] = await pool.query(`
      SELECT 
        oi.quantity, 
        oi.unit_price, 
        oi.total_price, 
        oi.size as size,
        p.name as product_name, 
        p.image, 
        p.id as product_id, 
        ps.size as size_name
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_sizes ps ON oi.size_id = ps.id
      WHERE oi.order_id = ?
    `, [id])

    // Get order status history
    const [statusHistory] = await pool.query(`
      SELECT old_status, new_status, notes, created_at
      FROM order_status_logs
      WHERE order_id = ?
      ORDER BY created_at DESC
    `, [id])

    res.json({
      ...order,
      items,
      status_history: statusHistory
    })
  } catch (err) {
    console.error('Get order by ID error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// 🔁 Admin updates order status
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params
  const { status, notes } = req.body

  // Enhanced order statuses
  const validStatuses = ['pending', 'processing', 'ready_for_pickup', 'delivered', 'cancelled', 'refunded']
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: 'Invalid status value',
      validStatuses: validStatuses
    })
  }

  try {
    // Get current order details
    const [currentOrder] = await pool.query(
      'SELECT status, user_id, total_amount, payment_method, payment_status FROM orders WHERE id = ?',
      [id]
    )

    if (currentOrder.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const oldStatus = currentOrder[0].status
    const userId = currentOrder[0].user_id
    const totalAmount = currentOrder[0].total_amount
    const paymentMethod = currentOrder[0].payment_method
    const paymentStatus = currentOrder[0].payment_status

    // Update order status
    const [result] = await pool.query(
      `UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    // Log status change
    await pool.query(`
      INSERT INTO order_status_logs (order_id, old_status, new_status, notes, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [id, oldStatus, status, notes || null])

    // Handle inventory and sales tracking based on status changes
    if (status === 'cancelled' || status === 'refunded') {
      // Restore stock for cancelled/refunded orders
      await restoreOrderStock(id)
      
      // Log sales reversal
      await logSalesMovement(id, 'reversal', totalAmount, paymentMethod, `Order ${status}`)
      
    } else if (status === 'delivered' && oldStatus !== 'delivered') {
      // Record the sale when order is delivered
      await logSalesMovement(id, 'sale', totalAmount, paymentMethod, 'Order delivered - Sale recorded')
      
      // Automatically mark payment as paid when order is delivered
      if (paymentStatus !== 'paid') {
        await pool.query(
          'UPDATE orders SET payment_status = ? WHERE id = ?',
          ['paid', id]
        )
        
        // Log the payment completion
        await pool.query(`
          INSERT INTO payment_transactions (
            order_id, 
            transaction_id, 
            amount, 
            payment_method, 
            status, 
            gateway_response,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [
          id,
          `auto_paid_${id}_${Date.now()}`,
          totalAmount,
          paymentMethod,
          'completed',
          JSON.stringify({ 
            auto_completed: true, 
            reason: 'Order delivered',
            completed_at: new Date().toISOString()
          })
        ])
      }
    }

    // Create notification for user
    console.log(`🔔 Starting notification creation for order ${id}, user ${userId}, status: ${status}`);
    const notificationResult = await createOrderStatusNotification(userId, id, status)
    console.log(`🔔 Notification result:`, notificationResult);
    
    // Emit real-time notification to user
    const io = req.app.get('io')
    console.log(`🔔 Socket.io instance available:`, !!io);
    if (io && notificationResult) {
      console.log(`🔔 Emitting notification to user ${userId}`);
      emitUserNotification(io, userId, {
        id: notificationResult.id,
        title: notificationResult.title,
        message: notificationResult.message,
        type: notificationResult.type,
        orderId: id,
        status: status,
        read: false,
        timestamp: new Date().toISOString(),
        priority: status === 'ready_for_pickup' ? 'high' : 'medium',
        hasAction: notificationResult.hasAction,
        actionData: notificationResult.actionData
      })
    } else {
      console.log(`🔔 Not emitting notification - io: ${!!io}, notificationResult:`, !!notificationResult);
    }
    
    // Send delivered order email with thank you message and receipt
    if (status === 'delivered' && oldStatus !== 'delivered') {
      try {
        console.log(`📧 Preparing to send delivered order email for order ${id}`);
        
        // Get order details for email
        const [orderDetails] = await pool.query(`
          SELECT o.id as orderId, o.total_amount, o.payment_method, o.created_at,
                 u.name as customer_name, u.email as customer_email,
                 oi.quantity, oi.unit_price as price, p.name as product_name, ps.size
          FROM orders o
          JOIN users u ON o.user_id = u.id
          JOIN order_items oi ON o.id = oi.order_id
          JOIN products p ON oi.product_id = p.id
          LEFT JOIN product_sizes ps ON oi.size_id = ps.id
          WHERE o.id = ?
        `, [id]);
        
        if (orderDetails.length > 0) {
          const orderData = {
            orderId: orderDetails[0].orderId,
            items: orderDetails.map(item => ({
              quantity: item.quantity,
              product_name: item.product_name,
              price: item.price,
              size: item.size
            })),
            totalAmount: orderDetails[0].total_amount,
            paymentMethod: orderDetails[0].payment_method,
            createdAt: orderDetails[0].created_at,
            deliveredAt: new Date().toISOString()
          };
          
          const emailResult = await sendDeliveredOrderEmail(
            orderDetails[0].customer_email,
            orderDetails[0].customer_name,
            orderData
          );
          
          if (emailResult.success) {
            console.log(`✅ Delivered order email sent successfully to: ${orderDetails[0].customer_email}`);
          } else {
            console.log(`⚠️ Delivered order email failed: ${emailResult.message}`);
          }
        } else {
          console.log(`⚠️ Could not find order details for email - order ${id}`);
        }
      } catch (emailError) {
        console.error('❌ Error sending delivered order email:', emailError);
        // Don't fail the entire operation if email fails
      }
    }
    
    // Email notifications disabled - only in-app notifications are used
    
    // Emit real-time order update
    if (io) {
      emitOrderUpdate(io, userId, {
        orderId: id,
        status,
        previousStatus: oldStatus,
        timestamp: new Date().toISOString()
      })
      
      // Emit data refresh signals
      emitAdminDataRefresh(io, 'orders', { action: 'updated', orderId: id, status });
      emitUserDataRefresh(io, userId, 'orders', { action: 'updated', orderId: id, status });
    }
    
    // If order is marked as delivered, create special notification for admin confirmation
    if (status === 'delivered') {
      await createDeliveredOrderNotification(id, userId)
    }
    
    // If order is cancelled, create admin notification
    if (status === 'cancelled') {
      await createCancelledOrderNotification(id, userId)
    }

    res.json({ 
      message: `Order status updated to '${status}'`,
      previousStatus: oldStatus,
      newStatus: status,
      inventoryUpdated: (status === 'cancelled' || status === 'refunded'),
      salesLogged: (status === 'delivered'),
      paymentStatusUpdated: (status === 'delivered' && paymentStatus !== 'paid'),
      paymentStatus: status === 'delivered' ? 'paid' : paymentStatus
    })
  } catch (err) {
    console.error('Update status error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Helper function to restore stock for cancelled orders
const restoreOrderStock = async (orderId) => {
  try {
    const [orderItems] = await pool.query(`
      SELECT oi.product_id, oi.quantity, oi.size_id, ps.stock as size_stock
      FROM order_items oi
      LEFT JOIN product_sizes ps ON oi.size_id = ps.id
      WHERE oi.order_id = ?
    `, [orderId])

    for (const item of orderItems) {
      if (item.size_id) {
        // Restore size-specific stock
        await pool.query(
          'UPDATE product_sizes SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.size_id]
        )
      } else {
        // Restore general product stock
        await pool.query(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.product_id]
        )
      }
    }
  } catch (error) {
    console.error('Error restoring stock:', error)
  }
}

// Helper function to log sales movements
const logSalesMovement = async (orderId, movementType, amount, paymentMethod, description) => {
  try {
    await pool.query(`
      INSERT INTO sales_logs (order_id, movement_type, amount, payment_method, description, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [orderId, movementType, amount, paymentMethod, description])
  } catch (error) {
    console.error('Error logging sales movement:', error)
  }
}


// 📊 Get order statistics
export const getOrderStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query
    let dateFilter = ''
    
    switch (period) {
      case 'day':
        dateFilter = 'AND DATE(created_at) = CURDATE()'
        break
      case 'week':
        dateFilter = 'AND YEARWEEK(created_at) = YEARWEEK(CURDATE())'
        break
      case 'month':
        dateFilter = 'AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())'
        break
      case 'year':
        dateFilter = 'AND YEAR(created_at) = YEAR(CURDATE())'
        break
    }

    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
        COUNT(CASE WHEN status = 'ready_for_pickup' THEN 1 END) as ready_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM orders
      WHERE 1=1 ${dateFilter}
    `)

    const [dailyStats] = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `)

    res.json({
      period,
      summary: stats[0],
      dailyStats,
      statusBreakdown: {
        pending: stats[0].pending_orders,
        processing: stats[0].processing_orders,
        ready: stats[0].ready_orders,
        delivered: stats[0].delivered_orders,
        cancelled: stats[0].cancelled_orders
      }
    })
  } catch (err) {
    console.error('Get order stats error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// 📈 Get sales performance
export const getSalesPerformance = async (req, res) => {
  try {
    console.log('📊 Sales performance request received:', req.query)
    
    const { start_date, end_date, group_by = 'day' } = req.query
    
    let groupClause = 'DATE(created_at)'
    if (group_by === 'month') {
      groupClause = 'DATE_FORMAT(created_at, "%Y-%m")'
    } else if (group_by === 'year') {
      groupClause = 'YEAR(created_at)'
    }

    console.log('📊 Executing sales data query...')
    
    // Simple date filtering - use DATE() function to avoid timezone issues
    let dateFilter = '';
    let dateParams = [];
    
    if (start_date) {
      dateFilter += 'AND DATE(o.created_at) >= ? ';
      dateParams.push(start_date);
    }
    if (end_date) {
      dateFilter += 'AND DATE(o.created_at) <= ? ';
      dateParams.push(end_date);
    }
    
    const [salesData] = await pool.query(`
      SELECT 
        ${groupClause.replace('created_at', 'o.created_at')} as period,
        COUNT(*) as orders,
        SUM(o.total_amount) as revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(CASE WHEN o.payment_method = 'gcash' THEN 1 END) as gcash_orders,
        COUNT(CASE WHEN o.payment_method = 'cash' THEN 1 END) as cash_orders,
        SUM(CASE WHEN o.payment_method = 'gcash' THEN o.total_amount ELSE 0 END) as gcash_revenue,
        SUM(CASE WHEN o.payment_method = 'cash' THEN o.total_amount ELSE 0 END) as cash_revenue
      FROM orders o
      WHERE o.status != 'cancelled'
      ${dateFilter}
      GROUP BY ${groupClause.replace('created_at', 'o.created_at')}
      ORDER BY period DESC
    `, dateParams)

    console.log('📊 Sales data query completed, executing top products query...')
    
    // Check if we have any orders first
    const [orderCount] = await pool.query('SELECT COUNT(*) as count FROM orders');
    console.log('📊 Total orders in database:', orderCount[0].count);
    
    let topProducts = [];
    if (orderCount[0].count > 0) {
      const [topProductsResult] = await pool.query(`
        SELECT 
          p.name as product_name,
          p.image as product_image,
          SUM(oi.quantity) as total_sold,
          SUM(oi.total_price) as total_revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
        ${dateFilter}
        GROUP BY p.id, p.name, p.image
        ORDER BY total_sold DESC
        LIMIT 10
      `, dateParams)
      topProducts = topProductsResult;
    } else {
      console.log('📊 No orders found, returning empty top products');
    }

    // Get payment method breakdown
    console.log('📊 Executing payment breakdown query...')
    const [paymentBreakdown] = await pool.query(`
      SELECT 
        o.payment_method,
        COUNT(*) as order_count,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value
      FROM orders o
      WHERE o.status != 'cancelled'
      ${dateFilter}
      GROUP BY o.payment_method
      ORDER BY total_revenue DESC
    `, dateParams)

    // Get inventory movement summary (simplified)
    console.log('📊 Executing inventory summary query...')
    let inventorySummary = [];
    try {
      const [inventoryResult] = await pool.query(`
        SELECT 
          movement_type,
          COUNT(*) as movement_count,
          SUM(ABS(quantity_change)) as total_quantity,
          COUNT(DISTINCT product_id) as products_affected
        FROM inventory_movements im
        WHERE im.order_id IS NOT NULL
        ${dateFilter.replace('created_at', 'im.created_at')}
        GROUP BY movement_type
      `, dateParams)
      inventorySummary = inventoryResult;
    } catch (inventoryError) {
      console.log('📊 Inventory movements table not available:', inventoryError.message);
      inventorySummary = [];
    }

    // Get sales logs summary from orders (more accurate)
    console.log('📊 Executing sales logs summary query...')
    let salesLogsSummary = {};
    try {
      // Use orders table for accurate sales data instead of sales_logs
      const [salesLogsResult] = await pool.query(`
        SELECT 
          COUNT(*) as total_sales_logs,
          SUM(total_amount) as total_sales_revenue,
          COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as completed_sales,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as reversed_sales,
          SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END) as completed_revenue,
          SUM(CASE WHEN status = 'cancelled' THEN total_amount ELSE 0 END) as reversed_revenue
        FROM orders o
        WHERE 1=1
        ${dateFilter}
      `, dateParams);
      salesLogsSummary = salesLogsResult[0] || {};
    } catch (salesLogsError) {
      console.log('📊 Sales logs query failed:', salesLogsError.message);
      salesLogsSummary = {};
    }

    // Always create summary data from orders (for accurate totals)
    const [summary] = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value,
        COUNT(CASE WHEN o.payment_method = 'gcash' THEN 1 END) as gcash_orders,
        COUNT(CASE WHEN o.payment_method = 'cash' THEN 1 END) as cash_orders,
        SUM(CASE WHEN o.payment_method = 'gcash' THEN o.total_amount ELSE 0 END) as gcash_revenue,
        SUM(CASE WHEN o.payment_method = 'cash' THEN o.total_amount ELSE 0 END) as cash_revenue
      FROM orders o
      WHERE o.status != 'cancelled'
      ${dateFilter}
    `, dateParams);
    
    const summaryData = summary[0];

    res.json({
      salesData,
      topProducts,
      paymentBreakdown,
      inventorySummary,
      salesLogsSummary: salesLogsSummary,
      summary: summaryData,
      period: { start_date, end_date, group_by }
    })
  } catch (err) {
    console.error('Get sales performance error:', err)
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    })
    
    // Provide more specific error messages
    if (err.code === 'ER_NO_SUCH_TABLE') {
      res.status(500).json({ 
        error: 'Database tables not found',
        message: 'Required database tables are missing. Please run the database setup script.',
        details: err.message
      })
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      res.status(500).json({ 
        error: 'Database connection error',
        message: 'Cannot connect to database. Please check your database configuration.',
        details: err.message
      })
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch sales performance data',
        details: err.message
      })
    }
  }
}

// ✅ Admin confirms order receipt
export const confirmOrderReceipt = async (req, res) => {
  const { id } = req.params
  const { action } = req.body // 'received' or 'cancelled'

  try {
    // Get order details
    const [orderData] = await pool.query(
      'SELECT user_id, status FROM orders WHERE id = ?',
      [id]
    )

    if (orderData.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const userId = orderData[0].user_id
    const currentStatus = orderData[0].status

    if (currentStatus !== 'delivered') {
      return res.status(400).json({ 
        error: 'Order must be in delivered status to confirm receipt' 
      })
    }

    if (action === 'received') {
      // Order successfully received - create thank you notification for user
      const [notificationResult] = await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `, [
        userId,
        '🎉 Order Successfully Received!',
        'Thank you! Your order has been successfully received and confirmed. We appreciate your business!',
        'system'
      ])

      // Emit real-time notification
      const io = req.app.get('io')
      if (io) {
        emitUserNotification(io, userId, {
          id: notificationResult.insertId,
          title: '🎉 Order Successfully Received!',
          message: 'Thank you! Your order has been successfully received and confirmed. We appreciate your business!',
          type: 'system',
          orderId: id,
          status: 'completed',
          read: false,
          timestamp: new Date().toISOString(),
          priority: 'high'
        })
      }

      // Update order status to completed
      await pool.query(
        'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
        ['completed', id]
      )

      res.json({ 
        success: true,
        message: 'Order receipt confirmed successfully',
        userNotified: true
      })

    } else if (action === 'cancelled') {
      // Order cancelled after delivery
      const [notificationResult] = await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `, [
        userId,
        '❌ Order Cancelled',
        'Your order has been cancelled after delivery. Please contact support for assistance.',
        'system'
      ])

      // Emit real-time notification
      const io = req.app.get('io')
      if (io) {
        emitUserNotification(io, userId, {
          id: notificationResult.insertId,
          title: '❌ Order Cancelled',
          message: 'Your order has been cancelled after delivery. Please contact support for assistance.',
          type: 'system',
          orderId: id,
          status: 'cancelled',
          read: false,
          timestamp: new Date().toISOString(),
          priority: 'high'
        })
      }

      // Update order status to cancelled
      await pool.query(
        'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
        ['cancelled', id]
      )

      res.json({ 
        success: true,
        message: 'Order cancelled successfully',
        userNotified: true
      })

    } else {
      return res.status(400).json({ 
        error: 'Invalid action. Must be "received" or "cancelled"' 
      })
    }

  } catch (err) {
    console.error('Confirm order receipt error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ✅ User confirms order receipt
export const userConfirmOrderReceipt = async (req, res) => {
  const { id } = req.params
  const user_id = req.user.id

  try {
    // Get order details and verify ownership
    const [orderData] = await pool.query(
      'SELECT user_id, status FROM orders WHERE id = ?',
      [id]
    )

    if (orderData.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    if (orderData[0].user_id !== user_id) {
      return res.status(403).json({ error: 'You can only confirm your own orders' })
    }

    const currentStatus = orderData[0].status

    if (currentStatus !== 'delivered') {
      return res.status(400).json({ 
        error: 'Order must be in delivered status to confirm receipt' 
      })
    }

    // Update order status to completed
    await pool.query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      ['completed', id]
    )

    // Update sales and inventory - get order items and update stock
    const [orderItems] = await pool.query(`
      SELECT oi.product_id, oi.quantity, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [id]);

    // Update inventory for each item
    for (const item of orderItems) {
      // Update products table stock
      await pool.query(`
        UPDATE products 
        SET stock = stock - ?
        WHERE id = ?
      `, [item.quantity, item.product_id]);
    }

    // Create product summary for notifications
    let productSummary = '';
    if (orderItems.length > 0) {
      if (orderItems.length === 1) {
        const item = orderItems[0];
        productSummary = `${item.quantity}x ${item.product_name}`;
      } else if (orderItems.length <= 3) {
        productSummary = orderItems.map(item => 
          `${item.quantity}x ${item.product_name}`
        ).join(', ');
      } else {
        const firstItem = orderItems[0];
        const firstItemText = `${firstItem.quantity}x ${firstItem.product_name}`;
        productSummary = `${firstItemText} and ${orderItems.length - 1} more items`;
      }
    }

    // Create thank you notification for user
    const [notificationResult] = await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [
      user_id,
      '🎉 Order Confirmed!',
      `Thank you for confirming receipt! Your order for ${productSummary} has been successfully completed. We appreciate your business!`,
      'system'
    ])

    // Emit real-time notification
    const io = req.app.get('io')
    if (io) {
      emitUserNotification(io, user_id, {
        id: notificationResult.insertId,
        title: '🎉 Order Confirmed!',
        message: `Thank you for confirming receipt! Your order for ${productSummary} has been successfully completed. We appreciate your business!`,
        type: 'system',
        orderId: id,
        status: 'completed',
        read: false,
        timestamp: new Date().toISOString(),
        priority: 'high'
      })
    }

    // Notify admins that user confirmed receipt and inventory updated
    const [adminUsers] = await pool.query(`
      SELECT id FROM users WHERE role = 'admin'
    `);
    
    for (const admin of adminUsers) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, related_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        admin.id,
        '✅ Order Confirmed & Inventory Updated',
        `Customer confirmed receipt of order containing ${productSummary}. Sales and inventory have been automatically updated.`,
        'admin_order',
        id
      ]);
    }

    // Send email receipt to customer
    try {
      // Get user details and complete order information for email
      const [userDetails] = await pool.query(`
        SELECT u.name, u.email, o.total_amount, o.payment_method, o.created_at, o.status
        FROM users u
        JOIN orders o ON u.id = o.user_id
        WHERE o.id = ?
      `, [id]);

      if (userDetails.length > 0) {
        const user = userDetails[0];
        
        // Get order items with prices for email
        const [orderItemsWithPrices] = await pool.query(`
          SELECT oi.quantity, oi.unit_price, oi.total_price, p.name as product_name
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ?
        `, [id]);

        const orderData = {
          orderId: id,
          items: orderItemsWithPrices,
          totalAmount: user.total_amount,
          paymentMethod: user.payment_method,
          createdAt: user.created_at,
          status: 'completed'
        };

        const emailResult = await sendOrderReceiptEmail(user.email, user.name, orderData);
        if (emailResult.success) {
          console.log(`Email receipt sent to ${user.email} for order #${id}`);
        } else {
          console.log(`Email receipt not sent for order #${id}: ${emailResult.message}`);
        }
      }
    } catch (emailError) {
      console.error('Error sending email receipt:', emailError);
      // Don't fail the entire operation if email fails
    }

    res.json({ 
      success: true,
      message: 'Order receipt confirmed successfully',
      status: 'completed'
    })

  } catch (err) {
    console.error('User confirm order receipt error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ✅ Confirm order receipt via notification
// 🧪 Test notification endpoint (for debugging)
export const testNotification = async (req, res) => {
  const { userId, orderId, status } = req.body;
  
  try {
    console.log(`🧪 Testing notification for user ${userId}, order ${orderId}, status: ${status}`);
    
    // Create notification
    const notificationResult = await createOrderStatusNotification(userId, orderId, status);
    console.log(`🧪 Notification created:`, notificationResult);
    
    // Emit real-time notification
    const io = req.app.get('io');
    if (io && notificationResult) {
      console.log(`🧪 Emitting test notification to user ${userId}`);
      emitUserNotification(io, userId, {
        id: notificationResult.id,
        title: notificationResult.title,
        message: notificationResult.message,
        type: notificationResult.type,
        orderId: orderId,
        status: status,
        read: false,
        timestamp: new Date().toISOString(),
        priority: status === 'ready_for_pickup' ? 'high' : 'medium',
        hasAction: notificationResult.hasAction,
        actionData: notificationResult.actionData
      });
    }
    
    res.json({
      success: true,
      message: 'Test notification sent',
      notification: notificationResult,
      socketEmitted: !!io
    });
  } catch (error) {
    console.error('🧪 Test notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
      details: error.message
    });
  }
};

// ✅ Confirm order receipt via notification
export const confirmOrderReceiptNotification = async (req, res) => {
  const { orderId } = req.params
  const user_id = req.user.id

  try {
    // Get order details and verify ownership
    const [orderData] = await pool.query(`
      SELECT o.id, o.user_id, o.status, o.total_amount, o.payment_method, o.created_at, u.name, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ? AND o.user_id = ?
    `, [orderId, user_id])

    if (orderData.length === 0) {
      return res.status(404).json({ error: 'Order not found or access denied' })
    }

    const order = orderData[0]

    if (order.status !== 'ready_for_pickup') {
      return res.status(400).json({ 
        error: 'Order must be ready for pickup to confirm receipt' 
      })
    }

    // Update order status to completed
    await pool.query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      ['completed', orderId]
    )

    // Get order items for email receipt
    const [orderItems] = await pool.query(`
      SELECT oi.product_name, oi.quantity, oi.unit_price, oi.total_price
      FROM order_items oi
      WHERE oi.order_id = ?
    `, [orderId])

    // Send receipt email
    try {
      const orderDataForEmail = {
        orderId: orderId,
        items: orderItems,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        createdAt: order.created_at,
        status: 'completed',
        confirmedAt: new Date()
      }

      await sendOrderReceiptEmail(order.email, order.name, orderDataForEmail)
      console.log(`✅ Receipt email sent to ${order.email} for order #${orderId}`)
    } catch (emailError) {
      console.error('Error sending receipt email:', emailError)
      // Don't fail the confirmation if email fails
    }

    // Create thank you notification for user
    const productSummary = orderItems.length === 1 
      ? `${orderItems[0].quantity}x ${orderItems[0].product_name}`
      : `${orderItems.length} items`

    const [notificationResult] = await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [
      user_id,
      '🎉 Order Confirmed!',
      `Thank you for confirming receipt! Your order for ${productSummary} has been completed. A receipt has been sent to your email.`,
      'system'
    ])

    // Emit real-time notification
    const io = req.app.get('io')
    if (io) {
      emitUserNotification(io, user_id, {
        id: notificationResult.insertId,
        title: '🎉 Order Confirmed!',
        message: `Thank you for confirming receipt! Your order for ${productSummary} has been completed. A receipt has been sent to your email.`,
        type: 'system',
        orderId: orderId,
        status: 'completed',
        read: false,
        timestamp: new Date().toISOString(),
        priority: 'high'
      })
    }

    // Mark the ready_for_pickup notification as read/handled
    await pool.query(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE user_id = ? AND related_id = ? AND type = 'system'
    `, [user_id, orderId])

    res.json({ 
      success: true,
      message: 'Order confirmed successfully! Receipt sent to your email.',
      orderId: orderId
    })

  } catch (err) {
    console.error('Confirm order receipt via notification error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ✅ Get Sales Analytics with Profit Analysis
export const getSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    // Build date filter
    let dateFilter = '';
    let params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE o.created_at BETWEEN ? AND ?';
      params = [startDate, endDate];
    }

    // Get sales data with profit analysis
    const [salesData] = await pool.query(`
      SELECT 
        DATE(o.created_at) as date,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        SUM(oi.quantity * oi.unit_cost) as total_cost,
        SUM(o.total_amount) - SUM(oi.quantity * oi.unit_cost) as total_profit,
        ROUND(((SUM(o.total_amount) - SUM(oi.quantity * oi.unit_cost)) / SUM(o.total_amount)) * 100, 2) as profit_margin_percent
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      ${dateFilter}
      AND o.status IN ('completed', 'delivered')
      GROUP BY DATE(o.created_at)
      ORDER BY date DESC
      LIMIT 30
    `, params);

    // Get top products by profit
    const [topProducts] = await pool.query(`
      SELECT 
        p.name as product_name,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.quantity * oi.unit_price) as total_revenue,
        SUM(oi.quantity * oi.unit_cost) as total_cost,
        SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * oi.unit_cost) as total_profit,
        ROUND(((SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * oi.unit_cost)) / SUM(oi.quantity * oi.unit_price)) * 100, 2) as profit_margin_percent
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      ${dateFilter}
      AND o.status IN ('completed', 'delivered')
      GROUP BY p.id, p.name
      ORDER BY total_profit DESC
      LIMIT 10
    `, params);

    // Get overall summary
    const [summary] = await pool.query(`
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        SUM(oi.quantity * oi.unit_cost) as total_cost,
        SUM(o.total_amount) - SUM(oi.quantity * oi.unit_cost) as total_profit,
        ROUND(((SUM(o.total_amount) - SUM(oi.quantity * oi.unit_cost)) / SUM(o.total_amount)) * 100, 2) as overall_profit_margin
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      ${dateFilter}
      AND o.status IN ('completed', 'delivered')
    `, params);

    res.json({
      salesData,
      topProducts,
      summary: summary[0] || {
        total_orders: 0,
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
        overall_profit_margin: 0
      }
    });

  } catch (error) {
    console.error('Sales analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch sales analytics' });
  }
}

// ✅ Confirm Order Receipt (Public endpoint for email button)
export const confirmOrderReceiptPublic = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Get order details
    const [orders] = await pool.query(
      'SELECT id, user_id, status FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Check if order is ready for pickup
    if (order.status !== 'ready_for_pickup') {
      return res.status(400).json({ 
        error: 'Order is not ready for pickup',
        currentStatus: order.status 
      });
    }

    // Update order status to completed
    await pool.query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      ['completed', orderId]
    );

    // Log status change
    await pool.query(
      `INSERT INTO order_status_logs (order_id, old_status, new_status, notes, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [orderId, 'ready_for_pickup', 'completed', 'Order confirmed received by customer']
    );

    console.log(`✅ Order ${orderId} confirmed received and marked as completed`);

    // Redirect to dashboard with success message
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const redirectUrl = `${clientUrl}/dashboard?orderCompleted=true&orderId=${orderId}`;
    
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Confirm order receipt error:', error);
    res.status(500).json({ error: 'Failed to confirm order receipt' });
  }
}

