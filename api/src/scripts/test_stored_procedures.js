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
  charset: 'utf8mb4',
};

async function testStoredProcedures() {
  let connection;
  
  try {
    console.log('🚀 Testing stored procedures...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Test 1: User Authentication Stored Procedure
    console.log('\n📋 Test 1: User Authentication');
    try {
      const [result] = await connection.query(
        'CALL sp_authenticate_user(?, ?)',
        ['ADMIN001', 'student_id']
      );
      console.log('✅ sp_authenticate_user works');
      console.log('   Result:', result[0].length > 0 ? 'User found' : 'No user found');
    } catch (error) {
      console.log('❌ sp_authenticate_user failed:', error.message);
    }
    
    // Test 2: User Registration Stored Procedure
    console.log('\n📋 Test 2: User Registration');
    try {
      const [result] = await connection.query(
        'CALL sp_register_user(?, ?, ?, ?, ?, ?, @user_id, @success, @message)',
        ['TEST001', 'test@example.com', 'Test User', 'hashedpassword', 'student', '1234567890']
      );
      
      const [output] = await connection.query('SELECT @user_id as user_id, @success as success, @message as message');
      const { user_id, success, message } = output[0];
      
      console.log('✅ sp_register_user works');
      console.log('   Success:', success);
      console.log('   Message:', message);
      console.log('   User ID:', user_id);
    } catch (error) {
      console.log('❌ sp_register_user failed:', error.message);
    }
    
    // Test 3: Product Creation Stored Procedure
    console.log('\n📋 Test 3: Product Creation');
    try {
      const [result] = await connection.query(
        'CALL sp_create_product(?, ?, ?, ?, ?, ?, @product_id, @success, @message)',
        ['Test Product', 'Test Description', 99.99, 10, 1, null]
      );
      
      const [output] = await connection.query('SELECT @product_id as product_id, @success as success, @message as message');
      const { product_id, success, message } = output[0];
      
      console.log('✅ sp_create_product works');
      console.log('   Success:', success);
      console.log('   Message:', message);
      console.log('   Product ID:', product_id);
    } catch (error) {
      console.log('❌ sp_create_product failed:', error.message);
    }
    
    // Test 4: Order Processing Stored Procedure
    console.log('\n📋 Test 4: Order Processing');
    try {
      const cartItems = JSON.stringify([
        { product_id: 1, quantity: 2, price: 250.00, size_id: null }
      ]);
      
      const [result] = await connection.query(
        'CALL sp_process_order(?, ?, ?, ?, ?, @order_id, @success, @message)',
        [1, 500.00, 'cash', false, cartItems]
      );
      
      const [output] = await connection.query('SELECT @order_id as order_id, @success as success, @message as message');
      const { order_id, success, message } = output[0];
      
      console.log('✅ sp_process_order works');
      console.log('   Success:', success);
      console.log('   Message:', message);
      console.log('   Order ID:', order_id);
    } catch (error) {
      console.log('❌ sp_process_order failed:', error.message);
    }
    
    // Test 5: Order Status Update Stored Procedure
    console.log('\n📋 Test 5: Order Status Update');
    try {
      const [result] = await connection.query(
        'CALL sp_update_order_status(?, ?, ?, ?, @success, @message)',
        [1, 'processing', 'Test status update', 1]
      );
      
      const [output] = await connection.query('SELECT @success as success, @message as message');
      const { success, message } = output[0];
      
      console.log('✅ sp_update_order_status works');
      console.log('   Success:', success);
      console.log('   Message:', message);
    } catch (error) {
      console.log('❌ sp_update_order_status failed:', error.message);
    }
    
    // Test 6: Inventory Management Stored Procedure
    console.log('\n📋 Test 6: Inventory Management');
    try {
      const [result] = await connection.query(
        'CALL sp_update_inventory(?, ?, ?, ?, ?, ?, @success, @message)',
        [1, null, 5, 'purchase', 'Test inventory update', null]
      );
      
      const [output] = await connection.query('SELECT @success as success, @message as message');
      const { success, message } = output[0];
      
      console.log('✅ sp_update_inventory works');
      console.log('   Success:', success);
      console.log('   Message:', message);
    } catch (error) {
      console.log('❌ sp_update_inventory failed:', error.message);
    }
    
    // Test 7: Sales Analytics Stored Procedure
    console.log('\n📋 Test 7: Sales Analytics');
    try {
      const [result] = await connection.query(
        'CALL sp_get_sales_analytics(?, ?, ?)',
        [null, null, 'day']
      );
      
      console.log('✅ sp_get_sales_analytics works');
      console.log('   Records returned:', result[0].length);
    } catch (error) {
      console.log('❌ sp_get_sales_analytics failed:', error.message);
    }
    
    console.log('\n🎉 Stored procedure testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure MySQL server is running');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Check your database credentials in .env file');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the tests
testStoredProcedures();
