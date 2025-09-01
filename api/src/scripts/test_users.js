import dotenv from 'dotenv';
import { pool } from '../database/db.js';

dotenv.config();

async function testUsers() {
  try {
    console.log('🔍 Testing database users...');
    
    // Test database connection
    const [rows] = await pool.query('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
    // Get all users
    const [users] = await pool.query(`
      SELECT id, name, student_id, email, role, is_active, 
             LEFT(password, 20) as password_preview
      FROM users 
      ORDER BY id
    `);
    
    console.log(`📊 Found ${users.length} users in database:`);
    console.table(users);
    
    // Test specific queries
    console.log('\n🔍 Testing specific queries:');
    
    // Test admin@cpc.edu
    const [adminUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      ['admin@cpc.edu']
    );
    console.log('Admins with email admin@cpc.edu:', adminUsers.length);
    
    // Test student_id field
    const [studentUsers] = await pool.query(
      'SELECT * FROM users WHERE student_id = ?',
      ['admin@cpc.edu']
    );
    console.log('Users with student_id admin@cpc.edu:', studentUsers.length);
    
    // Check for any users with @ in student_id
    const [emailInStudentId] = await pool.query(
      'SELECT * FROM users WHERE student_id LIKE ?',
      ['%@%']
    );
    console.log('Users with @ in student_id:', emailInStudentId.length);
    
  } catch (error) {
    console.error('❌ Error testing users:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the test
testUsers();




