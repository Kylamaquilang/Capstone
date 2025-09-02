import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  database: 'capstone_db',
  charset: 'utf8mb4',
};

async function checkTableStructure() {
  let connection;
  
  try {
    console.log('🔍 Checking table structures...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to capstone_db database');
    
    // Check cart table structure
    console.log('\n📋 Cart table structure:');
    const [cartColumns] = await connection.execute(`
      DESCRIBE cart
    `);
    cartColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check cart_items table if it exists
    const [cartItemsExists] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'capstone_db' AND table_name = 'cart_items'
    `);
    
    if (cartItemsExists[0].count > 0) {
      console.log('\n📋 Cart_items table structure:');
      const [cartItemsColumns] = await connection.execute(`
        DESCRIBE cart_items
      `);
      cartItemsColumns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    } else {
      console.log('\n❌ Cart_items table does not exist');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the check
checkTableStructure();
