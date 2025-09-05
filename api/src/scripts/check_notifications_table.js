import { pool } from '../database/db.js';

async function checkNotificationsTable() {
  try {
    console.log('🔍 Checking notifications table...');
    
    // Check if table exists
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'notifications'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Notifications table does not exist. Creating it...');
      
      await pool.query(`
        CREATE TABLE notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type ENUM('order', 'payment', 'system', 'general') DEFAULT 'general',
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      console.log('✅ Notifications table created successfully!');
    } else {
      console.log('✅ Notifications table exists');
    }
    
    // Test the table structure
    const [columns] = await pool.query('DESCRIBE notifications');
    console.log('📋 Notifications table structure:');
    console.table(columns);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

checkNotificationsTable();