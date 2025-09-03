import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkDatabase() {
  let connection;
  
  try {
    console.log('🔍 Checking database configuration...');
    
    // Check environment variables
    console.log('\n📋 Environment Variables:');
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'root'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'capstone_db'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT || 3306}`);
    
    // Try to connect to the configured database
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'capstone_db',
      port: process.env.DB_PORT || 3306,
      charset: 'utf8mb4',
    };
    
    console.log(`\n🔗 Attempting to connect to database: ${dbConfig.database}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');
    
    // Check if cart table exists
    console.log('\n📋 Checking cart table...');
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'cart'
    `, [dbConfig.database]);
    
    if (tables.length > 0) {
      console.log('✅ Cart table exists');
      
      // Check cart table structure
      const [columns] = await connection.execute('DESCRIBE cart');
      console.log('📋 Cart table structure:');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('❌ Cart table does not exist');
      
      // Check if we're in the wrong database
      console.log('\n🔍 Checking available databases...');
      const [databases] = await connection.execute('SHOW DATABASES');
      console.log('Available databases:');
      databases.forEach(db => {
        console.log(`   - ${db.Database}`);
      });
      
      // Check if capstone_db exists
      const capstoneDb = databases.find(db => db.Database === 'capstone_db');
      if (capstoneDb) {
        console.log('\n⚠️  Found capstone_db database. You might be connected to the wrong database.');
        console.log('💡 Solution: Set DB_NAME=capstone_db in your .env file');
      }
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 The database does not exist. Creating it...');
      await createDatabase();
    }
    
    if (connection) {
      await connection.end();
    }
  }
}

async function createDatabase() {
  let connection;
  
  try {
    // Connect without specifying database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      charset: 'utf8mb4',
    });
    
    // Create capstone_db database
    await connection.execute('CREATE DATABASE IF NOT EXISTS capstone_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✅ Created capstone_db database');
    
    // Close connection and reconnect to the new database
    await connection.end();
    
    const dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'capstone_db',
      port: process.env.DB_PORT || 3306,
      charset: 'utf8mb4',
    });
    
    // Create cart table
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
    
    await dbConnection.end();
    
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    if (connection) {
      await connection.end();
    }
  }
}

// Run the check
checkDatabase();
