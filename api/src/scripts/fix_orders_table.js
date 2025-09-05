import { pool } from '../database/db.js';

async function checkOrdersTable() {
  try {
    console.log('🔍 Checking orders table structure...');
    
    const [rows] = await pool.query('DESCRIBE orders');
    console.log('\n📋 Orders table columns:');
    console.table(rows);
    
    // Check if pay_at_counter exists
    const hasPayAtCounter = rows.some(row => row.Field === 'pay_at_counter');
    console.log(`\n❓ pay_at_counter column exists: ${hasPayAtCounter ? '✅ YES' : '❌ NO'}`);
    
    if (!hasPayAtCounter) {
      console.log('\n🔧 Adding pay_at_counter column...');
      await pool.query('ALTER TABLE orders ADD COLUMN pay_at_counter BOOLEAN DEFAULT FALSE');
      console.log('✅ pay_at_counter column added successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

checkOrdersTable();
