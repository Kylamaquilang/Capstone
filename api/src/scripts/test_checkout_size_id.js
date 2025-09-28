import { pool } from '../database/db.js';

async function testCheckoutWithSizeId() {
  try {
    console.log('🔍 Testing checkout with size_id only...');
    
    // Test the exact query from checkout controller
    const size_id = 7;
    const product_id = null; // This is what's happening - product_id is null
    
    console.log('🧪 Testing with:', { size_id, product_id });
    
    const [productData] = await pool.query(`
      SELECT p.id as product_id, p.stock, p.price, ps.id as size_id, ps.stock as size_stock, ps.price as size_price
      FROM products p
      LEFT JOIN product_sizes ps ON p.id = ps.product_id AND ps.id = ?
      WHERE p.id = ?
    `, [size_id, product_id]);
    
    console.log('📊 Query result with null product_id:', productData);
    
    // Test with correct product_id
    const correct_product_id = 4; // TELA UPPER
    console.log('\n🧪 Testing with correct product_id:', { size_id, product_id: correct_product_id });
    
    const [correctData] = await pool.query(`
      SELECT p.id as product_id, p.stock, p.price, ps.id as size_id, ps.stock as size_stock, ps.price as size_price
      FROM products p
      LEFT JOIN product_sizes ps ON p.id = ps.product_id AND ps.id = ?
      WHERE p.id = ?
    `, [size_id, correct_product_id]);
    
    console.log('📊 Query result with correct product_id:', correctData);
    
    // Find which product has size_id 7
    const [sizeInfo] = await pool.query(`
      SELECT ps.id, ps.size, ps.product_id, p.name
      FROM product_sizes ps
      JOIN products p ON ps.product_id = p.id
      WHERE ps.id = ?
    `, [size_id]);
    
    console.log('📏 Size info for size_id 7:', sizeInfo);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testCheckoutWithSizeId();

