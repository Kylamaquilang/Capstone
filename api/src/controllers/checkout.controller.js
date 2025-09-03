import { pool } from '../database/db.js'
import { createOrderStatusNotification } from '../utils/notification-helper.js'

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
      INSERT INTO orders (user_id, total_amount, payment_method, payment_status, status)
      VALUES (?, ?, ?, 'unpaid', 'pending')
    `, [user_id, total_amount, payment_method])

    const orderId = orderResult.insertId

    for (const item of cartItems) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, size_id, quantity, price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.size_id || null, item.quantity, item.size_price || item.price]
      )

      // Update stock based on whether it's a size-specific item or general product
      if (item.size_id) {
        await pool.query(
          `UPDATE product_sizes SET stock = stock - ? WHERE id = ?`,
          [item.quantity, item.size_id]
        )
      } else {
        await pool.query(
          `UPDATE products SET stock = stock - ? WHERE id = ?`,
          [item.quantity, item.product_id]
        )
      }
    }

    await pool.query(`DELETE FROM cart_items WHERE user_id = ?`, [user_id])

    // Create notification for order placement
    await createOrderStatusNotification(user_id, orderId, 'pending');

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
