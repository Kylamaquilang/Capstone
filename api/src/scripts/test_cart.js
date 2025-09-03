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

async function testCart() {
  let connection;
  
  try {
    console.log('🧪 Testing cart functionality...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Test 1: Check cart table structure
    console.log('\n📋 Testing cart table structure...');
    const [cartColumns] = await connection.execute('DESCRIBE cart');
    console.log('Cart table columns:');
    cartColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type}`);
    });

    // Test 2: Check if there are any products
    console.log('\n📦 Testing products availability...');
    const [products] = await connection.execute('SELECT id, name, stock FROM products LIMIT 3');
    console.log(`Found ${products.length} products:`);
    products.forEach(product => {
      console.log(`   - ID: ${product.id}, Name: ${product.name}, Stock: ${product.stock}`);
    });

    // Test 3: Check if there are any product sizes
    console.log('\n👕 Testing product sizes availability...');
    const [sizes] = await connection.execute('SELECT id, product_id, size, stock FROM product_sizes LIMIT 3');
    console.log(`Found ${sizes.length} product sizes:`);
    sizes.forEach(size => {
      console.log(`   - ID: ${size.id}, Product: ${size.product_id}, Size: ${size.size}, Stock: ${size.stock}`);
    });

    // Test 4: Check if there are any users
    console.log('\n👤 Testing users availability...');
    const [users] = await connection.execute('SELECT id, name, email FROM users LIMIT 3');
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
    });

    // Test 5: Check cart items (if any)
    console.log('\n🛒 Testing cart items...');
    const [cartItems] = await connection.execute('SELECT * FROM cart LIMIT 3');
    console.log(`Found ${cartItems.length} cart items:`);
    cartItems.forEach(item => {
      console.log(`   - ID: ${item.id}, User: ${item.user_id}, Product: ${item.product_id}, Quantity: ${item.quantity}`);
    });

    console.log('\n✅ Cart functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ Cart test failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the test
if (process.env.NODE_ENV !== 'test') {
  testCart()
    .then(() => {
      console.log('🎉 Cart test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cart test failed:', error.message);
      process.exit(1);
    });
}

export default testCart;
