import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'capstone',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
};

async function checkCartItemsStructure() {
  let connection;
  
  try {
    console.log('🔍 Checking cart_items table structure...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to capstone database');
    
    // Check cart_items table structure
    console.log('\n📋 Cart_items table structure:');
    const [cartColumns] = await connection.execute('DESCRIBE cart_items');
    cartColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check if there are any existing cart items
    console.log('\n🛒 Existing cart items:');
    const [cartItems] = await connection.execute('SELECT * FROM cart_items LIMIT 5');
    console.log(`Found ${cartItems.length} cart items:`);
    cartItems.forEach(item => {
      console.log(`   - ID: ${item.id}, User: ${item.user_id}, Product: ${item.product_id}, Size: ${item.size_id || 'N/A'}, Quantity: ${item.quantity}`);
    });
    
    // Check products table structure
    console.log('\n📦 Products table structure:');
    const [productColumns] = await connection.execute('DESCRIBE products');
    productColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check product_sizes table structure
    console.log('\n👕 Product_sizes table structure:');
    const [sizeColumns] = await connection.execute('DESCRIBE product_sizes');
    sizeColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });
    
    await connection.end();
    console.log('\n✅ Cart items structure check completed!');
    
  } catch (error) {
    console.error('❌ Error checking cart items structure:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the check
checkCartItemsStructure();
