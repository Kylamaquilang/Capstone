import { pool } from '../database/db.js'

// Low stock threshold
const LOW_STOCK_THRESHOLD = 5

// ✅ Create Product
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, sizes, category, image } = req.body

    if (!name || !price || stock == null) {
      return res.status(400).json({ error: 'Name, price, and stock are required' })
    }

    const [result] = await pool.query(
      `INSERT INTO products (name, description, price, stock, sizes, category, image)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, stock, sizes, category, image]
    )

    res.status(201).json({ message: 'Product created successfully', productId: result.insertId })
  } catch (error) {
    console.error('Create Product Error:', error.message)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

// ✅ Get All Products
export const getAllProducts = async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
    `)

    res.json(products)
  } catch (err) {
    console.error('Get Products Error:', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

// ✅ Get Product by ID
export const getProductById = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM products WHERE id = ?`, [req.params.id])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }

    res.json(rows[0])
  } catch (error) {
    console.error('Get Product Error:', error.message)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

// ✅ Update product (admin only)
export const updateProduct = async (req, res) => {
  const { id } = req.params
  const { name, description, price, stock, sizes, category_id, image } = req.body

  try {
    const [result] = await pool.query(
      `UPDATE products SET name = ?, description = ?, price = ?, stock = ?, sizes = ?, category_id = ?, image = ?
       WHERE id = ?`,
      [name, description, price, stock, sizes, category_id, image, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }

    res.json({ message: 'Product updated successfully' })
  } catch (err) {
    console.error('Update product error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ✅ Delete Product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await pool.query(`DELETE FROM products WHERE id = ?`, [id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }

    res.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Delete Product Error:', error.message)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

// ✅ Get Low Stock Products (for Admin Alerts)
export const getLowStockProducts = async (req, res) => {
  try {
    const [products] = await pool.query(`SELECT * FROM products WHERE stock <= ?`, [LOW_STOCK_THRESHOLD])
    res.json(products)
  } catch (error) {
    console.error('Low Stock Check Error:', error.message)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
