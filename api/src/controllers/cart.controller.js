import { pool } from '../database/db.js';
import { validateId, validateQuantity } from '../utils/validation.js';
import { emitCartUpdate } from '../utils/socket-helper.js';

// ✅ Add to Cart
export const addToCart = async (req, res) => {
  const { product_id, quantity, size_id } = req.body;
  
  if (!req.user || !req.user.id) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Please log in to add items to cart'
    });
  }
  
  const user_id = req.user.id;

  if (!product_id || quantity == null) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'Product ID and quantity are required'
    });
  }

  if (!validateQuantity(quantity)) {
    return res.status(400).json({ 
      error: 'Invalid quantity',
      message: 'Quantity must be at least 1'
    });
  }

  if (!validateId(product_id)) {
    return res.status(400).json({ 
      error: 'Invalid product ID',
      message: 'Please select a valid product'
    });
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
      return res.status(404).json({ 
        error: 'Product not found',
        message: 'The selected product or size is not available'
      });
    }

    const productInfo = stockRows[0];
    const availableStock = productInfo.stock;

    if (availableStock < quantity) {
      return res.status(400).json({
        error: 'Insufficient stock',
        message: `Only ${availableStock} left in stock`
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
        error: 'Insufficient stock',
        message: `Only ${availableStock - currentQty} left in stock`
      });
    }

    if (existing.length > 0) {
      await pool.query(
        `UPDATE cart_items SET quantity = ? WHERE id = ?`,
        [newQty, existing[0].id]
      );
      
      // Emit real-time cart update
      const io = req.app.get('io')
      if (io) {
        emitCartUpdate(io, user_id, {
          action: 'updated',
          productId: product_id,
          quantity: newQty,
          sizeId: size_id
        })
      }
      
      return res.json({ 
        success: true,
        message: 'Cart item quantity updated',
        action: 'updated'
      });
    }

    await pool.query(
      `INSERT INTO cart_items (user_id, product_id, size_id, quantity) VALUES (?, ?, ?, ?)`,
      [user_id, product_id, size_id || null, quantity]
    );

    // Emit real-time cart update
    const io = req.app.get('io')
    if (io) {
      emitCartUpdate(io, user_id, {
        action: 'added',
        productId: product_id,
        quantity,
        sizeId: size_id
      })
    }

    res.status(201).json({ 
      success: true,
      message: 'Product added to cart successfully',
      action: 'added'
    });
  } catch (err) {
    console.error('Add to cart error:', err);
    
    // Handle specific database errors
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ 
        error: 'Database configuration error',
        message: 'Cart table not found. Please contact administrator.'
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
      message: 'Failed to add item to cart. Please try again.'
    });
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
        c.product_id,
        c.size_id,
        p.name as product_name, 
        p.image as product_image,
        p.price as product_price,
        ps.size,
        ps.price as size_price,
        COALESCE(ps.price, p.price) as final_price
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      LEFT JOIN product_sizes ps ON c.size_id = ps.id
      WHERE c.user_id = ?
    `, [user_id]);

    // Transform the data to match frontend expectations
    const transformedItems = items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      product_id: item.product_id,
      size_id: item.size_id,
      product_name: item.product_name,
      product_image: item.product_image,
      size: item.size,
      price: item.final_price
    }));

    res.json({ 
      success: true,
      items: transformedItems,
      total_items: transformedItems.length
    });
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to load cart. Please try again.'
    });
  }
};

// ✅ Update Cart Item
export const updateCart = async (req, res) => {
  const { id } = req.params;
  const { quantity, size_id } = req.body;

  if (quantity == null || quantity < 1) {
    return res.status(400).json({ 
      error: 'Invalid quantity',
      message: 'Quantity must be at least 1'
    });
  }

  try {
    const [cartRows] = await pool.query(`SELECT * FROM cart_items WHERE id = ?`, [id]);
    if (cartRows.length === 0) {
      return res.status(404).json({ 
        error: 'Cart item not found',
        message: 'The cart item you are trying to update does not exist'
      });
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
      return res.status(404).json({ 
        error: 'Product not found',
        message: 'The selected product or size is not available'
      });
    }

    const availableStock = stockRows[0].stock;

    if (quantity > availableStock) {
      return res.status(400).json({ 
        error: 'Insufficient stock',
        message: `Only ${availableStock} in stock`
      });
    }

    await pool.query(
      `UPDATE cart_items SET quantity = ?, size_id = ? WHERE id = ?`,
      [quantity, size_id || null, id]
    );

    res.json({ 
      success: true,
      message: 'Cart item updated successfully'
    });
  } catch (err) {
    console.error('Update cart error:', err);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to update cart item. Please try again.'
    });
  }
};

// ✅ Delete Cart Item
export const deleteCartItem = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    // Get cart item details before deletion for Socket.io emission
    const [cartItem] = await pool.query(`
      SELECT product_id, size_id, quantity 
      FROM cart_items 
      WHERE id = ? AND user_id = ?
    `, [id, user_id]);

    if (cartItem.length === 0) {
      return res.status(404).json({ 
        error: 'Cart item not found',
        message: 'The cart item you are trying to remove does not exist'
      });
    }

    const [result] = await pool.query(`DELETE FROM cart_items WHERE id = ?`, [id]);

    // Emit real-time cart update
    const io = req.app.get('io')
    if (io) {
      emitCartUpdate(io, user_id, {
        action: 'removed',
        productId: cartItem[0].product_id,
        quantity: cartItem[0].quantity,
        sizeId: cartItem[0].size_id
      })
    }

    res.json({ 
      success: true,
      message: 'Cart item removed successfully'
    });
  } catch (err) {
    console.error('Delete cart error:', err);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to remove cart item. Please try again.'
    });
  }
};

// ✅ Clear Cart
export const clearCart = async (req, res) => {
  const user_id = req.user.id;

  try {
    await pool.query(`DELETE FROM cart_items WHERE user_id = ?`, [user_id]);
    res.json({ 
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (err) {
    console.error('Clear cart error:', err);
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to clear cart. Please try again.'
    });
  }
};
