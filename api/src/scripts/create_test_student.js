import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  database: 'capstone_db',
  charset: 'utf8mb4',
};

async function createTestStudent() {
  let connection;
  
  try {
    console.log('🔧 Creating test student user...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to capstone_db database');
    
    // Check if test student already exists
    const [existing] = await connection.execute(
      'SELECT * FROM users WHERE student_id = ?',
      ['2021-0001']
    );
    
    if (existing.length > 0) {
      console.log('✅ Test student already exists');
      console.log('📝 Login credentials:');
      console.log('   Student ID: 2021-0001');
      console.log('   Password: cpc123');
      return;
    }
    
    // Hash the password "cpc123"
    const password = 'cpc123';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    console.log('🔐 Password hashed successfully');
    
    // Create test student user
    await connection.execute(
      'INSERT INTO users (student_id, name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      ['2021-0001', 'Test Student', 'student@test.com', hashedPassword, 'student', 1]
    );
    
    console.log('✅ Test student created successfully');
    console.log('📝 Login credentials:');
    console.log('   Student ID: 2021-0001');
    console.log('   Password: cpc123');
    
    // Verify the creation
    const [users] = await connection.execute(
      'SELECT id, name, student_id, role FROM users WHERE student_id = ?',
      ['2021-0001']
    );
    
    if (users.length > 0) {
      console.log('✅ Test student verified:', users[0]);
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error creating test student:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the creation
createTestStudent();
