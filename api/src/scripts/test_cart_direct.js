import { pool } from '../database/db.js';

async function testCartDirect() {
  try {
    console.log('🧪 Testing cart logic directly...');
    
    // Simulate the exact request that's failing
    const product_id = 4;
    const quantity = 1;
    const size_id = 7;
    const user_id = 4; // Assuming user ID 4
    
    console.log('📦 Test data:', { product_id, quantity, size_id, user_id });
    
    // Test the stock query
    const stockQuery = `
      SELECT ps.stock, ps.price, p.name, p.image 
      FROM product_sizes ps 
      JOIN products p ON ps.product_id = p.id 
      WHERE ps.id = ? AND ps.product_id = ?
    `;
    const stockParams = [size_id, product_id];
    
    console.log('🔍 Running stock query...');
    const [stockRows] = await pool.query(stockQuery, stockParams);
    console.log('📊 Stock query result:', stockRows);
    
    if (stockRows.length === 0) {
      console.log('❌ No stock rows found - this is the problem!');
      return;
    }
    
    const productInfo = stockRows[0];
    const availableStock = productInfo.stock;
    
    console.log('📦 Available stock:', availableStock, 'Requested quantity:', quantity);
    
    if (availableStock < quantity) {
      console.log('❌ Insufficient stock');
      return;
    }
    
    // Test existing cart check
    const [existing] = await pool.query(
      `SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND size_id = ?`,
      [user_id, product_id, size_id || null]
    );
    
    console.log('🛒 Existing cart items:', existing);
    
    const currentQty = existing.length > 0 ? existing[0].quantity : 0;
    const newQty = currentQty + quantity;
    
    console.log('📊 Current qty:', currentQty, 'New qty:', newQty, 'Available:', availableStock);
    
    if (newQty > availableStock) {
      console.log('❌ New quantity exceeds available stock');
      console.log('This is why the cart request is failing!');
    } else {
      console.log('✅ Cart request should succeed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testCartDirect();

