import { pool } from '../database/db.js';

// Get current stock for all products
const getCurrentStock = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.category_id,
        c.name as category_name,
        p.stock as current_stock,
        p.base_stock as base_stock,
        p.price,
        p.original_price,
        p.reorder_point,
        p.max_stock,
        CASE 
          WHEN p.stock <= p.reorder_point THEN 'LOW'
          WHEN p.stock <= (p.reorder_point * 2) THEN 'MEDIUM'
          ELSE 'GOOD'
        END as stock_status,
        p.updated_at as last_updated
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
      ORDER BY p.name
    `;
    
    const [products] = await pool.query(query);
    
    // Get sizes for each product
    const productsWithSizes = await Promise.all(
      products.map(async (product) => {
        try {
          const [sizes] = await pool.query(
            `SELECT id, size, stock, base_stock, price, is_active 
             FROM product_sizes 
             WHERE product_id = ? AND is_active = 1 
             ORDER BY 
               CASE size 
                 WHEN 'NONE' THEN 0
                 WHEN 'XS' THEN 1 
                 WHEN 'S' THEN 2 
                 WHEN 'M' THEN 3 
                 WHEN 'L' THEN 4 
                 WHEN 'XL' THEN 5 
                 WHEN 'XXL' THEN 6 
                 ELSE 7 
               END`,
            [product.id]
          );
          
          return {
            ...product,
            sizes: sizes || []
          };
        } catch (error) {
          console.error(`Error fetching sizes for product ${product.id}:`, error);
          return {
            ...product,
            sizes: []
          };
        }
      })
    );
    
    res.json({ success: true, data: productsWithSizes });
  } catch (error) {
    console.error('Error fetching current stock:', error);
    res.status(500).json({ error: 'Failed to fetch current stock' });
  }
};

// Get current stock for a specific product
const getProductStock = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const query = `
      SELECT 
        p.id,
        p.name,
        p.category_id,
        c.name as category_name,
        COALESCE(sb.qty, p.stock, 0) as current_stock,
        p.reorder_point,
        p.max_stock,
        CASE 
          WHEN COALESCE(sb.qty, p.stock, 0) <= p.reorder_point THEN 'LOW'
          WHEN COALESCE(sb.qty, p.stock, 0) <= (p.reorder_point * 2) THEN 'MEDIUM'
          ELSE 'GOOD'
        END as stock_status,
        sb.updated_at as last_updated
      FROM products p
      LEFT JOIN stock_balance sb ON p.id = sb.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.is_active = TRUE
    `;
    
    const [rows] = await pool.query(query, [productId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching product stock:', error);
    res.status(500).json({ error: 'Failed to fetch product stock' });
  }
};

// Add stock in (using stored procedure)
const addStockIn = async (req, res) => {
  try {
    const { productId, quantity, referenceNo, batchNo, expiryDate, source, note, size } = req.body;
    const userId = req.user?.id || null;
    
    console.log('📦 Stock In Request:', { productId, quantity, size, source, note, userId });
    
    // Validate required fields
    if (!productId || !quantity || !source) {
      return res.status(400).json({ error: 'Product ID, quantity, and source are required' });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    
    // Start transaction for handling both product and size stock
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Verify user exists if userId is provided
      if (userId) {
        const [userCheck] = await connection.query(
          'SELECT id FROM users WHERE id = ?',
          [userId]
        );
        
        if (userCheck.length === 0) {
          console.log(`⚠️ User ID ${userId} not found, setting created_by to NULL`);
        }
      }
      // If size is provided, update product_sizes table
      if (size && size.trim() !== '') {
        console.log(`📦 Updating size-specific stock for size: ${size}`);
        
        // Check if size exists for this product
        const [sizeExists] = await connection.query(
          'SELECT id, stock FROM product_sizes WHERE product_id = ? AND size = ? AND is_active = 1',
          [productId, size.trim()]
        );
        
        if (sizeExists.length === 0) {
          throw new Error(`Size "${size}" not found for this product`);
        }
        
        // Update size-specific stock
        await connection.query(
          'UPDATE product_sizes SET stock = stock + ? WHERE product_id = ? AND size = ?',
          [quantity, productId, size.trim()]
        );
        
        console.log(`✅ Updated stock for size ${size} by +${quantity}`);
      }
      
      // Call stored procedure for main product stock (this handles products table and transactions)
      // Note: userId can be NULL if user is not found or not authenticated
      await connection.query(
        'CALL sp_stock_in(?, ?, ?, ?, ?, ?, ?, ?)',
        [productId, quantity, referenceNo || null, batchNo || null, expiryDate || null, source, note || null, userId]
      );
      
      await connection.commit();
      connection.release();
      
      console.log(`✅ Successfully added ${quantity} units to stock for product ${productId}${size ? ` (size: ${size})` : ''}`);
      
      // Emit real-time inventory update
      const io = req.app.get('io');
      if (io) {
        io.to('admin-room').emit('inventory-updated', {
          productId,
          quantityChange: quantity,
          size: size || null,
          movementType: 'stock_in',
          reason: 'Stock added',
          timestamp: new Date().toISOString()
        });
        console.log(`📡 Real-time inventory update sent for product ${productId}`);
      }
      
      res.json({ 
        success: true, 
        message: `Successfully added ${quantity} units to stock${size ? ` for size ${size}` : ''}`,
        data: { productId, quantity, size, referenceNo, batchNo, expiryDate, source }
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('❌ Error adding stock in:', error);
    res.status(500).json({ 
      error: 'Failed to add stock',
      message: error.message || 'An error occurred while adding stock'
    });
  }
};

// Stock out (using stored procedure)
const stockOut = async (req, res) => {
  try {
    const { productId, quantity, referenceNo, source, note, size } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!productId || !quantity || !source) {
      return res.status(400).json({ error: 'Product ID, quantity, and source are required' });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // If size is provided, update product_sizes table
      if (size && size.trim() !== '') {
        const [sizeRows] = await connection.query(
          'SELECT id, stock FROM product_sizes WHERE product_id = ? AND size = ?',
          [productId, size]
        );
        
        if (sizeRows.length === 0) {
          await connection.rollback();
          connection.release();
          return res.status(404).json({ error: `Size ${size} not found for this product` });
        }
        
        const currentSizeStock = sizeRows[0].stock;
        if (currentSizeStock < quantity) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ error: `Insufficient stock for size ${size}. Available: ${currentSizeStock}` });
        }
        
        // Deduct from product_sizes
        await connection.query(
          'UPDATE product_sizes SET stock = stock - ? WHERE product_id = ? AND size = ?',
          [quantity, productId, size]
        );
      }
      
      // Call stored procedure for main stock
      await connection.query(
        'CALL sp_stock_out(?, ?, ?, ?, ?, ?)',
        [productId, quantity, referenceNo || null, source, note || null, userId]
      );
      
      await connection.commit();
      connection.release();
      
      // Emit socket event for real-time updates
      const io = req.app.get('io');
      if (io) {
        io.to('admin-room').emit('inventory-updated', {
          productId,
          quantity,
          type: 'stock_out',
          size: size || null,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({ 
        success: true, 
        message: `Successfully deducted ${quantity} units from stock${size ? ` for size ${size}` : ''}`,
        data: { productId, quantity, size, referenceNo, source }
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error processing stock out:', error);
    if (error.message.includes('Insufficient stock')) {
      res.status(400).json({ error: 'Insufficient stock available' });
    } else {
      res.status(500).json({ error: 'Failed to process stock out' });
    }
  }
};

// Stock adjustment (using stored procedure)
const adjustStock = async (req, res) => {
  try {
    const { productId, physicalCount, reason, note } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!productId || physicalCount === undefined || !reason) {
      return res.status(400).json({ error: 'Product ID, physical count, and reason are required' });
    }
    
    if (physicalCount < 0) {
      return res.status(400).json({ error: 'Physical count cannot be negative' });
    }
    
    // Call stored procedure
    await pool.query(
      'CALL sp_stock_adjustment(?, ?, ?, ?, ?)',
      [productId, physicalCount, reason, note, userId]
    );
    
    res.json({ 
      success: true, 
      message: 'Stock adjustment completed successfully',
      data: { productId, physicalCount, reason }
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
};

// Get stock transaction history
const getStockHistory = async (req, res) => {
  try {
    const { productId, page = 1, limit = 50, transactionType, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    // Build WHERE clauses and parameters for stock_transactions
    let stWhereClause = 'WHERE 1=1';
    let smWhereClause = 'WHERE 1=1';
    const params = [];
    const countParams = [];
    
    if (productId) {
      stWhereClause += ' AND st.product_id = ?';
      smWhereClause += ' AND sm.product_id = ?';
      params.push(productId);
      countParams.push(productId);
    }
    
    if (startDate) {
      stWhereClause += ' AND st.created_at >= ?';
      smWhereClause += ' AND sm.created_at >= ?';
      params.push(startDate);
      countParams.push(startDate);
    }
    
    if (endDate) {
      stWhereClause += ' AND st.created_at <= ?';
      smWhereClause += ' AND sm.created_at <= ?';
      params.push(endDate);
      countParams.push(endDate);
    }
    
    // Build transaction type filter for stock_transactions
    let stTypeFilter = '';
    if (transactionType) {
      if (transactionType === 'IN') {
        stTypeFilter = " AND st.transaction_type = 'IN'";
      } else if (transactionType === 'OUT') {
        stTypeFilter = " AND st.transaction_type = 'OUT'";
      } else {
        stTypeFilter = ' AND st.transaction_type = ?';
        params.push(transactionType);
        countParams.push(transactionType);
      }
    }
    
    // Build movement type filter for stock_movements
    let smTypeFilter = '';
    if (transactionType) {
      if (transactionType === 'IN') {
        smTypeFilter = " AND sm.movement_type = 'stock_in'";
      } else if (transactionType === 'OUT') {
        smTypeFilter = " AND sm.movement_type = 'stock_out'";
      } else {
        // For other types, skip stock_movements or handle accordingly
        smTypeFilter = " AND 1=0"; // Exclude stock_movements for non-IN/OUT types
      }
    }
    
    // Combined query from both stock_transactions and stock_movements
    let query = `
      SELECT 
        id,
        product_id,
        product_name,
        transaction_type,
        quantity,
        reference_no,
        batch_no,
        expiry_date,
        source,
        note,
        created_by_name,
        created_by_role,
        created_at
      FROM (
        SELECT 
          st.id,
          st.product_id,
          p.name as product_name,
          st.transaction_type,
          st.quantity,
          st.reference_no,
          st.batch_no,
          st.expiry_date,
          st.source,
          st.note,
          CASE 
            WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL 
              THEN CONCAT(u.first_name, ' ', u.last_name)
            WHEN u.email IS NOT NULL 
              THEN u.email
            ELSE 'System'
          END as created_by_name,
          u.role as created_by_role,
          st.created_at
        FROM stock_transactions st
        JOIN products p ON st.product_id = p.id
        LEFT JOIN users u ON st.created_by = u.id
        ${stWhereClause}
        ${stTypeFilter}
        
        UNION ALL
        
        SELECT 
          sm.id + 1000000 as id,
          sm.product_id,
          p.name as product_name,
          CASE 
            WHEN sm.movement_type = 'stock_in' THEN 'IN'
            WHEN sm.movement_type = 'stock_out' THEN 'OUT'
            WHEN sm.movement_type = 'stock_adjustment' THEN 'ADJUSTMENT'
            ELSE sm.movement_type
          END as transaction_type,
          sm.quantity,
          NULL as reference_no,
          NULL as batch_no,
          NULL as expiry_date,
          COALESCE(sm.reason, 'Manual') as source,
          sm.notes as note,
          CASE 
            WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL 
              THEN CONCAT(u.first_name, ' ', u.last_name)
            WHEN u.email IS NOT NULL 
              THEN u.email
            ELSE 'System'
          END as created_by_name,
          u.role as created_by_role,
          sm.created_at
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        LEFT JOIN users u ON sm.user_id = u.id
        ${smWhereClause}
        ${smTypeFilter}
      ) combined_history
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), offset);
    
    const [rows] = await pool.query(query, params);
    
    // Get total count from both tables
    let countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT st.id
        FROM stock_transactions st
        ${stWhereClause}
        ${stTypeFilter}
        
        UNION ALL
        
        SELECT sm.id
        FROM stock_movements sm
        ${smWhereClause}
        ${smTypeFilter}
      ) combined_count
    `;
    
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ error: 'Failed to fetch stock history' });
  }
};

// Get stock items (batch tracking)
const getStockItems = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const query = `
      SELECT 
        si.id,
        si.product_id,
        p.name as product_name,
        si.batch_no,
        si.expiry_date,
        si.received_at,
        si.remaining_qty,
        si.total_qty,
        si.created_at
      FROM stock_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.product_id = ? AND si.remaining_qty > 0
      ORDER BY si.received_at ASC, si.expiry_date ASC
    `;
    
    const [rows] = await pool.query(query, [productId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching stock items:', error);
    res.status(500).json({ error: 'Failed to fetch stock items' });
  }
};

// Get monthly stock report
const getMonthlyStockReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    let query = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        DATE_FORMAT(st.created_at, '%Y-%m') as month,
        SUM(CASE WHEN st.transaction_type = 'IN' THEN st.quantity ELSE 0 END) as total_in,
        SUM(CASE WHEN st.transaction_type = 'OUT' THEN st.quantity ELSE 0 END) as total_out,
        SUM(CASE WHEN st.transaction_type = 'IN' THEN st.quantity ELSE -st.quantity END) as net_movement
      FROM products p
      LEFT JOIN stock_transactions st ON p.id = st.product_id
      WHERE p.is_active = TRUE
    `;
    
    const params = [];
    
    if (year) {
      query += ' AND YEAR(st.created_at) = ?';
      params.push(year);
    }
    
    if (month) {
      query += ' AND MONTH(st.created_at) = ?';
      params.push(month);
    }
    
    query += `
      GROUP BY p.id, p.name, p.sku, DATE_FORMAT(st.created_at, '%Y-%m')
      ORDER BY month DESC, p.name
    `;
    
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching monthly stock report:', error);
    res.status(500).json({ error: 'Failed to fetch monthly stock report' });
  }
};

// Get low stock alerts
const getLowStockAlerts = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.name,
        c.name as category_name,
        p.stock as current_stock,
        p.base_stock,
        p.price,
        p.original_price,
        p.reorder_point,
        p.max_stock,
        CASE 
          WHEN p.stock = 0 THEN 'CRITICAL'
          WHEN p.stock <= p.reorder_point THEN 'LOW'
          ELSE 'GOOD'
        END as alert_level
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE 
        AND p.stock <= p.reorder_point
      ORDER BY p.stock ASC, p.name
    `;
    
    const [rows] = await pool.query(query);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    res.status(500).json({ error: 'Failed to fetch low stock alerts' });
  }
};

// Automatic stock out on order placement
const processOrderStockOut = async (orderId, orderItems) => {
  try {
    const userId = 1; // System user ID for automatic transactions
    
    for (const item of orderItems) {
      await pool.query(
        'CALL sp_stock_out(?, ?, ?, ?, ?, ?)',
        [
          item.product_id,
          item.quantity,
          `ORDER-${orderId}`,
          'sale',
          `Order #${orderId} - ${item.product_name}`,
          userId
        ]
      );
    }
    
    console.log(`✅ Stock out processed for order ${orderId}`);
  } catch (error) {
    console.error(`❌ Error processing stock out for order ${orderId}:`, error);
    throw error;
  }
};

export {
  getCurrentStock,
  getProductStock,
  addStockIn,
  stockOut,
  adjustStock,
  getStockHistory,
  getStockItems,
  getMonthlyStockReport,
  getLowStockAlerts,
  processOrderStockOut
};
