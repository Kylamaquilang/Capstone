import { pool } from '../database/db.js';

async function checkPaymentTables() {
  try {
    console.log('🔍 Checking payment-related tables...');
    
    // Check if payment_transactions table exists
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('payment_transactions', 'orders')
    `);
    
    console.log('📋 Existing tables:');
    console.table(tables);
    
    // Check if payment_transactions table exists
    const hasPaymentTransactions = tables.some(table => table.TABLE_NAME === 'payment_transactions');
    
    if (!hasPaymentTransactions) {
      console.log('❌ payment_transactions table does not exist. Creating it...');
      
      await pool.query(`
        CREATE TABLE payment_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          transaction_id VARCHAR(255) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
          gateway_response TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          INDEX idx_transaction_id (transaction_id),
          INDEX idx_order_id (order_id)
        )
      `);
      
      console.log('✅ payment_transactions table created successfully!');
    } else {
      console.log('✅ payment_transactions table exists');
    }
    
    // Check orders table structure
    const [orderColumns] = await pool.query('DESCRIBE orders');
    console.log('📋 Orders table structure:');
    console.table(orderColumns);
    
    // Check if payment_intent_id column exists in orders
    const hasPaymentIntentId = orderColumns.some(col => col.Field === 'payment_intent_id');
    
    if (!hasPaymentIntentId) {
      console.log('❌ payment_intent_id column missing from orders table. Adding it...');
      
      await pool.query('ALTER TABLE orders ADD COLUMN payment_intent_id VARCHAR(255) NULL');
      
      console.log('✅ payment_intent_id column added to orders table!');
    } else {
      console.log('✅ payment_intent_id column exists in orders table');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

checkPaymentTables();
