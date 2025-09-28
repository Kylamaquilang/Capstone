import { pool } from '../database/db.js';

async function checkAllProductSizes() {
  try {
    console.log('🔍 Checking all product sizes...');
    
    // Get all products with their sizes
    const [products] = await pool.query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        ps.id as size_id,
        ps.size,
        ps.stock,
        ps.price,
        ps.is_active
      FROM products p
      LEFT JOIN product_sizes ps ON p.id = ps.product_id
      WHERE p.is_active = 1 AND p.deleted_at IS NULL
      ORDER BY p.name, ps.size
    `);
    
    console.log(`📊 Found ${products.length} product-size combinations`);
    
    // Group by product
    const productGroups = {};
    products.forEach(row => {
      if (!productGroups[row.product_name]) {
        productGroups[row.product_name] = [];
      }
      productGroups[row.product_name].push({
        size_id: row.size_id,
        size: row.size,
        stock: row.stock,
        price: row.price,
        is_active: row.is_active
      });
    });
    
    // Check each product
    for (const [productName, sizes] of Object.entries(productGroups)) {
      console.log(`\n📦 Product: ${productName}`);
      
      if (sizes.length === 0 || sizes.every(s => s.size_id === null)) {
        console.log('  ❌ No sizes found');
        continue;
      }
      
      sizes.forEach(size => {
        if (size.size_id === null) {
          console.log('  ❌ NULL size_id');
          return;
        }
        
        const status = size.is_active ? '✅' : '❌';
        const stockStatus = size.stock > 0 ? '📦' : '⚠️';
        console.log(`  ${status} ${size.size || 'NONE'} - Stock: ${size.stock} - Price: ${size.price} ${stockStatus}`);
        
        // Check for issues
        if (size.stock === 0) {
          console.log(`    ⚠️  Zero stock for size ${size.size}`);
        }
        if (!size.price || size.price === '0.00') {
          console.log(`    ⚠️  Zero price for size ${size.size}`);
        }
        if (!size.is_active) {
          console.log(`    ⚠️  Inactive size ${size.size}`);
        }
      });
    }
    
    // Check for products with no sizes
    const [productsWithoutSizes] = await pool.query(`
      SELECT p.id, p.name
      FROM products p
      LEFT JOIN product_sizes ps ON p.id = ps.product_id
      WHERE p.is_active = 1 AND p.deleted_at IS NULL AND ps.id IS NULL
    `);
    
    if (productsWithoutSizes.length > 0) {
      console.log('\n❌ Products without any sizes:');
      productsWithoutSizes.forEach(product => {
        console.log(`  - ${product.name} (ID: ${product.id})`);
      });
    }
    
    // Check for duplicate sizes
    const [duplicateSizes] = await pool.query(`
      SELECT product_id, size, COUNT(*) as count
      FROM product_sizes
      WHERE is_active = 1
      GROUP BY product_id, size
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateSizes.length > 0) {
      console.log('\n⚠️  Duplicate sizes found:');
      duplicateSizes.forEach(dup => {
        console.log(`  - Product ID ${dup.product_id}, Size: ${dup.size} (${dup.count} times)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAllProductSizes();

