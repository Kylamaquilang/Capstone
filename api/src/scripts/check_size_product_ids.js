import { pool } from '../database/db.js';

async function checkSizeProductIds() {
  try {
    console.log('🔍 Checking size product IDs...');
    
    // Get all product sizes
    const [sizes] = await pool.query(`
      SELECT 
        ps.id as size_id,
        ps.size,
        ps.product_id,
        p.name as product_name
      FROM product_sizes ps
      JOIN products p ON ps.product_id = p.id
      WHERE ps.is_active = 1 AND p.is_active = 1
      ORDER BY p.name, ps.size
    `);
    
    console.log(`📊 Found ${sizes.length} active sizes`);
    
    sizes.forEach(size => {
      console.log(`📦 ${size.product_name} - ${size.size}: Size ID ${size.size_id}, Product ID ${size.product_id}`);
    });
    
    // Check for any inconsistencies
    const productGroups = {};
    sizes.forEach(size => {
      if (!productGroups[size.product_name]) {
        productGroups[size.product_name] = [];
      }
      productGroups[size.product_name].push(size.product_id);
    });
    
    console.log('\n🔍 Product ID consistency check:');
    Object.entries(productGroups).forEach(([productName, productIds]) => {
      const uniqueIds = [...new Set(productIds)];
      if (uniqueIds.length > 1) {
        console.log(`❌ ${productName}: Multiple product IDs found: ${uniqueIds.join(', ')}`);
      } else {
        console.log(`✅ ${productName}: Consistent product ID ${uniqueIds[0]}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkSizeProductIds();

