import mysql from 'mysql2/promise';

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'capstone'
  });

  try {
    console.log('🔍 CHECKING BACKEND DATA FOR RESTOCK OPERATIONS\n');
    console.log('='.repeat(80));
    
    // Get recent restock records with ALL information
    const [restocks] = await conn.query(`
      SELECT 
        sm.id,
        sm.product_id,
        p.name as product_name,
        sm.size_id,
        ps.size as size_name,
        sm.user_id,
        CONCAT(u.first_name, ' ', u.last_name) as admin_name,
        sm.movement_type,
        sm.quantity,
        sm.reason,
        sm.notes,
        sm.previous_stock,
        sm.new_stock,
        sm.created_at
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN product_sizes ps ON sm.size_id = ps.id
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE sm.movement_type = 'stock_in'
      ORDER BY sm.created_at DESC
      LIMIT 5
    `);
    
    if (restocks.length === 0) {
      console.log('❌ No restock records found in the database.\n');
      console.log('💡 Try restocking a product first, then run this script again.');
      return;
    }
    
    console.log(`✅ Found ${restocks.length} recent restock record(s) in backend:\n`);
    
    restocks.forEach((record, index) => {
      console.log(`📦 RESTOCK #${index + 1} (Database ID: ${record.id})`);
      console.log('─'.repeat(80));
      console.log(`   Product:        ${record.product_name} (ID: ${record.product_id})`);
      console.log(`   Size:           ${record.size_name || 'NULL'} (size_id: ${record.size_id || 'NULL'})`);
      console.log(`   Admin:          ${record.admin_name || 'Unknown'} (ID: ${record.user_id})`);
      console.log(`   Quantity:       ${record.quantity} units`);
      console.log(`   Previous Stock: ${record.previous_stock} units`);
      console.log(`   New Stock:      ${record.new_stock} units`);
      console.log(`   Reason:         ${record.reason}`);
      console.log(`   Notes:          ${record.notes || 'None'}`);
      console.log(`   Date/Time:      ${record.created_at}`);
      console.log('');
      
      // Verify if size tracking is working
      if (record.size_id !== null) {
        console.log(`   ✅ SIZE TRACKED: This restock properly recorded size "${record.size_name}"`);
      } else {
        console.log(`   ⚠️  NO SIZE: This restock has NULL size_id (might be old record)`);
      }
      console.log('='.repeat(80));
      console.log('');
    });
    
    // Statistics
    const [stats] = await conn.query(`
      SELECT 
        COUNT(*) as total_restocks,
        SUM(CASE WHEN size_id IS NOT NULL THEN 1 ELSE 0 END) as with_size,
        SUM(CASE WHEN size_id IS NULL THEN 1 ELSE 0 END) as without_size,
        SUM(quantity) as total_quantity_restocked
      FROM stock_movements
      WHERE movement_type = 'stock_in'
    `);
    
    console.log('📊 OVERALL STATISTICS:');
    console.log('─'.repeat(80));
    console.log(`   Total Restock Operations: ${stats[0].total_restocks}`);
    console.log(`   With Size Tracking:       ${stats[0].with_size} (${((stats[0].with_size / stats[0].total_restocks) * 100).toFixed(1)}%)`);
    console.log(`   Without Size Tracking:    ${stats[0].without_size} (${((stats[0].without_size / stats[0].total_restocks) * 100).toFixed(1)}%)`);
    console.log(`   Total Units Restocked:    ${stats[0].total_quantity_restocked}`);
    console.log('='.repeat(80));
    console.log('');
    
    if (stats[0].with_size === 0) {
      console.log('⚠️  WARNING: No restocks have size tracking yet!');
      console.log('');
      console.log('This means either:');
      console.log('  1. You haven\'t restocked any products since applying the fix');
      console.log('  2. The fix hasn\'t been applied yet');
      console.log('  3. Only products without sizes have been restocked');
      console.log('');
      console.log('💡 ACTION: Restart your servers and try restocking a product with sizes.');
    } else {
      console.log('✅ SUCCESS: Size tracking is working! Some restocks have size information.');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await conn.end();
  }
})();


