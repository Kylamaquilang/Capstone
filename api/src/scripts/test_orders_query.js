import { pool } from '../database/db.js';

async function testOrdersQuery() {
  try {
    console.log('🧪 Testing orders query with pay_at_counter column...');
    
    const [rows] = await pool.query(`
      SELECT id, total_amount, payment_method, pay_at_counter, status, created_at 
      FROM orders 
      LIMIT 1
    `);
    
    console.log('✅ Orders query test successful!');
    console.log('📋 Sample order data:');
    console.table(rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

testOrdersQuery();
