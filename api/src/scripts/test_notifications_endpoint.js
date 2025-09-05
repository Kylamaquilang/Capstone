import { pool } from '../database/db.js';

async function testNotificationsEndpoint() {
  try {
    console.log('🧪 Testing notifications endpoint...');
    
    // Check if there are any notifications in the database
    const [notifications] = await pool.query(`
      SELECT n.*, u.name as user_name 
      FROM notifications n 
      LEFT JOIN users u ON n.user_id = u.id 
      LIMIT 5
    `);
    
    console.log('📋 Sample notifications:');
    console.table(notifications);
    
    if (notifications.length === 0) {
      console.log('ℹ️  No notifications found. Creating a test notification...');
      
      // Get a user to create a test notification for
      const [users] = await pool.query('SELECT id FROM users LIMIT 1');
      
      if (users.length > 0) {
        await pool.query(`
          INSERT INTO notifications (user_id, message, type, is_read) 
          VALUES (?, ?, ?, ?)
        `, [users[0].id, 'Welcome to CPC Essen! This is a test notification.', 'system', false]);
        
        console.log('✅ Test notification created successfully!');
      } else {
        console.log('⚠️  No users found to create test notification');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

testNotificationsEndpoint();

