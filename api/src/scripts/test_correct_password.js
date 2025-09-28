import { pool } from '../database/db.js';
import bcrypt from 'bcryptjs';

async function testCorrectPassword() {
  try {
    console.log('🔍 Testing with correct password...');
    
    const testUsers = [
      { student_id: '20220417', expected_password: 'cpc123' },
      { student_id: '20220016', expected_password: 'cpc123' }
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
      
      // Test with correct password
      const isMatch = await bcrypt.compare(testUser.expected_password, user.password);
      console.log(`🔍 Testing "${testUser.expected_password}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
      
      if (isMatch) {
        console.log('🎉 Password verification successful!');
      } else {
        console.log('❌ Password verification failed');
        
        // Let's see what the hash actually contains
        console.log(`🔐 Full hash: ${user.password}`);
        
        // Test with some other common passwords
        const commonPasswords = ['password', '123456', 'admin', 'student', 'CPC123', 'cpc123', 'default'];
        for (const pwd of commonPasswords) {
          const match = await bcrypt.compare(pwd, user.password);
          if (match) {
            console.log(`🎯 Found correct password: "${pwd}"`);
            break;
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testCorrectPassword();

