import { pool } from '../database/db.js';

async function testPaymentFunctionality() {
  try {
    console.log('🧪 Testing payment functionality...');
    
    // Check if we have any orders to test with
    const [orders] = await pool.query(`
      SELECT o.*, u.name as user_name 
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      WHERE o.payment_status = 'unpaid' 
      LIMIT 1
    `);
    
    if (orders.length === 0) {
      console.log('ℹ️  No unpaid orders found. Creating a test order...');
      
      // Get a user to create a test order for
      const [users] = await pool.query('SELECT id FROM users LIMIT 1');
      
      if (users.length > 0) {
        const [orderResult] = await pool.query(`
          INSERT INTO orders (user_id, total_amount, payment_method, payment_status, status) 
          VALUES (?, ?, ?, ?, ?)
        `, [users[0].id, 100.00, 'gcash', 'unpaid', 'pending']);
        
        console.log('✅ Test order created with ID:', orderResult.insertId);
      } else {
        console.log('⚠️  No users found to create test order');
      }
    } else {
      console.log('📋 Found unpaid order:');
      console.table(orders);
    }
    
    // Check payment_transactions table
    const [transactions] = await pool.query(`
      SELECT pt.*, o.id as order_id 
      FROM payment_transactions pt 
      LEFT JOIN orders o ON pt.order_id = o.id 
      LIMIT 3
    `);
    
    console.log('📋 Recent payment transactions:');
    console.table(transactions);
    
    console.log('✅ Payment functionality test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

testPaymentFunctionality();



