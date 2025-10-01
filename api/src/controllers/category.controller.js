import { pool } from '../database/db.js'
import { emitAdminDataRefresh, emitDataRefresh } from '../utils/socket-helper.js'

// ✅ Create a new category
export const createCategory = async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Category name is required' })

  try {
    // Check if category with same name exists
    const [exists] = await pool.query(`SELECT * FROM categories WHERE name = ?`, [name])
    if (exists.length > 0) return res.status(409).json({ error: 'Category already exists' })

    const [result] = await pool.query(`INSERT INTO categories (name) VALUES (?)`, [name])
    
    // Emit refresh signal for new category
    const io = req.app.get('io');
    if (io) {
      emitAdminDataRefresh(io, 'categories', { action: 'created', categoryId: result.insertId });
      emitDataRefresh(io, 'categories', { action: 'created', categoryId: result.insertId });
    }
    
    res.status(201).json({ message: 'Category created' })
  } catch (err) {
    console.error('Create category error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ✅ Get all categories
export const getCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM categories
      WHERE is_active = 1
      ORDER BY name ASC
    `)
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
    // Check if category with same name exists (excluding current category)
    const [exists] = await pool.query(`SELECT * FROM categories WHERE name = ? AND id != ?`, [name, id])
    if (exists.length > 0) return res.status(409).json({ error: 'Category already exists' })

    await pool.query(`UPDATE categories SET name = ? WHERE id = ?`, [name, id])
    
    // Emit refresh signal for updated category
    const io = req.app.get('io');
    if (io) {
      emitAdminDataRefresh(io, 'categories', { action: 'updated', categoryId: id });
      emitDataRefresh(io, 'categories', { action: 'updated', categoryId: id });
    }
    
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
    // Check if category has products
    const [products] = await pool.query(`SELECT COUNT(*) as count FROM products WHERE category_id = ?`, [id])
    if (products[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with products. Move or delete products first.' })
    }

    // Soft delete by setting is_active to false
    await pool.query(`UPDATE categories SET is_active = 0 WHERE id = ?`, [id])
    
    // Emit refresh signal for deleted category
    const io = req.app.get('io');
    if (io) {
      emitAdminDataRefresh(io, 'categories', { action: 'deleted', categoryId: id });
      emitDataRefresh(io, 'categories', { action: 'deleted', categoryId: id });
    }
    
    res.json({ message: 'Category deleted' })
  } catch (err) {
    console.error('Delete category error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

