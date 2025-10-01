import { pool } from '../database/db.js';
import { emitAdminDataRefresh, emitDataRefresh } from '../utils/socket-helper.js';

// ✅ Test endpoint
export const testStockMovements = async (req, res) => {
  try {
    console.log('🧪 Testing stock movements endpoint...');
    res.json({ 
      message: 'Stock movements endpoint is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test Stock Movements Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Create table endpoint
export const createStockMovementsTable = async (req, res) => {
  try {
    console.log('🔧 Creating stock_movements table...');
    
    // First, check if table exists and get its structure
    try {
      const [columns] = await pool.query('DESCRIBE stock_movements');
      console.log('📋 Existing table structure:', columns);
      
      const existingColumns = columns.map(col => col.Field);
      const requiredColumns = ['id', 'product_id', 'user_id', 'movement_type', 'quantity', 'reason', 'supplier', 'notes', 'created_at'];
      
      // Add missing columns
      for (const column of requiredColumns) {
        if (!existingColumns.includes(column)) {
          console.log(`🔧 Adding missing ${column} column...`);
          
          switch (column) {
            case 'user_id':
              await pool.query('ALTER TABLE stock_movements ADD COLUMN user_id INT NOT NULL AFTER product_id');
              await pool.query('ALTER TABLE stock_movements ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
              await pool.query('ALTER TABLE stock_movements ADD INDEX idx_stock_movements_user (user_id)');
              break;
            case 'supplier':
              await pool.query('ALTER TABLE stock_movements ADD COLUMN supplier VARCHAR(200) AFTER reason');
              break;
            case 'notes':
              await pool.query('ALTER TABLE stock_movements ADD COLUMN notes TEXT AFTER supplier');
              break;
            case 'movement_type':
              await pool.query('ALTER TABLE stock_movements ADD COLUMN movement_type ENUM("stock_in", "stock_out") NOT NULL AFTER user_id');
              break;
            case 'quantity':
              await pool.query('ALTER TABLE stock_movements ADD COLUMN quantity INT NOT NULL AFTER movement_type');
              break;
            case 'reason':
              await pool.query('ALTER TABLE stock_movements ADD COLUMN reason VARCHAR(100) NOT NULL AFTER quantity');
              break;
            case 'created_at':
              await pool.query('ALTER TABLE stock_movements ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP AFTER notes');
              break;
          }
          console.log(`✅ Added ${column} column`);
        }
      }
    } catch (describeError) {
      console.log('📋 Table does not exist, creating it...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id INT PRIMARY KEY AUTO_INCREMENT,
          product_id INT NOT NULL,
          user_id INT NOT NULL,
          movement_type ENUM('stock_in', 'stock_out') NOT NULL,
          quantity INT NOT NULL,
          reason VARCHAR(100) NOT NULL,
          supplier VARCHAR(200),
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          
          CONSTRAINT chk_movement_quantity CHECK (quantity > 0),
          INDEX idx_stock_movements_product (product_id),
          INDEX idx_stock_movements_user (user_id),
          INDEX idx_stock_movements_type (movement_type),
          INDEX idx_stock_movements_date (created_at)
        )
      `);
    }
    
    console.log('✅ Stock movements table created/updated successfully');
    res.json({ 
      message: 'Stock movements table created/updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Create Table Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};

// ✅ Create Stock Movement
export const createStockMovement = async (req, res) => {
  try {
    const { product_id, movement_type, quantity, reason, supplier, notes } = req.body;
    const user_id = req.user.id;

    // Validation
    if (!product_id || !movement_type || !quantity || !reason) {
      return res.status(400).json({ 
        error: 'Product ID, movement type, quantity, and reason are required' 
      });
    }

    if (!['stock_in', 'stock_out'].includes(movement_type)) {
      return res.status(400).json({ 
        error: 'Movement type must be either "stock_in" or "stock_out"' 
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({ 
        error: 'Quantity must be greater than 0' 
      });
    }

    // Check if stock_movements table exists
    try {
      await pool.query('SELECT 1 FROM stock_movements LIMIT 1');
    } catch (tableError) {
      console.log('Stock movements table does not exist, creating it...');
      // Create the table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id INT PRIMARY KEY AUTO_INCREMENT,
          product_id INT NOT NULL,
          user_id INT NOT NULL,
          movement_type ENUM('stock_in', 'stock_out') NOT NULL,
          quantity INT NOT NULL,
          reason VARCHAR(100) NOT NULL,
          supplier VARCHAR(200),
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          
          CONSTRAINT chk_movement_quantity CHECK (quantity > 0),
          INDEX idx_stock_movements_product (product_id),
          INDEX idx_stock_movements_user (user_id),
          INDEX idx_stock_movements_type (movement_type),
          INDEX idx_stock_movements_date (created_at)
        )
      `);
    }

    // Check if product exists
    const [products] = await pool.query(
      'SELECT id, name, stock FROM products WHERE id = ? AND is_active = 1',
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];
    const currentStock = parseInt(product.stock) || 0;

    // Check if stock out would result in negative stock
    if (movement_type === 'stock_out' && currentStock < quantity) {
      return res.status(400).json({ 
        error: `Insufficient stock. Current stock: ${currentStock}, requested: ${quantity}` 
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Calculate new stock
      const newStock = movement_type === 'stock_in' 
        ? currentStock + quantity 
        : currentStock - quantity;

      // Update product stock
      await connection.query(
        'UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?',
        [newStock, product_id]
      );

      // Record stock movement
      const [result] = await connection.query(
        `INSERT INTO stock_movements 
         (product_id, user_id, movement_type, quantity, reason, supplier, notes, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [product_id, user_id, movement_type, quantity, reason, supplier, notes]
      );

      await connection.commit();

      // Emit real-time updates
      emitAdminDataRefresh('stock_movement_created', {
        product_id,
        movement_type,
        quantity,
        new_stock: newStock
      });

      res.status(201).json({
        message: 'Stock movement recorded successfully',
        stock_movement_id: result.insertId,
        new_stock: newStock,
        movement: {
          id: result.insertId,
          product_id,
          movement_type,
          quantity,
          reason,
          supplier,
          notes,
          created_at: new Date()
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Create Stock Movement Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Get Stock Movements
export const getStockMovements = async (req, res) => {
  try {
    console.log('📊 Getting stock movements...');
    const { product_id, movement_type, limit = 50, offset = 0 } = req.query;

    // Check if stock_movements table exists
    try {
      await pool.query('SELECT 1 FROM stock_movements LIMIT 1');
      console.log('✅ Stock movements table exists');
    } catch (tableError) {
      console.log('❌ Stock movements table does not exist, returning empty array');
      console.log('Table error:', tableError.message);
      return res.json([]);
    }

    let whereConditions = [];
    let queryParams = [];

    if (product_id) {
      whereConditions.push('sm.product_id = ?');
      queryParams.push(product_id);
    }

    if (movement_type) {
      whereConditions.push('sm.movement_type = ?');
      queryParams.push(movement_type);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const [movements] = await pool.query(
      `SELECT 
        sm.id,
        sm.product_id,
        sm.user_id,
        sm.movement_type,
        sm.quantity,
        sm.reason,
        sm.supplier,
        sm.notes,
        sm.created_at,
        p.name as product_name,
        u.name as user_name
       FROM stock_movements sm
       LEFT JOIN products p ON sm.product_id = p.id
       LEFT JOIN users u ON sm.user_id = u.id
       ${whereClause}
       ORDER BY sm.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), parseInt(offset)]
    );

    console.log(`📊 Found ${movements.length} stock movements`);
    res.json(movements);

  } catch (error) {
    console.error('Get Stock Movements Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: error.message,
      code: error.code
    });
  }
};

// ✅ Get Stock Movement by ID
export const getStockMovementById = async (req, res) => {
  try {
    const { id } = req.params;

    const [movements] = await pool.query(
      `SELECT 
        sm.id,
        sm.product_id,
        sm.user_id,
        sm.movement_type,
        sm.quantity,
        sm.reason,
        sm.supplier,
        sm.notes,
        sm.created_at,
        p.name as product_name,
        u.name as user_name
       FROM stock_movements sm
       LEFT JOIN products p ON sm.product_id = p.id
       LEFT JOIN users u ON sm.user_id = u.id
       WHERE sm.id = ?`,
      [id]
    );

    if (movements.length === 0) {
      return res.status(404).json({ error: 'Stock movement not found' });
    }

    res.json(movements[0]);

  } catch (error) {
    console.error('Get Stock Movement Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Get Stock Movement Summary
export const getStockMovementSummary = async (req, res) => {
  try {
    const { product_id, days = 30 } = req.query;

    let whereConditions = ['sm.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)'];
    let queryParams = [parseInt(days)];

    if (product_id) {
      whereConditions.push('sm.product_id = ?');
      queryParams.push(product_id);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const [summary] = await pool.query(
      `SELECT 
        sm.movement_type,
        COUNT(*) as movement_count,
        SUM(sm.quantity) as total_quantity
       FROM stock_movements sm
       ${whereClause}
       GROUP BY sm.movement_type`,
      queryParams
    );

    const [recentMovements] = await pool.query(
      `SELECT 
        sm.id,
        sm.movement_type,
        sm.quantity,
        sm.reason,
        sm.created_at,
        p.name as product_name
       FROM stock_movements sm
       LEFT JOIN products p ON sm.product_id = p.id
       ${whereClause}
       ORDER BY sm.created_at DESC
       LIMIT 10`,
      queryParams
    );

    res.json({
      summary,
      recent_movements: recentMovements
    });

  } catch (error) {
    console.error('Get Stock Movement Summary Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
