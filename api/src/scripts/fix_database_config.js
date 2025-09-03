import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixDatabaseConfig() {
  let connection;
  
  try {
    console.log('🔧 Fixing database configuration...');
    
    // Connect to MySQL server (without specifying database)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      charset: 'utf8mb4',
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Check if capstone_db exists
    const [databases] = await connection.execute('SHOW DATABASES');
    const capstoneDb = databases.find(db => db.Database === 'capstone_db');
    
    if (!capstoneDb) {
      console.log('🔧 Creating capstone_db database...');
      await connection.execute('CREATE DATABASE IF NOT EXISTS capstone_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      console.log('✅ Created capstone_db database');
    } else {
      console.log('✅ capstone_db database already exists');
    }
    
    // Close connection and reconnect to capstone_db
    await connection.end();
    
    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'capstone_db',
      port: process.env.DB_PORT || 3306,
      charset: 'utf8mb4',
    });
    
    console.log('✅ Connected to capstone_db database');
    
    // Check if cart table exists
    const [tables] = await dbConnection.execute('SHOW TABLES LIKE "cart"');
    if (tables.length === 0) {
      console.log('🔧 Creating cart table...');
      await dbConnection.execute(`
        CREATE TABLE IF NOT EXISTS cart (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          product_id INT NOT NULL,
          size_id INT NULL,
          quantity INT NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created cart table');
    } else {
      console.log('✅ Cart table already exists');
    }
    
    // Check if product_sizes table exists
    const [sizeTables] = await dbConnection.execute('SHOW TABLES LIKE "product_sizes"');
    if (sizeTables.length === 0) {
      console.log('🔧 Creating product_sizes table...');
      await dbConnection.execute(`
        CREATE TABLE IF NOT EXISTS product_sizes (
          id INT PRIMARY KEY AUTO_INCREMENT,
          product_id INT NOT NULL,
          size VARCHAR(10) NOT NULL,
          stock INT DEFAULT 0,
          price DECIMAL(10,2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_product_size (product_id, size)
        )
      `);
      console.log('✅ Created product_sizes table');
    } else {
      console.log('✅ Product_sizes table already exists');
    }
    
    await dbConnection.end();
    
    console.log('\n🎉 Database configuration fixed successfully!');
    console.log('💡 Make sure your .env file has: DB_NAME=capstone_db');
    
  } catch (error) {
    console.error('❌ Error fixing database configuration:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the fix
fixDatabaseConfig();
