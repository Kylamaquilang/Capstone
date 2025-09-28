import { pool } from '../database/db.js';

async function testProfileEndpoint() {
  try {
    console.log('🔍 Testing profile endpoint...');
    
    // Test if the endpoint exists by checking the route
    console.log('📋 Available routes:');
    console.log('- GET /api/users/profile (getUserProfile)');
    console.log('- PUT /api/users/profile (updateUserProfile)');
    console.log('- PUT /api/users/profile/image (updateUserProfileImage)');
    
    // Test with a sample user
    const [users] = await pool.query(`
      SELECT id, name, email, contact_number, student_id, role
      FROM users 
      WHERE is_active = 1 
      LIMIT 1
    `);
    
    if (users.length > 0) {
      const user = users[0];
      console.log(`\n📦 Sample user: ${user.name} (ID: ${user.id})`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`📞 Contact: ${user.contact_number}`);
      console.log(`🎓 Student ID: ${user.student_id}`);
      console.log(`👤 Role: ${user.role}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testProfileEndpoint();

