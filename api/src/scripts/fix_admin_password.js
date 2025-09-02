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

async function fixAdminPassword() {
  let connection;
  
  try {
    console.log('🔧 Fixing admin password...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to capstone_db database');
    
    // Hash the password "admin123"
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    console.log('🔐 Password hashed successfully');
    
    // Update admin user password
    await connection.execute(
      'UPDATE users SET password = ? WHERE email = ? AND role = ?',
      [hashedPassword, 'admin@cpc.edu.ph', 'admin']
    );
    
    console.log('✅ Admin password updated successfully');
    console.log('📝 Login credentials:');
    console.log('   Email: admin@cpc.edu.ph');
    console.log('   Password: admin123');
    
    // Verify the update
    const [users] = await connection.execute(
      'SELECT id, name, email, role FROM users WHERE email = ?',
      ['admin@cpc.edu.ph']
    );
    
    if (users.length > 0) {
      console.log('✅ Admin user verified:', users[0]);
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error fixing admin password:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the fix
fixAdminPassword();
