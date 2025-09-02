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

async function fixCartTable() {
  let connection;
  
  try {
    console.log('🔧 Fixing cart table structure...');
    
    // Connect to database
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
      // Add size_id column
      console.log('🔧 Adding size_id column to cart table...');
      await connection.execute(`
        ALTER TABLE cart 
        ADD COLUMN size_id INT NULL AFTER product_id,
        ADD FOREIGN KEY (size_id) REFERENCES product_sizes(id) ON DELETE SET NULL
      `);
      console.log('✅ size_id column added to cart table');
    } else {
      console.log('✅ size_id column already exists in cart table');
    }
    
    // Update existing cart items to have a default size_id
    console.log('🔧 Updating existing cart items...');
    const [cartItems] = await connection.execute('SELECT * FROM cart');
    
    if (cartItems.length > 0) {
      console.log(`📦 Found ${cartItems.length} cart items to update`);
      
      for (const item of cartItems) {
        // Find the default size for this product
        const [sizes] = await connection.execute(
          'SELECT id FROM product_sizes WHERE product_id = ? LIMIT 1',
          [item.product_id]
        );
        
        if (sizes.length > 0) {
          await connection.execute(
            'UPDATE cart SET size_id = ? WHERE id = ?',
            [sizes[0].id, item.id]
          );
          console.log(`✅ Updated cart item ${item.id} with size_id ${sizes[0].id}`);
        }
      }
    } else {
      console.log('📦 No existing cart items to update');
    }
    
    // Verify the final structure
    console.log('\n📋 Final cart table structure:');
    const [finalColumns] = await connection.execute('DESCRIBE cart');
    finalColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });
    
    await connection.end();
    
    console.log('\n🎉 Cart table structure fixed successfully!');
    console.log('📝 Cart now supports product sizes');
    
  } catch (error) {
    console.error('❌ Error fixing cart table:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the fix
fixCartTable();
