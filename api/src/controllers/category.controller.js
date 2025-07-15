import { pool } from '../database/db.js'

// ✅ Create a new category
export const createCategory = async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Category name is required' })

  try {
    const [exists] = await pool.query(`SELECT * FROM categories WHERE name = ?`, [name])
    if (exists.length > 0) return res.status(409).json({ error: 'Category already exists' })

    await pool.query(`INSERT INTO categories (name) VALUES (?)`, [name])
    res.status(201).json({ message: 'Category created' })
  } catch (err) {
    console.error('Create category error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ✅ Get all categories
export const getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM categories ORDER BY name ASC`)
    res.json(rows)
  } catch (err) {
    console.error('Get categories error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ✅ Update category name
export const updateCategory = async (req, res) => {
  const { id } = req.params
  const { name } = req.body

  try {
    await pool.query(`UPDATE categories SET name = ? WHERE id = ?`, [name, id])
    res.json({ message: 'Category updated' })
  } catch (err) {
    console.error('Update category error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ✅ Delete category
export const deleteCategory = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(`DELETE FROM categories WHERE id = ?`, [id])
    res.json({ message: 'Category deleted' })
  } catch (err) {
    console.error('Delete category error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
