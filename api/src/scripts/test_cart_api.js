import axios from 'axios';

async function testCartAPI() {
  try {
    console.log('🧪 Testing cart API...');
    
    // Test data for a product with NONE size
    const cartData = {
      product_id: 4, // TELA UPPER product
      quantity: 1,
      size_id: 7 // NONE size
    };
    
    console.log('📦 Sending cart data:', cartData);
    
    // Make the request
    const response = await axios.post('http://localhost:5000/api/cart', cartData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth, but we can see the request
      }
    });
    
    console.log('✅ Success:', response.data);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data);
    console.log('Full error:', error.message);
  }
}

testCartAPI();

