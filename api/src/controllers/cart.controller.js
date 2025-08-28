import { pool } from '../database/db.js';
import { validateQuantity, validateId } from '../utils/validation.js';

// ✅ Add to Cart
export const addToCart = async (req, res) => {
  const { product_id, quantity, size_id } = req.body;
  
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const user_id = req.user.id;

  if (!product_id || quantity == null) {
    return res.status(400).json({ error: 'Product ID and quantity are required' });
  }

  if (!validateQuantity(quantity)) {
    return res.status(400).json({ error: 'Quantity must be at least 1' });
  }

  if (!validateId(product_id)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  try {
    // Get product and size information
    let stockQuery, stockParams;
    
    if (size_id) {
      // Check specific size stock
      stockQuery = `
        SELECT ps.stock, ps.price, p.name, p.image 
        FROM product_sizes ps 
        JOIN products p ON ps.product_id = p.id 
        WHERE ps.id = ? AND ps.product_id = ?
      `;
      stockParams = [size_id, product_id];
    } else {
      // Check general product stock
      stockQuery = 'SELECT stock, price, name, image FROM products WHERE id = ?';
      stockParams = [product_id];
    }

    const [stockRows] = await pool.query(stockQuery, stockParams);
    
    if (stockRows.length === 0) {
      return res.status(404).json({ error: 'Product or size not found' });
    }

    const productInfo = stockRows[0];
    const availableStock = productInfo.stock;

    if (availableStock < quantity) {
      return res.status(400).json({
        error: `Only ${availableStock} left in stock`
      });
    }

    // Check if same product & size is already in cart
    const [existing] = await pool.query(
      `SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND size_id = ?`,
      [user_id, product_id, size_id || null]
    );

    const currentQty = existing.length > 0 ? existing[0].quantity : 0;
    const newQty = currentQty + quantity;

    if (newQty > availableStock) {
      return res.status(400).json({
        error: `Only ${availableStock - currentQty} left in stock`
      });
    }

    if (existing.length > 0) {
      await pool.query(
        `UPDATE cart_items SET quantity = ? WHERE id = ?`,
        [newQty, existing[0].id]
      );
      return res.json({ message: 'Cart item quantity updated' });
    }

    await pool.query(
      `INSERT INTO cart_items (user_id, product_id, size_id, quantity) VALUES (?, ?, ?, ?)`,
      [user_id, product_id, size_id || null, quantity]
    );

    res.status(201).json({ message: 'Product added to cart' });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ View Cart
export const getCart = async (req, res) => {
  const user_id = req.user.id;

  try {
    const [items] = await pool.query(`
      SELECT 
        c.id, 
        c.quantity, 
        c.price,
        p.name, 
        p.image,
        ps.size,
        ps.id as size_id
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      LEFT JOIN product_sizes ps ON c.size_id = ps.id
      WHERE c.user_id = ?
    `, [user_id]);

    res.json(items);
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Update Cart Item
export const updateCart = async (req, res) => {
  const { id } = req.params;
  const { quantity, size_id } = req.body;

  if (quantity == null || quantity < 1) {
    return res.status(400).json({ error: 'Quantity must be at least 1' });
  }

  try {
    const [cartRows] = await pool.query(`SELECT * FROM cart_items WHERE id = ?`, [id]);
    if (cartRows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const cartItem = cartRows[0];
    const product_id = cartItem.product_id;

    // Check stock availability
    let stockQuery, stockParams;
    
    if (size_id) {
      stockQuery = 'SELECT stock FROM product_sizes WHERE id = ? AND product_id = ?';
      stockParams = [size_id, product_id];
    } else {
      stockQuery = 'SELECT stock FROM products WHERE id = ?';
      stockParams = [product_id];
    }

    const [stockRows] = await pool.query(stockQuery, stockParams);
    if (stockRows.length === 0) {
      return res.status(404).json({ error: 'Product or size not found' });
    }

    const availableStock = stockRows[0].stock;

    if (quantity > availableStock) {
      return res.status(400).json({ error: `Only ${availableStock} in stock` });
    }

    await pool.query(
      `UPDATE cart_items SET quantity = ?, size_id = ? WHERE id = ?`,
      [quantity, size_id || null, id]
    );

    res.json({ message: 'Cart item updated' });
  } catch (err) {
    console.error('Update cart error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Delete Cart Item
export const deleteCartItem = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(`DELETE FROM cart_items WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    res.json({ message: 'Cart item removed' });
  } catch (err) {
    console.error('Delete cart error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Clear Cart
export const clearCart = async (req, res) => {
  const user_id = req.user.id;

  try {
    await pool.query(`DELETE FROM cart_items WHERE user_id = ?`, [user_id]);
    res.json({ message: 'Cart cleared successfully' });
  } catch (err) {
    console.error('Clear cart error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
