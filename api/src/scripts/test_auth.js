import API from '../lib/axios.js';

// Test configuration
const TEST_USER = {
  email: 'test@example.com',
  password: 'test123'
};

async function testAuth() {
  try {
    console.log('🧪 Testing Authentication System...');
    
    // Test 1: Login
    console.log('\n📝 Test 1: Testing login...');
    try {
      const loginResponse = await API.post('/auth/signin', {
        email: 'admin@cpc.edu.ph',
        password: 'admin123'
      });
      console.log('✅ Login successful:', loginResponse.data.user.name);
      
      // Store token for subsequent requests
      const token = loginResponse.data.token;
      localStorage.setItem('token', token);
      
      // Test 2: Get user profile
      console.log('\n📋 Test 2: Getting user profile...');
      try {
        const profileResponse = await API.get('/users/profile');
        console.log('✅ Profile retrieved successfully:', profileResponse.data.user.name);
      } catch (error) {
        console.log('❌ Failed to get profile:', error.response?.data?.error || error.message);
      }
      
      // Test 3: Get all users (admin only)
      console.log('\n👥 Test 3: Getting all users...');
      try {
        const usersResponse = await API.get('/users/all');
        console.log('✅ Users retrieved successfully:', usersResponse.data.users?.length || 0, 'users');
      } catch (error) {
        console.log('❌ Failed to get users:', error.response?.data?.error || error.message);
      }
      
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.error || error.message);
    }
    
    console.log('\n🎉 Authentication tests completed!');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the test
testAuth();
