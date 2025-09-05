import { pool } from '../database/db.js'
import { createOrderStatusNotification } from '../utils/notification-helper.js'

// Helper function to create admin notifications for new orders
const createAdminOrderNotification = async (orderId, totalAmount, paymentMethod) => {
  try {
    // Get all admin users
    const [adminUsers] = await pool.query(`
      SELECT id, name FROM users WHERE role = 'admin'
    `);
    
    // Get customer info for the order
    const [orderInfo] = await pool.query(`
      SELECT u.name as customer_name, u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [orderId]);
    
    const customerName = orderInfo[0]?.customer_name || 'Customer';
    
    // Create notification for each admin user
    for (const admin of adminUsers) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, related_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        admin.id,
        `🆕 New Order #${orderId}`,
        `New order received from ${customerName} for ${totalAmount} via ${paymentMethod.toUpperCase()}`,
        'admin_order',
        orderId
      ]);
    }
    
    console.log(`✅ Admin notifications created for order #${orderId}`);
  } catch (error) {
    console.error('❌ Error creating admin notifications:', error);
  }
}

export const checkout = async (req, res) => {
  const user_id = req.user.id
  const { payment_method, pay_at_counter } = req.body

  if (!payment_method) {
    return res.status(400).json({ 
      error: 'Payment method required',
      message: 'Please select a payment method'
    })
  }

  try {
    const [cartItems] = await pool.query(`
      SELECT c.id AS cart_id, c.quantity, c.product_id, c.size_id,
             p.stock, p.price, ps.stock as size_stock, ps.price as size_price
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      LEFT JOIN product_sizes ps ON c.size_id = ps.id
      WHERE c.user_id = ?
    `, [user_id])

    if (cartItems.length === 0) {
      return res.status(400).json({ 
        error: 'Empty cart',
        message: 'Your cart is empty. Please add items before checkout.'
      })
    }

    for (const item of cartItems) {
      // Check stock based on whether it's a size-specific item or general product
      const availableStock = item.size_id ? item.size_stock : item.stock
      if (item.quantity > availableStock) {
        return res.status(400).json({
          error: 'Insufficient stock',
          message: `Insufficient stock for product ID ${item.product_id}`
        })
      }
    }

    const total_amount = cartItems.reduce((sum, item) => {
      const price = item.size_id ? item.size_price : item.price
      return sum + price * item.quantity
    }, 0)

    const [orderResult] = await pool.query(`
      INSERT INTO orders (user_id, total_amount, payment_method, payment_status, status, pay_at_counter)
      VALUES (?, ?, ?, 'unpaid', 'pending', ?)
    `, [user_id, total_amount, payment_method, pay_at_counter || false])

    const orderId = orderResult.insertId

    for (const item of cartItems) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, size_id, quantity, price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.size_id || null, item.quantity, item.size_price || item.price]
      )

      // Update stock and log inventory movement
      if (item.size_id) {
        await pool.query(
          `UPDATE product_sizes SET stock = stock - ? WHERE id = ?`,
          [item.quantity, item.size_id]
        )
        
        // Log inventory movement for size-specific items
        await pool.query(`
          INSERT INTO inventory_movements (product_id, size_id, movement_type, quantity_change, reason, order_id, created_at)
          VALUES (?, ?, 'sale', ?, 'Order placed', ?, NOW())
        `, [item.product_id, item.size_id, -item.quantity, orderId])
      } else {
        await pool.query(
          `UPDATE products SET stock = stock - ? WHERE id = ?`,
          [item.quantity, item.product_id]
        )
        
        // Log inventory movement for general products
        await pool.query(`
          INSERT INTO inventory_movements (product_id, movement_type, quantity_change, reason, order_id, created_at)
          VALUES (?, 'sale', ?, 'Order placed', ?, NOW())
        `, [item.product_id, -item.quantity, orderId])
      }
    }

    await pool.query(`DELETE FROM cart_items WHERE user_id = ?`, [user_id])

    // Create notification for order placement
    await createOrderStatusNotification(user_id, orderId, 'pending');

    // Create admin notifications for new order
    await createAdminOrderNotification(orderId, total_amount, payment_method);

    res.status(200).json({
      success: true,
      message: 'Checkout successful',
      orderId,
      total_amount
    })
  } catch (err) {
    console.error('Checkout error:', err)
    
    // Handle specific database errors
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ 
        error: 'Database configuration error',
        message: 'Required tables not found. Please contact administrator.'
      });
    }
    
    if (err.code === 'ER_BAD_DB_ERROR') {
      return res.status(500).json({ 
        error: 'Database connection error',
        message: 'Unable to connect to database. Please try again.'
      });
    }
    
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to process checkout. Please try again.'
    })
  }
}
