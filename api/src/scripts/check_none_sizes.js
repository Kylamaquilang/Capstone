import { pool } from '../database/db.js';

async function checkNoneSizes() {
  try {
    console.log('🔍 Checking products with NONE sizes...');
    
    // Get all products with NONE sizes
    const [products] = await pool.query(`
      SELECT p.id, p.name, p.stock as product_stock, ps.id as size_id, ps.size, ps.stock as size_stock, ps.price as size_price
      FROM products p
      LEFT JOIN product_sizes ps ON p.id = ps.product_id
      WHERE ps.size = 'NONE' AND ps.is_active = 1
      ORDER BY p.id
    `);
    
    console.log(`Found ${products.length} products with NONE sizes:`);
    products.forEach(product => {
      console.log(`- Product: ${product.name} (ID: ${product.id})`);
      console.log(`  Product Stock: ${product.product_stock}`);
      console.log(`  Size: ${product.size} (ID: ${product.size_id})`);
      console.log(`  Size Stock: ${product.size_stock}`);
      console.log(`  Size Price: ${product.size_price}`);
      console.log('');
    });
    
    // Check if any NONE sizes have 0 stock
    const zeroStockSizes = products.filter(p => p.size_stock === 0);
    if (zeroStockSizes.length > 0) {
      console.log(`⚠️  Found ${zeroStockSizes.length} NONE sizes with 0 stock:`);
      zeroStockSizes.forEach(product => {
        console.log(`- ${product.name}: Size stock = ${product.size_stock}, Product stock = ${product.product_stock}`);
      });
    } else {
      console.log('✅ All NONE sizes have stock > 0');
    }
    
  } catch (error) {
    console.error('Error checking NONE sizes:', error);
  } finally {
    process.exit(0);
  }
}

checkNoneSizes();

