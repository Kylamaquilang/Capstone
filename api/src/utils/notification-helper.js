import { pool } from '../database/db.js';

// ✅ Create notification utility
export const createNotification = async (user_id, message) => {
  try {
    await pool.query(`
      INSERT INTO notifications (user_id, message) 
      VALUES (?, ?)
    `, [user_id, message]);
    
    console.log(`✅ Notification created for user ${user_id}: ${message}`);
  } catch (error) {
    console.error('❌ Error creating notification:', error);
  }
};

// ✅ Create order status notification
export const createOrderStatusNotification = async (user_id, orderId, status) => {
  const statusMessages = {
    'pending': `Your order #${orderId} has been placed and is pending confirmation.`,
    'processing': `Your order #${orderId} is now being processed.`,
    'delivered': `Your order #${orderId} has been delivered successfully!`,
    'cancelled': `Your order #${orderId} has been cancelled.`
  };
  
  const message = statusMessages[status] || `Your order #${orderId} status has been updated to ${status}.`;
  
  await createNotification(user_id, message);
};

// ✅ Create payment notification
export const createPaymentNotification = async (user_id, orderId, paymentStatus) => {
  const paymentMessages = {
    'paid': `Payment for order #${orderId} has been received successfully.`,
    'failed': `Payment for order #${orderId} has failed. Please try again.`,
    'pending': `Payment for order #${orderId} is pending confirmation.`
  };
  
  const message = paymentMessages[paymentStatus] || `Payment status for order #${orderId} has been updated.`;
  
  await createNotification(user_id, message);
};

// ✅ Create low stock notification (for admins)
export const createLowStockNotification = async (productName, currentStock) => {
  try {
    // Get all admin users
    const [admins] = await pool.query(`
      SELECT id FROM users WHERE role = 'admin'
    `);
    
    const message = `Low stock alert: ${productName} has only ${currentStock} items remaining.`;
    
    // Create notification for each admin
    for (const admin of admins) {
      await createNotification(admin.id, message);
    }
  } catch (error) {
    console.error('❌ Error creating low stock notification:', error);
  }
};

// ✅ Create welcome notification
export const createWelcomeNotification = async (user_id, userName) => {
  const message = `Welcome to CPC Store, ${userName}! Thank you for joining us. Start shopping now!`;
  await createNotification(user_id, message);
};

// ✅ Create promotional notification
export const createPromotionalNotification = async (user_id, promoMessage) => {
  await createNotification(user_id, promoMessage);
};
