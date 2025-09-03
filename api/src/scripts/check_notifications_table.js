import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'capstone',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
};

async function checkNotificationsTable() {
  let connection;
  
  try {
    console.log('🔍 Checking notifications table...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to capstone database');
    
    // Check if notifications table exists
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'capstone' AND table_name = 'notifications'
    `);
    
    if (tables.length > 0) {
      console.log('✅ Notifications table exists');
      
      // Check notifications table structure
      console.log('\n📋 Notifications table structure:');
      const [columns] = await connection.execute('DESCRIBE notifications');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
      
      // Check existing notifications
      console.log('\n🔔 Existing notifications:');
      const [notifications] = await connection.execute('SELECT * FROM notifications LIMIT 5');
      console.log(`Found ${notifications.length} notifications:`);
      notifications.forEach(notification => {
        console.log(`   - ID: ${notification.id}, User: ${notification.user_id}, Title: ${notification.title}, Read: ${notification.is_read}`);
      });
    } else {
      console.log('❌ Notifications table does not exist');
      console.log('💡 Creating notifications table...');
      
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type ENUM('order', 'payment', 'system', 'promo') DEFAULT 'system',
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_read (user_id, is_read),
          INDEX idx_created_at (created_at)
        )
      `);
      console.log('✅ Created notifications table');
    }
    
    await connection.end();
    console.log('\n✅ Notifications table check completed!');
    
  } catch (error) {
    console.error('❌ Error checking notifications table:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the check
checkNotificationsTable();
