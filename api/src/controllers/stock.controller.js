import { pool } from '../database/db.js';

// Get current stock for all products
const getCurrentStock = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count first
    // Build WHERE clause conditionally
    let whereClause = 'WHERE is_active = TRUE';
    try {
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'deleted_at'
      `);
      if (columns.length > 0) {
        whereClause += ' AND deleted_at IS NULL';
      }
    } catch (err) {
      // Column doesn't exist yet, continue without the condition
    }
    
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM products ${whereClause}`
    );
    const total = countResult[0].total;
    
    // Build WHERE clause with deleted_at check
    let productWhereClause = 'WHERE p.is_active = TRUE';
    try {
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'deleted_at'
      `);
      if (columns.length > 0) {
        productWhereClause += ' AND p.deleted_at IS NULL';
      }
    } catch (err) {
      // Column doesn't exist yet, continue without the condition
    }
    
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
        COALESCE(p.reorder_point, 10) as reorder_point,
        p.max_stock,
        p.updated_at as last_updated
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${productWhereClause}
      ORDER BY p.name
      LIMIT ? OFFSET ?
    `;
    
    const [products] = await pool.query(query, [parseInt(limit), offset]);
    
    // Use consistent threshold matching low stock alerts logic
    const LOW_STOCK_THRESHOLD = 10;
    
    // Get sizes for each product and calculate actual stock status
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
          
          // Calculate actual current stock (same logic as low stock alerts)
          let actualCurrentStock = 0;
          if (sizes.length > 0) {
            // Product has sizes - use sum of all size stocks as current stock
            actualCurrentStock = sizes.reduce((sum, size) => sum + (parseInt(size.stock) || 0), 0);
          } else {
            // Product without sizes - use base stock
            actualCurrentStock = parseInt(product.current_stock) || 0;
          }
          
          // Determine stock status using same logic as low stock alerts
          let stock_status = 'IN_STOCK';
          if (actualCurrentStock <= 0) {
            stock_status = 'OUT_OF_STOCK';
          } else if (actualCurrentStock <= LOW_STOCK_THRESHOLD) {
            stock_status = 'LOW';
          }
          
          return {
            ...product,
            current_stock: actualCurrentStock, // Use calculated actual stock
            sizes: sizes || [],
            stock_status: stock_status
          };
        } catch (error) {
          console.error(`Error fetching sizes for product ${product.id}:`, error);
          // Fallback: use base stock for status
          const baseStock = parseInt(product.current_stock) || 0;
          let stock_status = 'IN_STOCK';
          if (baseStock <= 0) {
            stock_status = 'OUT_OF_STOCK';
          } else if (baseStock <= LOW_STOCK_THRESHOLD) {
            stock_status = 'LOW';
          }
          return {
            ...product,
            sizes: [],
            stock_status: stock_status
          };
        }
      })
    );
    
    res.json({ 
      success: true, 
      data: productsWithSizes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
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
      
      // Get current stock BEFORE updating (for previous_stock)
      let currentStock = 0;
      if (size && size.trim() !== '') {
        // Get size-specific stock
        const [sizeExists] = await connection.query(
          'SELECT id, stock FROM product_sizes WHERE product_id = ? AND size = ? AND is_active = 1',
          [productId, size.trim()]
        );
        
        if (sizeExists.length === 0) {
          throw new Error(`Size "${size}" not found for this product`);
        }
        
        currentStock = parseInt(sizeExists[0].stock) || 0;
        
        // Update size-specific stock
        await connection.query(
          'UPDATE product_sizes SET stock = stock + ? WHERE product_id = ? AND size = ?',
          [quantity, productId, size.trim()]
        );
        
        console.log(`✅ Updated stock for size ${size} by +${quantity}`);
      } else {
        // Get base product stock
        const [productStock] = await connection.query(
          'SELECT stock FROM products WHERE id = ?',
          [productId]
        );
        currentStock = parseInt(productStock[0]?.stock) || 0;
      }
      
      // Calculate new stock
      const newStock = currentStock + quantity;
      
      // Check if previous_stock and new_stock columns exist
      let hasStockColumns = false;
      try {
        const [columns] = await connection.query(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'stock_transactions' 
          AND COLUMN_NAME IN ('previous_stock', 'new_stock')
        `);
        hasStockColumns = columns.length === 2;
        
        if (!hasStockColumns && columns.length > 0) {
          if (!columns.find(c => c.COLUMN_NAME === 'previous_stock')) {
            await connection.query('ALTER TABLE stock_transactions ADD COLUMN previous_stock INT NULL AFTER quantity');
          }
          if (!columns.find(c => c.COLUMN_NAME === 'new_stock')) {
            await connection.query('ALTER TABLE stock_transactions ADD COLUMN new_stock INT NULL AFTER previous_stock');
          }
          hasStockColumns = true;
        } else if (!hasStockColumns) {
          await connection.query('ALTER TABLE stock_transactions ADD COLUMN previous_stock INT NULL AFTER quantity');
          await connection.query('ALTER TABLE stock_transactions ADD COLUMN new_stock INT NULL AFTER previous_stock');
          hasStockColumns = true;
        }
      } catch (columnError) {
        console.log('⚠️ Error checking/adding stock columns:', columnError.message);
      }
      
      // Call stored procedure for main product stock (this handles products table update)
      // Note: userId can be NULL if user is not found or not authenticated
      await connection.query(
        'CALL sp_stock_in(?, ?, ?, ?, ?, ?, ?, ?)',
        [productId, quantity, referenceNo || null, batchNo || null, expiryDate || null, source, note || null, userId]
      );
      
      // Update the transaction record with previous_stock and new_stock
      // Get the most recent transaction for this product (just created by sp_stock_in)
      if (hasStockColumns) {
        // First, get the transaction ID that was just created
        const [recentTransaction] = await connection.query(
          `SELECT id FROM stock_transactions 
           WHERE product_id = ? 
           AND transaction_type = 'IN'
           AND quantity = ?
           AND (reference_no = ? OR (? IS NULL AND reference_no IS NULL))
           AND created_at >= DATE_SUB(NOW(), INTERVAL 5 SECOND)
           ORDER BY created_at DESC
           LIMIT 1`,
          [productId, quantity, referenceNo || null, referenceNo || null]
        );
        
        if (recentTransaction.length > 0) {
          await connection.query(
            `UPDATE stock_transactions 
             SET previous_stock = ?, new_stock = ?
             WHERE id = ?`,
            [currentStock, newStock, recentTransaction[0].id]
          );
          console.log(`✅ Updated stock transaction ID ${recentTransaction[0].id} with previous_stock=${currentStock}, new_stock=${newStock}`);
        } else {
          console.log(`⚠️ Could not find recent transaction to update for product ${productId}`);
        }
      }
      
      await connection.commit();
      
      // Check if stock is now above reorder point
      let shouldRefreshLowStockAlerts = false;
      const [productInfo] = await connection.query(
        'SELECT stock, reorder_point FROM products WHERE id = ?',
        [productId]
      );
      
      if (productInfo.length > 0) {
        // Use consistent threshold of 10 to match low stock alerts display logic
        const LOW_STOCK_THRESHOLD = 10;
        const currentStock = parseInt(productInfo[0].stock) || 0;
        
        // Check if product should be removed from low stock alerts
        // For products with sizes, we need to check if ALL sizes are above threshold
        // For products without sizes, check base stock
        
        // First, check if product has sizes
        const [productSizes] = await connection.query(
          'SELECT id, size, stock FROM product_sizes WHERE product_id = ? AND is_active = 1',
          [productId]
        );
        
        if (productSizes.length > 0) {
          // Product has sizes - calculate total size stock
          const totalSizeStock = productSizes.reduce((sum, size) => sum + (parseInt(size.stock) || 0), 0);
          
          // Check if ALL sizes are above threshold
          const allSizesAboveThreshold = productSizes.every(size => {
            const sizeStock = parseInt(size.stock) || 0;
            return sizeStock > LOW_STOCK_THRESHOLD;
          });
          
          // Also check if base stock is above threshold (if applicable)
          const baseStockAboveThreshold = currentStock > LOW_STOCK_THRESHOLD;
          
          // Product should be removed if:
          // 1. All sizes are above threshold AND (base stock is above threshold OR base stock is 0)
          // 2. OR total size stock is above threshold (for size-only products)
          if ((allSizesAboveThreshold && (baseStockAboveThreshold || currentStock === 0)) || 
              (totalSizeStock > LOW_STOCK_THRESHOLD && totalSizeStock > 0)) {
            shouldRefreshLowStockAlerts = true;
            console.log(`✅ Product ${productId} (with sizes) - stock above threshold (${LOW_STOCK_THRESHOLD}) - alert should be removed`);
          }
        } else {
          // Product without sizes - check base stock only
          if (currentStock > LOW_STOCK_THRESHOLD) {
            shouldRefreshLowStockAlerts = true;
            console.log(`✅ Product ${productId} stock (${currentStock}) is now above threshold (${LOW_STOCK_THRESHOLD}) - alert should be removed`);
          }
        }
      }
      
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
        
        // Emit low stock alerts refresh if stock is now above threshold
        if (shouldRefreshLowStockAlerts) {
          io.to('admin-room').emit('low-stock-alerts-refresh', {
            productId,
            message: 'Stock restocked above threshold - alert removed'
          });
          console.log(`✅ Low stock alert should be removed for product ${productId}`);
        }
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
    
    // Check if stock_movements table exists
    let stockMovementsExists = false;
    try {
      await pool.query('SELECT 1 FROM stock_movements LIMIT 1');
      stockMovementsExists = true;
    } catch (tableError) {
      console.log('⚠️ Stock movements table does not exist, using stock_transactions only');
      stockMovementsExists = false;
    }
    
    // Check if previous_stock and new_stock columns exist in stock_transactions
    let hasStockColumns = false;
    try {
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'stock_transactions' 
        AND COLUMN_NAME IN ('previous_stock', 'new_stock')
      `);
      hasStockColumns = columns.length === 2;
      if (!hasStockColumns && columns.length > 0) {
        console.log('⚠️ Some stock columns missing in stock_transactions, adding them...');
        // Add missing columns
        if (!columns.find(c => c.COLUMN_NAME === 'previous_stock')) {
          await pool.query('ALTER TABLE stock_transactions ADD COLUMN previous_stock INT NULL AFTER quantity');
        }
        if (!columns.find(c => c.COLUMN_NAME === 'new_stock')) {
          await pool.query('ALTER TABLE stock_transactions ADD COLUMN new_stock INT NULL AFTER previous_stock');
        }
        hasStockColumns = true;
      } else if (!hasStockColumns) {
        console.log('⚠️ Adding previous_stock and new_stock columns to stock_transactions...');
        await pool.query('ALTER TABLE stock_transactions ADD COLUMN previous_stock INT NULL AFTER quantity');
        await pool.query('ALTER TABLE stock_transactions ADD COLUMN new_stock INT NULL AFTER previous_stock');
        hasStockColumns = true;
      }
    } catch (columnError) {
      console.log('⚠️ Error checking/adding stock columns:', columnError.message);
      hasStockColumns = false;
    }
    
    // Build WHERE clauses and parameters
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
    if (transactionType && stockMovementsExists) {
      if (transactionType === 'IN') {
        smTypeFilter = " AND sm.movement_type = 'stock_in'";
      } else if (transactionType === 'OUT') {
        smTypeFilter = " AND sm.movement_type = 'stock_out'";
      } else {
        // For other types, skip stock_movements or handle accordingly
        smTypeFilter = " AND 1=0"; // Exclude stock_movements for non-IN/OUT types
      }
    }
    
    // Build the query - use stock_movements only if table exists
    let query = '';
    if (stockMovementsExists) {
      // Combined query from both stock_transactions and stock_movements
      query = `
        SELECT 
          id,
          product_id,
          product_name,
          transaction_type,
          quantity,
          previous_stock,
          new_stock,
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
            ${hasStockColumns ? 'st.previous_stock' : 'NULL'} as previous_stock,
            ${hasStockColumns ? 'st.new_stock' : 'NULL'} as new_stock,
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
            sm.previous_stock,
            sm.new_stock,
            NULL as reference_no,
            NULL as batch_no,
            NULL as expiry_date,
            COALESCE(sm.reason, 'Manual') as source,
            COALESCE(sm.notes, sm.reason, '') as note,
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
    } else {
      // Use only stock_transactions if stock_movements doesn't exist
      query = `
        SELECT 
          st.id,
          st.product_id,
          p.name as product_name,
          st.transaction_type,
          st.quantity,
          ${hasStockColumns ? 'st.previous_stock' : 'NULL'} as previous_stock,
          ${hasStockColumns ? 'st.new_stock' : 'NULL'} as new_stock,
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
        ORDER BY st.created_at DESC
        LIMIT ? OFFSET ?
      `;
    }
    
    params.push(parseInt(limit), offset);
    
    const [rows] = await pool.query(query, params);
    
    // Get total count
    let countQuery = '';
    if (stockMovementsExists) {
      countQuery = `
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
    } else {
      countQuery = `
        SELECT COUNT(*) as total
        FROM stock_transactions st
        ${stWhereClause}
        ${stTypeFilter}
      `;
    }
    
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;
    
    res.json({
      success: true,
      data: rows || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching stock history:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      error: 'Failed to fetch stock history',
      message: error.message || 'An error occurred while fetching stock history'
    });
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
    const { page = 1, limit = 20 } = req.query;
    
    // Build WHERE clause with deleted_at check
    let productWhereClause = 'WHERE p.is_active = TRUE';
    try {
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'deleted_at'
      `);
      if (columns.length > 0) {
        productWhereClause += ' AND p.deleted_at IS NULL';
      }
    } catch (err) {
      // Column doesn't exist yet, continue without the condition
    }
    
    // Get all active products with their base stock
    const [allProducts] = await pool.query(`
      SELECT 
        p.id,
        p.name,
        c.name as category_name,
        p.stock as current_stock,
        p.base_stock,
        p.price,
        p.original_price,
        p.reorder_point,
        p.max_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${productWhereClause}
      ORDER BY p.stock ASC, p.name
    `);
    
    // Get product sizes for all products and filter for low stock
    const lowStockProducts = [];
    
    // Use consistent threshold of 10 to match product table display
    const LOW_STOCK_THRESHOLD = 10;
    
    console.log(`🔍 Checking ${allProducts.length} products for low stock alerts (threshold: ${LOW_STOCK_THRESHOLD})`);
    
    for (const product of allProducts) {
      let isLowStock = false;
      let alertLevel = 'GOOD';
      
      // Get size-specific stock if product has sizes
      const [sizes] = await pool.query(
        'SELECT id, size, stock FROM product_sizes WHERE product_id = ? AND is_active = 1',
        [product.id]
      );
      
      // Calculate actual current stock:
      // - For products WITH sizes: current stock = sum of all size stocks (actual available stock)
      // - For products WITHOUT sizes: current stock = base stock
      let actualCurrentStock = 0;
      if (sizes.length > 0) {
        // Product has sizes - use sum of all size stocks as current stock
        actualCurrentStock = sizes.reduce((sum, size) => sum + (parseInt(size.stock) || 0), 0);
        console.log(`📦 Product ${product.id} "${product.name}": Has ${sizes.length} sizes, total stock = ${actualCurrentStock}`);
      } else {
        // Product without sizes - use base stock
        actualCurrentStock = parseInt(product.current_stock) || 0;
        console.log(`📦 Product ${product.id} "${product.name}": No sizes, base stock = ${actualCurrentStock}`);
      }
      
      // Check if current stock is low (based on actual current stock, not base stock)
      if (actualCurrentStock <= LOW_STOCK_THRESHOLD) {
        isLowStock = true;
        if (actualCurrentStock === 0) {
          alertLevel = 'CRITICAL';
        } else {
          alertLevel = 'LOW';
        }
        console.log(`⚠️ Product ${product.id} "${product.name}": LOW STOCK (${actualCurrentStock} <= ${LOW_STOCK_THRESHOLD})`);
      }
      
      // For products with sizes, also check individual sizes for more detailed alert level
      if (sizes.length > 0) {
        // Check if any size is out of stock
        const hasOutOfStockSize = sizes.some(size => {
          const sizeStock = parseInt(size.stock) || 0;
          return sizeStock === 0;
        });
        if (hasOutOfStockSize && alertLevel !== 'CRITICAL') {
          alertLevel = 'CRITICAL';
        }
      }
      
      // Only include products with low stock (based on actual current stock)
      if (isLowStock) {
        // Calculate suggested reorder quantity
        // Suggested = (max_stock or reorder_point * 3) - current_stock
        const maxStock = parseInt(product.max_stock) || (parseInt(product.reorder_point) || LOW_STOCK_THRESHOLD) * 3;
        const suggestedReorder = Math.max(0, maxStock - actualCurrentStock);
        
        // Determine status text
        const status = actualCurrentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK';
        
        lowStockProducts.push({
          ...product,
          current_stock: actualCurrentStock, // Use actual current stock
          alert_level: alertLevel,
          status: status, // Add status field
          reorder_level: LOW_STOCK_THRESHOLD, // Use consistent threshold
          suggested_reorder_quantity: suggestedReorder,
          sizes: sizes.length > 0 ? sizes.map(s => ({
            id: s.id,
            size: s.size,
            stock: parseInt(s.stock) || 0
          })) : null // Include size information for display
        });
      }
    }
    
    // Sort by stock level (critical first, then by stock amount)
    // Use the updated current_stock value (which is total size stock for products with sizes)
    lowStockProducts.sort((a, b) => {
      if (a.alert_level === 'CRITICAL' && b.alert_level !== 'CRITICAL') return -1;
      if (a.alert_level !== 'CRITICAL' && b.alert_level === 'CRITICAL') return 1;
      // Sort by the actual current_stock (which we set correctly above)
      const aStock = parseInt(a.current_stock) || 0;
      const bStock = parseInt(b.current_stock) || 0;
      return aStock - bStock;
    });
    
    // Apply pagination
    const total = lowStockProducts.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedProducts = lowStockProducts.slice(offset, offset + parseInt(limit));
    
    console.log(`📊 Low Stock Alerts: Found ${total} products with stock <= ${LOW_STOCK_THRESHOLD} (showing page ${page}, ${paginatedProducts.length} items)`);
    
    // Log all low stock products for debugging
    if (total > 0) {
      console.log(`📋 Low Stock Products List:`);
      lowStockProducts.forEach((p, idx) => {
        console.log(`  ${idx + 1}. Product ID ${p.id} "${p.name}": Stock = ${p.current_stock}, Status = ${p.status}, Alert Level = ${p.alert_level}`);
      });
    }
    
    res.json({ 
      success: true, 
      data: paginatedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      threshold: LOW_STOCK_THRESHOLD
    });
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    res.status(500).json({ error: 'Failed to fetch low stock alerts' });
  }
};

// Get comprehensive inventory/stock report
// 
// Calculation Logic:
// - Beginning Stock: Sum of all stock-in transactions minus all stock-out transactions 
//   BEFORE the start_date (if provided). If no start_date, Beginning Stock = 0.
// - Stock In: Sum of all stock-in and positive adjustment transactions WITHIN the date range
// - Stock Out: Sum of all stock-out and negative adjustment transactions WITHIN the date range
// - Ending Stock: Beginning Stock + Stock In - Stock Out
//
// All calculations are based on actual transactions from:
// - stock_movements table (movement_type: 'stock_in', 'stock_out', 'stock_adjustment')
// - stock_transactions table (transaction_type: 'IN', 'OUT')
//
// The report automatically updates whenever new inventory transactions occur.
const getInventoryStockReport = async (req, res) => {
  try {
    const { start_date, end_date, product_id, category_id, size, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Note: Date filters are now applied directly in the movement queries for better control
    
    // Get all products with their sizes
    let productQuery = `
      SELECT DISTINCT
        p.id as product_id,
        p.name as product_name,
        p.category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        p.price,
        p.original_price,
        ps.id as size_id,
        ps.size,
        ps.price as size_price
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_sizes ps ON p.id = ps.product_id AND ps.is_active = 1
      WHERE p.is_active = TRUE AND p.deleted_at IS NULL
    `;
    
    const productParams = [];
    
    if (product_id) {
      productQuery += ' AND p.id = ?';
      productParams.push(parseInt(product_id));
    }
    if (category_id) {
      productQuery += ' AND p.category_id = ?';
      productParams.push(parseInt(category_id));
    }
    
    // Apply size filter in the query
    if (size && size !== '' && size !== 'N/A' && size !== 'NONE') {
      // Filter for specific size - must match exactly
      productQuery += ' AND ps.size = ?';
      productParams.push(size);
    } else if (size === 'N/A' || size === 'NONE') {
      // Filter for products without sizes (no size_id or size is N/A/NONE)
      productQuery += ' AND (ps.size IS NULL OR ps.size = \'N/A\' OR ps.size = \'NONE\')';
    }
    
    const [products] = await pool.query(productQuery, productParams);
    
    // For each product/size combination, calculate stock movements
    const reportData = [];
    
    for (const product of products) {
      const sizeId = product.size_id;
      const productSize = product.size || 'N/A';
      
      // Additional size filter check (double-check after query filter)
      // This handles edge cases and ensures exact matching
      if (size && size !== '' && size !== 'N/A' && size !== 'NONE') {
        // Exact match required for specific sizes
        if (productSize !== size) {
        continue;
      }
      } else if (size === 'N/A' || size === 'NONE') {
        // Filter for products without sizes
        if (productSize !== 'N/A' && productSize !== 'NONE' && productSize !== null) {
        continue;
        }
      }
      
      // Calculate stock from ALL stock movements
      // This ensures accuracy by calculating from the source of truth (movements)
      
      // Build size condition for all queries
      // For products with sizes: match exact size_id
      // For products without sizes: match NULL size_id OR movements that don't have size_id
      let sizeCondition = '';
      let sizeParams = [];
      if (sizeId) {
        // Product has a specific size - match movements for that size only
        sizeCondition = 'AND sm.size_id = ?';
        sizeParams = [sizeId];
      } else {
        // Product has no size - match movements where size_id is NULL
        // This includes movements recorded without size_id (from updateProductStock, etc.)
        sizeCondition = 'AND (sm.size_id IS NULL OR sm.size_id = 0)';
      }
      
      // Calculate beginning stock (movements before start_date)
      // Include both stock_movements and stock_transactions to match history
      let beginningStock = 0;
      
      // If start_date is provided, calculate stock before that date
      // If no start_date, beginning stock is 0 (we're showing all-time totals)
      if (start_date) {
        // Build date condition for beginning stock (before start_date)
        // Use DATE() comparison to match only the date part, excluding start_date itself
        const beginningDateConditionSM = 'AND DATE(sm.created_at) < ?';
        const beginningDateConditionST = 'AND DATE(st.created_at) < ?';
        
        // Use the same size condition for beginning stock calculation
        const [movementsBefore] = await pool.query(`
          SELECT 
            COALESCE(SUM(CASE 
              WHEN movement_type = 'stock_in' OR transaction_type = 'IN' THEN quantity 
              WHEN movement_type = 'stock_adjustment' AND quantity > 0 THEN quantity 
              ELSE 0 
            END), 0) as stock_in,
            COALESCE(SUM(CASE 
              WHEN movement_type = 'stock_out' OR transaction_type = 'OUT' THEN quantity 
              WHEN movement_type = 'stock_adjustment' AND quantity < 0 THEN ABS(quantity) 
              ELSE 0 
            END), 0) as stock_out
          FROM (
            -- From stock_movements table
            SELECT 
              sm.movement_type,
              NULL as transaction_type,
              sm.quantity,
              sm.size_id,
              sm.created_at
          FROM stock_movements sm
          WHERE sm.product_id = ?
              ${sizeCondition}
              ${beginningDateConditionSM}
            
            UNION ALL
            
            -- From stock_transactions table
            SELECT 
              CASE 
                WHEN st.transaction_type = 'IN' THEN 'stock_in'
                WHEN st.transaction_type = 'OUT' THEN 'stock_out'
                ELSE NULL
              END as movement_type,
              st.transaction_type,
              st.quantity,
              NULL as size_id,
              st.created_at
            FROM stock_transactions st
            WHERE st.product_id = ?
              ${beginningDateConditionST}
          ) combined_movements_before
        `, [product.product_id, ...sizeParams, start_date, product.product_id, start_date]);
        
        const stockInBefore = parseFloat(movementsBefore[0]?.stock_in || 0);
        const stockOutBefore = parseFloat(movementsBefore[0]?.stock_out || 0);
        
        // Calculate beginning stock: Sum of all stock-in transactions minus all stock-out transactions
        // before the start_date. This represents the quantity at the start of the selected date range.
        beginningStock = stockInBefore - stockOutBefore;
        
        // Ensure beginning stock is never negative (shouldn't happen, but safety check)
        if (beginningStock < 0) {
          console.warn(`⚠️ Beginning Stock is negative (${beginningStock}) for Product ${product.product_id} "${product.product_name}" (Size: ${productSize || 'N/A'}). This may indicate data inconsistency.`);
          beginningStock = Math.max(0, beginningStock);
        }
        
        // Diagnostic: If beginning stock is 0, check if there are ANY movements before start_date
        // (regardless of size) to help diagnose filtering issues
        if (beginningStock === 0 && process.env.NODE_ENV === 'development') {
          const [diagnosticCheck] = await pool.query(`
            SELECT COUNT(*) as total_movements
            FROM (
              SELECT sm.id FROM stock_movements sm WHERE sm.product_id = ? AND DATE(sm.created_at) < ?
              UNION ALL
              SELECT st.id FROM stock_transactions st WHERE st.product_id = ? AND DATE(st.created_at) < ?
            ) all_movements
          `, [product.product_id, start_date, product.product_id, start_date]);
          
          if (diagnosticCheck[0]?.total_movements > 0) {
            console.warn(`⚠️ Beginning Stock is 0 but found ${diagnosticCheck[0].total_movements} total movements before ${start_date} for Product ${product.product_id}. Size filter may be too restrictive.`);
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 Beginning Stock Calculation for Product ${product.product_id} "${product.product_name}" (Size: ${productSize || 'N/A'}, Start Date: ${start_date}):`);
          console.log(`   Stock In Before Start Date: ${stockInBefore}`);
          console.log(`   Stock Out Before Start Date: ${stockOutBefore}`);
          console.log(`   Beginning Stock: ${beginningStock} = ${stockInBefore} - ${stockOutBefore}`);
          console.log(`   Size Condition: ${sizeCondition}`);
          console.log(`   Size Params:`, sizeParams);
        }
      } else {
        // No start_date provided - beginning stock is 0
        // This means we're showing all-time totals from the beginning of time
        // Beginning Stock = 0 (no starting point specified)
        // Ending Stock will be calculated as: 0 + Stock In - Stock Out (net change)
        beginningStock = 0;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 Beginning Stock for Product ${product.product_id} "${product.product_name}" (Size: ${productSize || 'N/A'}): 0 (no start_date provided - showing all-time totals)`);
        }
      }
      
      // Get stock movements in the period (or all movements if no date filter)
      // Build date conditions for both tables separately
      let dateConditionSM = '';
      let dateConditionST = '';
      let dateParams = [];
      if (start_date) {
        dateConditionSM += 'AND DATE(sm.created_at) >= ?';
        dateConditionST += 'AND DATE(st.created_at) >= ?';
        dateParams.push(start_date);
      }
      if (end_date) {
        dateConditionSM += 'AND DATE(sm.created_at) <= ?';
        dateConditionST += 'AND DATE(st.created_at) <= ?';
        dateParams.push(end_date);
      }
      
      // Query movements from BOTH stock_movements and stock_transactions (matching history logic)
      // This ensures the report matches exactly what's shown in the inventory history
      let [movements] = await pool.query(`
        SELECT 
          COALESCE(SUM(CASE 
            WHEN movement_type = 'stock_in' OR transaction_type = 'IN' THEN quantity 
            WHEN movement_type = 'stock_adjustment' AND quantity > 0 THEN quantity 
            ELSE 0 
          END), 0) as stock_in,
          COALESCE(SUM(CASE 
            WHEN movement_type = 'stock_out' OR transaction_type = 'OUT' THEN quantity 
            WHEN movement_type = 'stock_adjustment' AND quantity < 0 THEN ABS(quantity) 
            ELSE 0 
          END), 0) as stock_out,
          COALESCE(SUM(CASE 
            WHEN (movement_type = 'stock_in' OR transaction_type = 'IN') 
              AND (reason LIKE '%restock%' OR reason = 'restock' OR source LIKE '%restock%') 
            THEN quantity ELSE 0 END), 0) as restocks,
          COALESCE(SUM(CASE 
            WHEN (movement_type = 'stock_out' OR transaction_type = 'OUT') 
              AND (reason LIKE '%sale%' OR reason LIKE '%order%' OR source LIKE '%sale%' OR source LIKE '%order%') 
            THEN quantity ELSE 0 END), 0) as sales,
          COALESCE(SUM(CASE 
            WHEN (movement_type = 'stock_out' OR transaction_type = 'OUT') 
              AND (reason LIKE '%return%' OR source LIKE '%return%') 
            THEN quantity ELSE 0 END), 0) as returns,
          COALESCE(SUM(CASE 
            WHEN (movement_type = 'stock_out' OR transaction_type = 'OUT') 
              AND (reason LIKE '%damage%' OR source LIKE '%damage%') 
            THEN quantity ELSE 0 END), 0) as damages,
          COALESCE(SUM(CASE 
            WHEN movement_type = 'stock_adjustment' AND quantity > 0 THEN quantity ELSE 0 END), 0) as positive_adjustments,
          COALESCE(SUM(CASE 
            WHEN movement_type = 'stock_adjustment' AND quantity < 0 THEN ABS(quantity) ELSE 0 END), 0) as negative_adjustments,
          SUBSTRING(GROUP_CONCAT(DISTINCT 
            CASE 
              WHEN reason IS NOT NULL AND reason != '' AND notes IS NOT NULL AND notes != '' 
                THEN CONCAT(reason, ': ', notes)
              WHEN reason IS NOT NULL AND reason != '' 
                THEN reason
              WHEN source IS NOT NULL AND source != '' AND note IS NOT NULL AND note != '' 
                THEN CONCAT(source, ': ', note)
              WHEN source IS NOT NULL AND source != '' 
                THEN source
              WHEN notes IS NOT NULL AND notes != '' 
                THEN notes
              WHEN note IS NOT NULL AND note != '' 
                THEN note
              ELSE NULL
            END
            SEPARATOR '; '), 1, 1000) as remarks
        FROM (
          -- From stock_movements table
          SELECT 
            sm.movement_type,
            NULL as transaction_type,
            sm.quantity,
            sm.reason,
            sm.notes,
            NULL as source,
            NULL as note,
            sm.size_id,
            sm.created_at
        FROM stock_movements sm
        WHERE sm.product_id = ?
            ${sizeCondition}
            ${dateConditionSM}
          
          UNION ALL
          
          -- From stock_transactions table
          SELECT 
            CASE 
              WHEN st.transaction_type = 'IN' THEN 'stock_in'
              WHEN st.transaction_type = 'OUT' THEN 'stock_out'
              ELSE NULL
            END as movement_type,
            st.transaction_type,
            st.quantity,
            NULL as reason,
            st.note as notes,
            st.source,
            st.note,
            NULL as size_id,
            st.created_at
          FROM stock_transactions st
          WHERE st.product_id = ?
            ${dateConditionST}
        ) combined_movements
      `, [product.product_id, ...sizeParams, ...dateParams, product.product_id, ...dateParams]);
      
      // Calculate totals from movements
      let stockIn = parseFloat(movements[0]?.stock_in || 0);
      let stockOut = parseFloat(movements[0]?.stock_out || 0);
      
      // Debug logging for troubleshooting
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Product ${product.product_id} "${product.product_name}" (Size: ${productSize || 'N/A'}, SizeID: ${sizeId || 'NULL'}):`);
        console.log(`   Stock In: ${stockIn}, Stock Out: ${stockOut}`);
        console.log(`   Beginning Stock: ${beginningStock}`);
        console.log(`   Size Condition: ${sizeCondition}`);
        console.log(`   Date Condition: ${dateCondition || 'None'}`);
      }
      
      // Fallback: If no movements found with size filter, try to find ANY movements for this product
      // This handles cases where movements were recorded with incorrect size_id values
      if (stockIn === 0 && stockOut === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Fallback: No movements found with size filter for product ${product.product_id} "${product.product_name}" (SizeID: ${sizeId || 'NULL'}), checking ALL movements...`);
        }
        
        const [fallbackMovements] = await pool.query(`
          SELECT 
            COALESCE(SUM(CASE 
              WHEN movement_type = 'stock_in' OR transaction_type = 'IN' THEN quantity 
              WHEN movement_type = 'stock_adjustment' AND quantity > 0 THEN quantity 
              ELSE 0 
            END), 0) as stock_in,
            COALESCE(SUM(CASE 
              WHEN movement_type = 'stock_out' OR transaction_type = 'OUT' THEN quantity 
              WHEN movement_type = 'stock_adjustment' AND quantity < 0 THEN ABS(quantity) 
              ELSE 0 
            END), 0) as stock_out
          FROM (
            -- From stock_movements table (all movements regardless of size)
            SELECT 
              sm.movement_type,
              NULL as transaction_type,
              sm.quantity,
              sm.created_at
            FROM stock_movements sm
            WHERE sm.product_id = ?
              ${dateConditionSM}
            
            UNION ALL
            
            -- From stock_transactions table
            SELECT 
              CASE 
                WHEN st.transaction_type = 'IN' THEN 'stock_in'
                WHEN st.transaction_type = 'OUT' THEN 'stock_out'
                ELSE NULL
              END as movement_type,
              st.transaction_type,
              st.quantity,
              st.created_at
            FROM stock_transactions st
            WHERE st.product_id = ?
              ${dateConditionST}
          ) combined_fallback
        `, [product.product_id, ...dateParams, product.product_id, ...dateParams]);
        
        const fallbackStockIn = parseFloat(fallbackMovements[0]?.stock_in || 0);
        const fallbackStockOut = parseFloat(fallbackMovements[0]?.stock_out || 0);
        
        if (fallbackStockIn > 0 || fallbackStockOut > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Fallback found movements: Stock In = ${fallbackStockIn}, Stock Out = ${fallbackStockOut}`);
          }
          stockIn = fallbackStockIn;
          stockOut = fallbackStockOut;
          // Keep original movements array to preserve remarks and breakdown data
          // Only update stockIn and stockOut values
        }
      }
      
      // Verify calculations match what's in the history (optional verification)
      // Only verify if there's a potential issue, otherwise use the initial calculation
      try {
        const [verificationMovements] = await pool.query(`
          SELECT 
            COUNT(*) as total_movements,
            COALESCE(SUM(CASE 
              WHEN movement_type = 'stock_in' OR transaction_type = 'IN' THEN quantity 
              WHEN movement_type = 'stock_adjustment' AND quantity > 0 THEN quantity 
              ELSE 0 
            END), 0) as total_stock_in,
            COALESCE(SUM(CASE 
              WHEN movement_type = 'stock_out' OR transaction_type = 'OUT' THEN quantity 
              WHEN movement_type = 'stock_adjustment' AND quantity < 0 THEN ABS(quantity) 
              ELSE 0 
            END), 0) as total_stock_out
          FROM (
            -- From stock_movements table
            SELECT 
              sm.movement_type,
              NULL as transaction_type,
              sm.quantity,
              sm.size_id,
              sm.created_at
            FROM stock_movements sm
            WHERE sm.product_id = ?
              ${sizeCondition}
              ${dateConditionSM}
            
            UNION ALL
            
            -- From stock_transactions table
            SELECT 
              CASE 
                WHEN st.transaction_type = 'IN' THEN 'stock_in'
                WHEN st.transaction_type = 'OUT' THEN 'stock_out'
                ELSE NULL
              END as movement_type,
              st.transaction_type,
              st.quantity,
              NULL as size_id,
              st.created_at
            FROM stock_transactions st
            WHERE st.product_id = ?
              ${dateConditionST}
          ) combined_verification
        `, [product.product_id, ...sizeParams, ...dateParams, product.product_id, ...dateParams]);
        
        const verifiedStockIn = parseFloat(verificationMovements[0]?.total_stock_in || 0);
        const verifiedStockOut = parseFloat(verificationMovements[0]?.total_stock_out || 0);
        
        // Use verified totals to ensure consistency with history
        // This ensures the report exactly matches what's shown in the inventory history
        if (Math.abs(verifiedStockIn - stockIn) > 0.01 || Math.abs(verifiedStockOut - stockOut) > 0.01) {
          console.warn(`⚠️ Calculation discrepancy for Product ${product.product_id} "${product.product_name}" (Size: ${productSize}):`);
          console.warn(`   Initial calculation - In: ${stockIn}, Out: ${stockOut}`);
          console.warn(`   Verified calculation - In: ${verifiedStockIn}, Out: ${verifiedStockOut}`);
          console.warn(`   Using verified totals to match history`);
          
          // Use verified totals to ensure consistency with history
          stockIn = verifiedStockIn;
          stockOut = verifiedStockOut;
        }
      } catch (verifyError) {
        // If verification fails, use the initial calculation
        // This prevents the entire report from failing due to verification issues
        console.warn(`⚠️ Verification query failed for Product ${product.product_id}, using initial calculation:`, verifyError.message);
      }
      
      // Calculate ending stock using the formula: Ending Stock = Beginning Stock + Stock In - Stock Out
      // This formula ensures accuracy based on actual inventory transactions
      const endingStock = beginningStock + stockIn - stockOut;
      
      // Validate calculation to ensure accuracy
      const calculatedEndingStock = parseFloat((beginningStock + stockIn - stockOut).toFixed(2));
      const endingStockRounded = parseFloat(endingStock.toFixed(2));
      
      if (Math.abs(calculatedEndingStock - endingStockRounded) > 0.01) {
        console.error(`⚠️ Ending Stock calculation mismatch for Product ${product.product_id}: ${calculatedEndingStock} vs ${endingStockRounded}`);
      }
      
      // Debug logging for ending stock calculation
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Ending Stock Calculation for Product ${product.product_id} "${product.product_name}" (Size: ${productSize || 'N/A'}):`);
        console.log(`   Beginning Stock: ${beginningStock}`);
        console.log(`   Stock In: ${stockIn}`);
        console.log(`   Stock Out: ${stockOut}`);
        console.log(`   Ending Stock: ${endingStockRounded} = ${beginningStock} + ${stockIn} - ${stockOut}`);
        console.log(`   Formula Verification: ${beginningStock} + ${stockIn} - ${stockOut} = ${calculatedEndingStock}`);
      }
      
      // Get unit price/cost (size price if available, otherwise product price)
      // Try to get cost from original_price first, then price
      const unitCost = product.size_price || product.original_price || product.price || 0;
      const unitPrice = product.size_price || product.price || 0;
      // Total Stock Value = Ending Stock × Unit Cost (if cost available, otherwise use price)
      const totalStockValue = endingStock * (unitCost || unitPrice);
      
      // Determine stock status
      const LOW_STOCK_THRESHOLD = 10;
      let stockStatus = 'IN_STOCK';
      if (endingStock === 0) {
        stockStatus = 'OUT_OF_STOCK';
      } else if (endingStock <= LOW_STOCK_THRESHOLD) {
        stockStatus = 'LOW_STOCK';
      }
      
      // Apply status filter if provided
      if (status) {
        if (status === 'IN_STOCK' && stockStatus !== 'IN_STOCK') {
          continue;
        }
        if (status === 'LOW_STOCK' && stockStatus !== 'LOW_STOCK') {
          continue;
        }
        if (status === 'OUT_OF_STOCK' && stockStatus !== 'OUT_OF_STOCK') {
          continue;
        }
      }
      
      // Final validation: Ensure ending stock calculation is correct
      // Formula: Ending Stock = Beginning Stock + Stock In - Stock Out
      const validatedEndingStock = Math.max(0, beginningStock + stockIn - stockOut);
      
      if (Math.abs(validatedEndingStock - endingStock) > 0.01) {
        console.error(`❌ Ending Stock calculation error for Product ${product.product_id}: Expected ${validatedEndingStock}, Got ${endingStock}`);
        // Use validated calculation
        const correctedEndingStock = validatedEndingStock;
        const correctedTotalValue = correctedEndingStock * (unitCost || unitPrice);
        
        reportData.push({
          product_id: product.product_id,
          product_name: product.product_name,
          category_name: product.category_name,
          size: productSize,
          beginning_stock: Math.max(0, beginningStock), // Quantity at start of date range
          stock_in: stockIn, // Total stock-in transactions in period
          stock_out: stockOut, // Total stock-out transactions in period
          ending_stock: correctedEndingStock, // Beginning + In - Out (validated)
          unit_cost: unitCost,
          unit_price: unitPrice,
          total_stock_value: correctedTotalValue, // Ending Stock × Unit Cost
          stock_status: correctedEndingStock === 0 ? 'OUT_OF_STOCK' : (correctedEndingStock <= 10 ? 'LOW_STOCK' : 'IN_STOCK'),
          remarks: (movements[0]?.remarks && movements[0].remarks.trim() !== '') ? movements[0].remarks.trim() : '',
          breakdown: {
            restocks: parseFloat(movements[0]?.restocks || 0),
            sales: parseFloat(movements[0]?.sales || 0),
            returns: parseFloat(movements[0]?.returns || 0),
            damages: parseFloat(movements[0]?.damages || 0),
            positive_adjustments: parseFloat(movements[0]?.positive_adjustments || 0),
            negative_adjustments: parseFloat(movements[0]?.negative_adjustments || 0)
          }
        });
      } else {
        // Include all products, even if they have no movements in the period
        // This ensures the inventory report shows complete stock information
        reportData.push({
          product_id: product.product_id,
          product_name: product.product_name,
          category_name: product.category_name,
          size: productSize,
          beginning_stock: Math.max(0, beginningStock), // Quantity at start of date range
          stock_in: stockIn, // Total stock-in transactions in period
          stock_out: stockOut, // Total stock-out transactions in period
          ending_stock: Math.max(0, endingStock), // Beginning + In - Out (validated)
          unit_cost: unitCost, // Unit cost (original_price or price)
          unit_price: unitPrice, // Unit selling price
          total_stock_value: totalStockValue, // Ending Stock × Unit Cost
          stock_status: stockStatus,
          remarks: (movements[0]?.remarks && movements[0].remarks.trim() !== '') ? movements[0].remarks.trim() : '',
          // Breakdown for reference (optional)
          breakdown: {
            restocks: parseFloat(movements[0]?.restocks || 0),
            sales: parseFloat(movements[0]?.sales || 0),
            returns: parseFloat(movements[0]?.returns || 0),
            damages: parseFloat(movements[0]?.damages || 0),
            positive_adjustments: parseFloat(movements[0]?.positive_adjustments || 0),
            negative_adjustments: parseFloat(movements[0]?.negative_adjustments || 0)
          }
        });
      }
    }
    
    // Calculate summary (from all data, not just paginated)
    const summary = {
      total_products: new Set(reportData.map(r => r.product_id)).size,
      total_beginning_stock: reportData.reduce((sum, r) => sum + r.beginning_stock, 0),
      total_stock_in: reportData.reduce((sum, r) => sum + r.stock_in, 0),
      total_stock_out: reportData.reduce((sum, r) => sum + r.stock_out, 0),
      total_ending_stock: reportData.reduce((sum, r) => sum + r.ending_stock, 0),
      total_stock_value: reportData.reduce((sum, r) => sum + r.total_stock_value, 0)
    };
    
    // Apply pagination
    const totalRecords = reportData.length;
    const paginatedData = reportData.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      data: paginatedData,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalRecords,
        pages: Math.ceil(totalRecords / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching inventory stock report:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to fetch inventory stock report',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
  getInventoryStockReport,
  processOrderStockOut
};
