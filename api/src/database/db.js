import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
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

// Create connection pool
export const pool = mysql.createPool(dbConfig);

// Test database connection
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Initialize database connection
export const initializeDatabase = async () => {
  try {
    await testConnection();
    
    // Test basic query
    const [rows] = await pool.query('SELECT 1 as test');
    console.log('✅ Database query test successful');
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
};

// Graceful shutdown for database connections
export const closeDatabase = async () => {
  try {
    await pool.end();
    console.log('✅ Database connections closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database connections:', error.message);
  }
};

// Handle database errors
pool.on('error', (err) => {
  console.error('❌ Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection was closed. Reconnecting...');
  } else if (err.code === 'ER_CON_COUNT_ERROR') {
    console.log('Database has too many connections.');
  } else if (err.code === 'ECONNREFUSED') {
    console.log('Database connection was refused.');
  }
});

// Auto-initialize on import
if (process.env.NODE_ENV !== 'test') {
  initializeDatabase();
}