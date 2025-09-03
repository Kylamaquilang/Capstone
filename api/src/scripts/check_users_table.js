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

async function checkUsersTable() {
  let connection;
  
  try {
    console.log('🔍 Checking users table structure...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check table structure
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'capstone_db']);

    console.log('📋 Users table structure:');
    console.table(columns);

    // Check existing users
    const [users] = await connection.execute(`
      SELECT id, name, student_id, email, role, first_name, last_name, middle_name, suffix, degree, status, created_at
      FROM users
      ORDER BY id
    `);

    console.log('\n👥 Current users:');
    console.table(users);
    
  } catch (error) {
    console.error('❌ Error checking users table:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the check
if (process.env.NODE_ENV !== 'test') {
  checkUsersTable()
    .then(() => {
      console.log('🎉 Check completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Check failed:', error.message);
      process.exit(1);
    });
}

export default checkUsersTable;
