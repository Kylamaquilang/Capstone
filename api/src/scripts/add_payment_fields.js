import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'capstone_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,
  charset: 'utf8mb4',
};

async function addPaymentFields() {
  let connection;
  
  try {
    console.log('🔧 Adding payment fields to database...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Add payment-related columns to orders table
    console.log('🔧 Adding payment fields to orders table...');
    
    const alterQueries = [
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255) NULL',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status ENUM("pending", "paid", "failed", "cancelled", "refunded") DEFAULT "pending"',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT "cash"',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_date DATETIME NULL',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255) NULL'
    ];

    for (const query of alterQueries) {
      await connection.execute(query);
    }
    console.log('✅ Payment fields added to orders table');

    // Create payment_transactions table if it doesn't exist
    console.log('🔧 Creating payment_transactions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        transaction_id VARCHAR(255) UNIQUE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        status ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled') NOT NULL DEFAULT 'pending',
        gateway_response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        INDEX idx_order_id (order_id),
        INDEX idx_transaction_id (transaction_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ payment_transactions table created');

    // Create indexes for better performance
    console.log('🔧 Creating payment indexes...');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_orders_payment_intent ON orders(payment_intent_id)');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status)');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method)');
    console.log('✅ Payment indexes created');

    console.log('✅ All payment fields added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding payment fields:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the migration
if (process.env.NODE_ENV !== 'test') {
  addPaymentFields()
    .then(() => {
      console.log('🎉 Payment fields migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Payment fields migration failed:', error.message);
      process.exit(1);
    });
}

export default addPaymentFields;
