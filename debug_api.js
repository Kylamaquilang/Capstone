// Quick Database Diagnostic Tool
// Run this in your browser console or as a separate script

const testEndpoints = async () => {
  const baseUrl = 'http://localhost:5000/api';
  
  console.log('🔍 Testing API endpoints...');
  
  // Test 1: Basic API health
  try {
    const response = await fetch(`${baseUrl}/orders/test-db`);
    const data = await response.json();
    console.log('✅ Database test:', data);
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
  
  // Test 2: Sales performance with minimal params
  try {
    const response = await fetch(`${baseUrl}/orders/sales-performance/public`);
    const data = await response.json();
    console.log('✅ Sales performance (no params):', data);
  } catch (error) {
    console.error('❌ Sales performance failed:', error);
  }
  
  // Test 3: Sales performance with date range
  try {
    const params = new URLSearchParams({
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      group_by: 'day'
    });
    const response = await fetch(`${baseUrl}/orders/sales-performance/public?${params}`);
    const data = await response.json();
    console.log('✅ Sales performance (with params):', data);
  } catch (error) {
    console.error('❌ Sales performance with params failed:', error);
  }
};

// Run the tests
testEndpoints();
