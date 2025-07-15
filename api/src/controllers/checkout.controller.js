import { pool } from '../database/db.js'

export const checkout = async (req, res) => {
  const user_id = req.user.id
  const { payment_method, pay_at_counter } = req.body

  if (!payment_method) {
    return res.status(400).json({ error: 'Payment method is required' })
  }

  try {
    const [cartItems] = await pool.query(`
      SELECT c.id AS cart_id, c.quantity, c.product_id, c.size,
             p.stock, p.price
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [user_id])

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' })
    }

    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        return res.status(400).json({
          error: `Insufficient stock for product ID ${item.product_id}`
        })
      }
    }

    const total_amount = cartItems.reduce((sum, item) => {
      return sum + item.price * item.quantity
    }, 0)

    const [orderResult] = await pool.query(`
      INSERT INTO orders (user_id, total_amount, payment_method, pay_at_counter)
      VALUES (?, ?, ?, ?)
    `, [user_id, total_amount, payment_method, pay_at_counter || 0])

    const orderId = orderResult.insertId

    for (const item of cartItems) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, size, price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.size || null, item.price]
      )

      await pool.query(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [item.quantity, item.product_id]
      )
    }

    await pool.query(`DELETE FROM cart_items WHERE user_id = ?`, [user_id])

    res.status(200).json({
      message: 'Checkout successful',
      orderId,
      total_amount
    })
  } catch (err) {
    console.error('Checkout error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
