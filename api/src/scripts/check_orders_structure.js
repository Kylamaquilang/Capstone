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

async function checkOrdersStructure() {
  let connection;
  
  try {
    console.log('🔍 Checking orders table structure...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to capstone database');
    
    // Check orders table structure
    console.log('\n📋 Orders table structure:');
    const [orderColumns] = await connection.execute('DESCRIBE orders');
    orderColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check order_items table structure
    console.log('\n📦 Order_items table structure:');
    const [orderItemColumns] = await connection.execute('DESCRIBE order_items');
    orderItemColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check if there are any existing orders
    console.log('\n📋 Existing orders:');
    const [orders] = await connection.execute('SELECT * FROM orders LIMIT 3');
    console.log(`Found ${orders.length} orders:`);
    orders.forEach(order => {
      console.log(`   - ID: ${order.id}, User: ${order.user_id}, Total: ${order.total_amount}, Payment: ${order.payment_method}`);
    });
    
    // Check if there are any existing order items
    console.log('\n📦 Existing order items:');
    const [orderItems] = await connection.execute('SELECT * FROM order_items LIMIT 3');
    console.log(`Found ${orderItems.length} order items:`);
    orderItems.forEach(item => {
      console.log(`   - Order: ${item.order_id}, Product: ${item.product_id}, Quantity: ${item.quantity}, Price: ${item.price}`);
    });
    
    await connection.end();
    console.log('\n✅ Orders structure check completed!');
    
  } catch (error) {
    console.error('❌ Error checking orders structure:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the check
checkOrdersStructure();
