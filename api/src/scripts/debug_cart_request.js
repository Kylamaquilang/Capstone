import { pool } from '../database/db.js';

async function debugCartRequest() {
  try {
    console.log('🔍 Debugging cart request for NONE size...');
    
    // Simulate the cart request for product with NONE size
    const size_id = 7; // NONE size ID from previous check
    const product_id = 4; // Product ID from previous check
    const quantity = 1;
    
    console.log(`Testing with size_id: ${size_id}, product_id: ${product_id}, quantity: ${quantity}`);
    
    // Test the exact query from cart controller
    const stockQuery = `
      SELECT ps.stock, ps.price, p.name, p.image 
      FROM product_sizes ps 
      JOIN products p ON ps.product_id = p.id 
      WHERE ps.id = ? AND ps.product_id = ?
    `;
    const stockParams = [size_id, product_id];
    
    console.log('Query:', stockQuery);
    console.log('Params:', stockParams);
    
    const [stockRows] = await pool.query(stockQuery, stockParams);
    
    console.log('Query result:', stockRows);
    
    if (stockRows.length === 0) {
      console.log('❌ No rows returned - this is the problem!');
      
      // Let's check what's actually in the database
      console.log('\n🔍 Checking product_sizes table:');
      const [sizeRows] = await pool.query('SELECT * FROM product_sizes WHERE id = ?', [size_id]);
      console.log('Size row:', sizeRows);
      
      console.log('\n🔍 Checking products table:');
      const [productRows] = await pool.query('SELECT * FROM products WHERE id = ?', [product_id]);
      console.log('Product row:', productRows);
      
    } else {
      const productInfo = stockRows[0];
      console.log('✅ Query successful');
      console.log('Available stock:', productInfo.stock);
      console.log('Price:', productInfo.price);
      console.log('Name:', productInfo.name);
      
      if (productInfo.stock < quantity) {
        console.log(`❌ Insufficient stock: ${productInfo.stock} < ${quantity}`);
      } else {
        console.log(`✅ Sufficient stock: ${productInfo.stock} >= ${quantity}`);
      }
    }
    
  } catch (error) {
    console.error('Error debugging cart request:', error);
  } finally {
    process.exit(0);
  }
}

debugCartRequest();

