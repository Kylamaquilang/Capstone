import API from '../lib/axios.js';

// Test configuration
const TEST_STUDENT = {
  first_name: 'Test',
  last_name: 'Student',
  middle_name: 'Middle',
  suffix: 'Jr.',
  email: 'test.student@example.com',
  degree: 'BSIT',
  status: 'regular'
};

async function testStudentAPI() {
  try {
    console.log('🧪 Testing Student Management API...');
    
    // Test 1: Add a single student
    console.log('\n📝 Test 1: Adding a single student...');
    try {
      const response = await API.post('/students/add', TEST_STUDENT);
      console.log('✅ Student added successfully:', response.data);
    } catch (error) {
      console.log('❌ Failed to add student:', error.response?.data?.error || error.message);
    }
    
    // Test 2: Get all students
    console.log('\n📋 Test 2: Getting all students...');
    try {
      const response = await API.get('/students/all');
      console.log('✅ Students retrieved successfully:', response.data.students?.length || 0, 'students');
    } catch (error) {
      console.log('❌ Failed to get students:', error.response?.data?.error || error.message);
    }
    
    console.log('\n🎉 Student API tests completed!');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the test
testStudentAPI();
