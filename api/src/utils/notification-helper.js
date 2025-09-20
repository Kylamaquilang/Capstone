import { pool } from '../database/db.js';

// ✅ Create notification utility
export const createNotification = async (user_id, message, title = null, type = 'system') => {
  try {
    await pool.query(`
      INSERT INTO notifications (user_id, title, message, type) 
      VALUES (?, ?, ?, ?)
    `, [user_id, title, message, type]);
    
    console.log(`✅ Notification created for user ${user_id}: ${message}`);
  } catch (error) {
    console.error('❌ Error creating notification:', error);
  }
};

// ✅ Create order status notification with product details
export const createOrderStatusNotification = async (user_id, orderId, status) => {
  try {
    // Get product details for the order with size information
    const [productInfo] = await pool.query(`
      SELECT p.name, oi.quantity, ps.size as size_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_sizes ps ON oi.size_id = ps.id
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `, [orderId]);
    
    // Create product summary with sizes
    let productSummary = '';
    if (productInfo.length > 0) {
      if (productInfo.length === 1) {
        const item = productInfo[0];
        productSummary = item.size_name 
          ? `${item.quantity}x ${item.name} (${item.size_name})`
          : `${item.quantity}x ${item.name}`;
      } else if (productInfo.length <= 3) {
        productSummary = productInfo.map(item => 
          item.size_name 
            ? `${item.quantity}x ${item.name} (${item.size_name})`
            : `${item.quantity}x ${item.name}`
        ).join(', ');
      } else {
        const firstItem = productInfo[0];
        const firstItemText = firstItem.size_name 
          ? `${firstItem.quantity}x ${firstItem.name} (${firstItem.size_name})`
          : `${firstItem.quantity}x ${firstItem.name}`;
        productSummary = `${firstItemText} and ${productInfo.length - 1} more items`;
      }
    }
    
    const statusData = {
      'pending': {
        title: '📝 Order Placed',
        message: `Your order for ${productSummary} has been placed and is pending confirmation.`
      },
      'processing': {
        title: '✅ Order Received',
        message: `Thank you! Your order for ${productSummary} has been received and is being processed.`
      },
      'ready_for_pickup': {
        title: '📦 Ready for Pickup',
        message: `Your order for ${productSummary} is ready for pickup at the accounting office!`
      },
      'delivered': {
        title: '🎉 Order Delivered',
        message: `Your order for ${productSummary} has been delivered successfully!`
      },
      'cancelled': {
        title: '❌ Order Cancelled',
        message: `Your order for ${productSummary} has been cancelled.`
      }
    };
    
    const data = statusData[status] || {
      title: '📋 Order Update',
      message: `Your order for ${productSummary} status has been updated to ${status}.`
    };
    
    // Create notification with related_id for order tracking
    await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, related_id, created_at) 
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [user_id, data.title, data.message, 'system', orderId]);
  } catch (error) {
    console.error('❌ Error creating order status notification:', error);
    // Fallback to simple notification
    await createNotification(user_id, `Your order #${orderId} status has been updated to ${status}.`, '📋 Order Update', 'system');
  }
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
