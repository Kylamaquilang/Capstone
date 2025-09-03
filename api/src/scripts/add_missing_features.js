import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'capstone_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,
  charset: 'utf8mb4',
};

async function addMissingFeatures() {
  let connection;
  
  try {
    console.log('🔧 Adding missing features to database...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // 1. Create password_reset_codes table
    console.log('🔧 Creating password_reset_codes table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_codes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ password_reset_codes table created');

    // 2. Add user status management (is_active field already exists, but let's ensure it's properly set)
    console.log('🔧 Checking user status management...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_active'
    `, [process.env.DB_NAME || 'capstone_db']);

    if (columns.length === 0) {
      console.log('🔧 Adding is_active column to users table...');
      await connection.execute(`
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE
      `);
      console.log('✅ is_active column added');
    } else {
      console.log('ℹ️ is_active column already exists');
    }

    // 3. Add profile_image field to users table
    console.log('🔧 Adding profile_image field to users table...');
    const [imageColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_image'
    `, [process.env.DB_NAME || 'capstone_db']);

    if (imageColumns.length === 0) {
      await connection.execute(`
        ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) NULL
      `);
      console.log('✅ profile_image column added');
    } else {
      console.log('ℹ️ profile_image column already exists');
    }

    // 4. Create indexes for better performance
    console.log('🔧 Creating indexes...');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_password_reset_codes_user_id ON password_reset_codes(user_id)');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_password_reset_codes_code ON password_reset_codes(code)');
    await connection.execute('CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires ON password_reset_codes(expires_at)');
    console.log('✅ Indexes created');

    // 5. Set all existing users as active
    console.log('🔧 Setting existing users as active...');
    await connection.execute(`
      UPDATE users SET is_active = 1 WHERE is_active IS NULL
    `);
    console.log('✅ Existing users set as active');

    console.log('✅ All missing features added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding missing features:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the migration
if (process.env.NODE_ENV !== 'test') {
  addMissingFeatures()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    });
}

export default addMissingFeatures;
