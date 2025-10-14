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
        COALESCE(sb.qty, p.stock, 0) as current_stock,
        p.stock as base_stock,
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
      WHERE p.is_active = TRUE
      ORDER BY p.name
    `;
    
    const [rows] = await pool.query(query);
    res.json({ success: true, data: rows });
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
    const { productId, quantity, referenceNo, batchNo, expiryDate, source, note } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!productId || !quantity || !source) {
      return res.status(400).json({ error: 'Product ID, quantity, and source are required' });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    
    // Call stored procedure
    await pool.query(
      'CALL sp_stock_in(?, ?, ?, ?, ?, ?, ?, ?)',
      [productId, quantity, referenceNo, batchNo, expiryDate, source, note, userId]
    );
    
    res.json({ 
      success: true, 
      message: `Successfully added ${quantity} units to stock`,
      data: { productId, quantity, referenceNo, batchNo, expiryDate, source }
    });
  } catch (error) {
    console.error('Error adding stock in:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
};

// Stock out (using stored procedure)
const stockOut = async (req, res) => {
  try {
    const { productId, quantity, referenceNo, source, note } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!productId || !quantity || !source) {
      return res.status(400).json({ error: 'Product ID, quantity, and source are required' });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }
    
    // Call stored procedure
    await pool.query(
      'CALL sp_stock_out(?, ?, ?, ?, ?, ?)',
      [productId, quantity, referenceNo, source, note, userId]
    );
    
    res.json({ 
      success: true, 
      message: `Successfully deducted ${quantity} units from stock`,
      data: { productId, quantity, referenceNo, source }
    });
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
    
    let query = `
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
        u.name as created_by_name,
        st.created_at
      FROM stock_transactions st
      JOIN products p ON st.product_id = p.id
      LEFT JOIN users u ON st.created_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (productId) {
      query += ' AND st.product_id = ?';
      params.push(productId);
    }
    
    if (transactionType) {
      query += ' AND st.transaction_type = ?';
      params.push(transactionType);
    }
    
    if (startDate) {
      query += ' AND st.created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND st.created_at <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY st.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const [rows] = await pool.query(query, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM stock_transactions st
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (productId) {
      countQuery += ' AND st.product_id = ?';
      countParams.push(productId);
    }
    
    if (transactionType) {
      countQuery += ' AND st.transaction_type = ?';
      countParams.push(transactionType);
    }
    
    if (startDate) {
      countQuery += ' AND st.created_at >= ?';
      countParams.push(startDate);
    }
    
    if (endDate) {
      countQuery += ' AND st.created_at <= ?';
      countParams.push(endDate);
    }
    
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
        COALESCE(sb.qty, p.stock, 0) as current_stock,
        p.reorder_point,
        p.max_stock,
        CASE 
          WHEN COALESCE(sb.qty, p.stock, 0) = 0 THEN 'CRITICAL'
          WHEN COALESCE(sb.qty, p.stock, 0) <= p.reorder_point THEN 'LOW'
          ELSE 'GOOD'
        END as alert_level
      FROM products p
      LEFT JOIN stock_balance sb ON p.id = sb.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE 
        AND COALESCE(sb.qty, p.stock, 0) <= p.reorder_point
      ORDER BY COALESCE(sb.qty, p.stock, 0) ASC, p.name
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
