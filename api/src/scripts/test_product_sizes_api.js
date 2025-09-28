import { pool } from '../database/db.js';

async function testProductSizesAPI() {
  try {
    console.log('🔍 Testing product sizes API response...');
    
    // Test the getAllProductsSimple endpoint logic
    const [products] = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.image,
        p.category_id,
        p.stock,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM products p
      WHERE p.is_active = 1 AND p.deleted_at IS NULL
      ORDER BY p.name
    `);
    
    console.log(`📊 Found ${products.length} products`);
    
    // For each product, get its sizes
    for (const product of products) {
      console.log(`\n📦 Product: ${product.name} (ID: ${product.id})`);
      
      const [sizes] = await pool.query(`
        SELECT 
          ps.id,
          ps.size,
          ps.stock,
          ps.price,
          ps.product_id,
          ps.is_active
        FROM product_sizes ps
        WHERE ps.product_id = ? AND ps.is_active = 1
        ORDER BY 
          CASE ps.size
            WHEN 'NONE' THEN 0
            WHEN 'XS' THEN 1
            WHEN 'S' THEN 2
            WHEN 'M' THEN 3
            WHEN 'L' THEN 4
            WHEN 'XL' THEN 5
            WHEN 'XXL' THEN 6
            ELSE 7
          END
      `, [product.id]);
      
      console.log(`  📏 Sizes (${sizes.length}):`);
      sizes.forEach(size => {
        console.log(`    - ${size.size}: Stock ${size.stock}, Price ${size.price}, ID ${size.id}, Product ID ${size.product_id}`);
      });
      
      // Simulate the API response structure
      const productWithSizes = {
        ...product,
        sizes: sizes.map(size => ({
          id: size.id,
          size: size.size,
          stock: size.stock,
          price: size.price,
          product_id: size.product_id
        }))
      };
      
      console.log(`  🔍 API Response structure:`);
      console.log(`    - Product ID: ${productWithSizes.id}`);
      console.log(`    - Sizes: ${productWithSizes.sizes.map(s => `${s.size}(${s.id})`).join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testProductSizesAPI();
