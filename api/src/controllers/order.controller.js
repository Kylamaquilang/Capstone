import { pool } from '../database/db.js'

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
        o.total_amount, 
        o.payment_method, 
        o.pay_at_counter,
        o.status, 
        o.created_at,
        o.updated_at,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `)

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
      SELECT oi.quantity, oi.size, oi.price, p.name, p.image, p.id as product_id
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
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
      SELECT oi.quantity, oi.size, oi.price, p.name, p.image, p.id as product_id
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
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
      'SELECT status, user_id FROM orders WHERE id = ?',
      [id]
    )

    if (currentOrder.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const oldStatus = currentOrder[0].status
    const userId = currentOrder[0].user_id

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

    // If order is cancelled or refunded, restore stock
    if ((status === 'cancelled' || status === 'refunded') && oldStatus !== 'cancelled' && oldStatus !== 'refunded') {
      const [orderItems] = await pool.query(
        'SELECT product_id, quantity, size FROM order_items WHERE order_id = ?',
        [id]
      )

      for (const item of orderItems) {
        await pool.query(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.product_id]
        )
      }
    }

    res.json({ 
      message: `Order status updated to '${status}'`,
      previousStatus: oldStatus,
      newStatus: status
    })
  } catch (err) {
    console.error('Update status error:', err)
    res.status(500).json({ error: 'Internal server error' })
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
    const { start_date, end_date, group_by = 'day' } = req.query
    
    let groupClause = 'DATE(created_at)'
    if (group_by === 'month') {
      groupClause = 'DATE_FORMAT(created_at, "%Y-%m")'
    } else if (group_by === 'year') {
      groupClause = 'YEAR(created_at)'
    }

    const [salesData] = await pool.query(`
      SELECT 
        ${groupClause} as period,
        COUNT(*) as orders,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM orders
      WHERE status != 'cancelled'
      ${start_date ? 'AND created_at >= ?' : ''}
      ${end_date ? 'AND created_at <= ?' : ''}
      GROUP BY ${groupClause}
      ORDER BY period DESC
    `, [start_date, end_date].filter(Boolean))

    const [topProducts] = await pool.query(`
      SELECT 
        p.name as product_name,
        p.image as product_image,
        SUM(oi.quantity) as total_sold,
        SUM(oi.quantity * oi.price) as total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      ${start_date ? 'AND o.created_at >= ?' : ''}
      ${end_date ? 'AND o.created_at <= ?' : ''}
      GROUP BY p.id, p.name, p.image
      ORDER BY total_sold DESC
      LIMIT 10
    `, [start_date, end_date].filter(Boolean))

    res.json({
      salesData,
      topProducts,
      period: { start_date, end_date, group_by }
    })
  } catch (err) {
    console.error('Get sales performance error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

