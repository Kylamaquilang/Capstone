import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'capstone_db',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
};

async function fixCartSimple() {
  let connection;
  
  try {
    console.log('🔧 Fixing cart table structure (simple)...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to capstone_db database');
    
    // Check if size_id column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'capstone_db' 
      AND TABLE_NAME = 'cart' 
      AND COLUMN_NAME = 'size_id'
    `);
    
    if (columns.length === 0) {
      // Add size_id column without foreign key constraint
      console.log('🔧 Adding size_id column to cart table...');
      await connection.execute(`
        ALTER TABLE cart 
        ADD COLUMN size_id INT NULL AFTER product_id
      `);
      console.log('✅ size_id column added to cart table');
    } else {
      console.log('✅ size_id column already exists in cart table');
    }
    
    // Show final structure
    console.log('\n📋 Final cart table structure:');
    const [finalColumns] = await connection.execute('DESCRIBE cart');
    finalColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    await connection.end();
    console.log('\n🎉 Cart table structure fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing cart table:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the fix
fixCartSimple();
