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

async function updateUsersTable() {
  let connection;
  
  try {
    console.log('🔧 Starting users table update...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check if columns already exist
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
    `, [process.env.DB_NAME || 'capstone_db']);

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log('📋 Existing columns:', existingColumns);

    // Add new columns if they don't exist
    const newColumns = [
      { name: 'first_name', type: 'VARCHAR(50)' },
      { name: 'last_name', type: 'VARCHAR(50)' },
      { name: 'middle_name', type: 'VARCHAR(50)' },
      { name: 'suffix', type: 'VARCHAR(20)' },
      { name: 'degree', type: 'VARCHAR(10)' },
      { name: 'status', type: 'VARCHAR(20)' }
    ];

    for (const column of newColumns) {
      if (!existingColumns.includes(column.name)) {
        console.log(`🔧 Adding column: ${column.name}`);
        await connection.execute(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ Added column: ${column.name}`);
      } else {
        console.log(`ℹ️  Column ${column.name} already exists`);
      }
    }

    // Update existing records to populate first_name and last_name from name field
    console.log('🔧 Updating existing records...');
    const [existingUsers] = await connection.execute('SELECT id, name FROM users WHERE first_name IS NULL OR last_name IS NULL');
    
    for (const user of existingUsers) {
      if (user.name) {
        const nameParts = user.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        
        await connection.execute(
          'UPDATE users SET first_name = ?, last_name = ? WHERE id = ?',
          [firstName, lastName, user.id]
        );
      }
    }

    console.log(`✅ Updated ${existingUsers.length} existing records`);

    // Set default values for degree and status for existing students
    console.log('🔧 Setting default values for existing students...');
    await connection.execute(`
      UPDATE users 
      SET degree = 'BSIT', status = 'regular' 
      WHERE role = 'student' AND (degree IS NULL OR status IS NULL)
    `);

    console.log('✅ Users table update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating users table:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the update
if (process.env.NODE_ENV !== 'test') {
  updateUsersTable()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    });
}

export default updateUsersTable;
