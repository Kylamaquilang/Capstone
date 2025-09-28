import { pool } from '../database/db.js';

async function testCheckoutQuery() {
  try {
    console.log('🔍 Testing checkout query...');
    
    // Test with NSTP XS size
    const testProduct = {
      product_id: 3,
      size_id: 13
    };
    
    console.log('🧪 Testing with:', testProduct);
    
    const [productData] = await pool.query(`
      SELECT p.id as product_id, p.stock, p.price, ps.id as size_id, ps.stock as size_stock, ps.price as size_price
      FROM products p
      LEFT JOIN product_sizes ps ON p.id = ps.product_id AND ps.id = ?
      WHERE p.id = ?
    `, [testProduct.size_id, testProduct.product_id]);
    
    console.log('📊 Query result:', productData);
    
    if (productData.length === 0) {
      console.log('❌ Product not found - this is the checkout error!');
      
      // Let's debug step by step
      console.log('\n🔍 Debugging step by step:');
      
      // Check if product exists
      const [productCheck] = await pool.query(`
        SELECT id, name, is_active FROM products WHERE id = ?
      `, [testProduct.product_id]);
      
      console.log('📦 Product check:', productCheck);
      
      // Check if size exists
      const [sizeCheck] = await pool.query(`
        SELECT id, size, product_id, is_active FROM product_sizes WHERE id = ?
      `, [testProduct.size_id]);
      
      console.log('📏 Size check:', sizeCheck);
      
      // Check if size belongs to product
      if (sizeCheck.length > 0 && productCheck.length > 0) {
        const [relationCheck] = await pool.query(`
          SELECT ps.id, ps.product_id, p.id as main_product_id
          FROM product_sizes ps
          JOIN products p ON ps.product_id = p.id
          WHERE ps.id = ? AND p.id = ?
        `, [testProduct.size_id, testProduct.product_id]);
        
        console.log('🔗 Relation check:', relationCheck);
      }
      
    } else {
      console.log('✅ Product found successfully');
      const item = productData[0];
      console.log('📦 Product data:', {
        product_id: item.product_id,
        size_id: item.size_id,
        price: item.size_price || item.price,
        stock: item.size_stock || item.stock
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testCheckoutQuery();

