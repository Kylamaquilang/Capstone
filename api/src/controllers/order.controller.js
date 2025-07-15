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
      SELECT o.id, o.user_id, u.name AS user_name,
             o.total_amount, o.payment_method, o.pay_at_counter,
             o.status, o.created_at
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
      SELECT oi.quantity, oi.size, oi.price, p.name, p.image
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

// 🔁 Admin updates order status
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['pending', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' })
  }

  try {
    const [result] = await pool.query(
      `UPDATE orders SET status = ? WHERE id = ?`,
      [status, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json({ message: `Order status updated to '${status}'` })
  } catch (err) {
    console.error('Update status error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
