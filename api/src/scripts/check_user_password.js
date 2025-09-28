import { pool } from '../database/db.js';
import bcrypt from 'bcryptjs';

async function checkUserPassword() {
  try {
    console.log('🔍 Checking user passwords...');
    
    // Check specific users from the logs
    const testUsers = [
      { student_id: '20220417', expected_password: 'CPC123' },
      { student_id: '20220016', expected_password: 'CPC123' }
    ];
    
    for (const testUser of testUsers) {
      console.log(`\n📦 Testing user: ${testUser.student_id}`);
      
      const [users] = await pool.query(`
        SELECT id, name, student_id, password, role
        FROM users 
        WHERE student_id = ?
      `, [testUser.student_id]);
      
      if (users.length === 0) {
        console.log('❌ User not found');
        continue;
      }
      
      const user = users[0];
      console.log(`✅ User found: ${user.name} (ID: ${user.id})`);
      console.log(`🔐 Stored hash: ${user.password.substring(0, 30)}...`);
      
      // Test password verification
      const testPasswords = [
        testUser.expected_password,
        `"${testUser.expected_password}"`,
        testUser.expected_password.trim(),
        `"${testUser.expected_password.trim()}"`
      ];
      
      for (const testPassword of testPasswords) {
        const isMatch = await bcrypt.compare(testPassword, user.password);
        console.log(`🔍 Testing "${testPassword}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
      }
    }
    
    // Also check what the default password should be
    console.log('\n🔍 Default password info:');
    console.log(`DEFAULT_STUDENT_PASSWORD: ${process.env.DEFAULT_STUDENT_PASSWORD || 'cpc123'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUserPassword();

