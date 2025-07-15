import { pool } from '../database/db.js'

// ✅ Add to Cart
export const addToCart = async (req, res) => {
  const { product_id, quantity, size } = req.body
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const user_id = req.user.id

  if (!product_id || quantity == null) {
    return res.status(400).json({ error: 'Product ID and quantity are required' })
  }

  try {
    // Get product stock
    const [productRows] = await pool.query(`SELECT stock FROM products WHERE id = ?`, [product_id])
    if (productRows.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const availableStock = productRows[0].stock

    // Check if same product & size is already in cart
    const [existing] = await pool.query(
      `SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ?`,
      [user_id, product_id, size || null]
    )

    const currentQty = existing.length > 0 ? existing[0].quantity : 0
    const newQty = currentQty + quantity

    if (newQty > availableStock) {
      return res.status(400).json({
        error: `Only ${availableStock - currentQty} left in stock`
      })
    }

    if (existing.length > 0) {
      await pool.query(
        `UPDATE cart_items SET quantity = ? WHERE id = ?`,
        [newQty, existing[0].id]
      )
      return res.json({ message: 'Cart item quantity updated' })
    }

    await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity, size) VALUES (?, ?, ?, ?)`,
      [user_id, product_id, quantity, size || null]
    )

    res.status(201).json({ message: 'Product added to cart' })
  } catch (err) {
    console.error('Add to cart error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ✅ View Cart
export const getCart = async (req, res) => {
  const user_id = req.user.id

  try {
    const [items] = await pool.query(`
      SELECT c.id, c.quantity, c.size, p.name, p.price, p.image
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [user_id])

    res.json(items)
  } catch (err) {
    console.error('Get cart error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ✅ Update Cart Item
export const updateCart = async (req, res) => {
  const { id } = req.params
  const { quantity, size } = req.body

  if (quantity == null || quantity < 1) {
    return res.status(400).json({ error: 'Quantity must be at least 1' })
  }

  try {
    const [cartRows] = await pool.query(`SELECT * FROM cart_items WHERE id = ?`, [id])
    if (cartRows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' })
    }

    const cartItem = cartRows[0]
    const product_id = cartItem.product_id

    const [productRows] = await pool.query(`SELECT stock FROM products WHERE id = ?`, [product_id])
    if (productRows.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const availableStock = productRows[0].stock

    if (quantity > availableStock) {
      return res.status(400).json({ error: `Only ${availableStock} in stock` })
    }

    await pool.query(
      `UPDATE cart_items SET quantity = ?, size = ? WHERE id = ?`,
      [quantity, size || null, id]
    )

    res.json({ message: 'Cart item updated' })
  } catch (err) {
    console.error('Update cart error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ✅ Delete Cart Item
export const deleteCartItem = async (req, res) => {
  const { id } = req.params

  try {
    const [result] = await pool.query(`DELETE FROM cart_items WHERE id = ?`, [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cart item not found' })
    }

    res.json({ message: 'Cart item removed' })
  } catch (err) {
    console.error('Delete cart error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
