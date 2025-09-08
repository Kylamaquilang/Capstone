import { pool } from '../database/db.js';

// ✅ Get unread notification count
export const getUnreadCount = async (req, res) => {
  const user_id = req.user.id;

  try {
    const [result] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = ? AND (is_read = 0 OR is_read IS NULL)
    `, [user_id]);

    res.json({
      success: true,
      count: result[0].count
    });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to get notification count'
    });
  }
};

// ✅ Get all notifications for user
export const getNotifications = async (req, res) => {
  const user_id = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  try {
    const offset = (page - 1) * limit;
    
    const [notifications] = await pool.query(`
      SELECT id, title, message, type, is_read, created_at
      FROM notifications 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [user_id, parseInt(limit), offset]);

    const [totalResult] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM notifications 
      WHERE user_id = ?
    `, [user_id]);

    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult[0].total,
        totalPages: Math.ceil(totalResult[0].total / limit)
      }
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to get notifications'
    });
  }
};

// ✅ Mark notification as read
export const markAsRead = async (req, res) => {
  const user_id = req.user.id;
  const { id } = req.params;

  try {
    const [result] = await pool.query(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE id = ? AND user_id = ?
    `, [id, user_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Notification not found',
        message: 'Notification not found or does not belong to you'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to mark notification as read'
    });
  }
};

// ✅ Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  const user_id = req.user.id;

  try {
    await pool.query(`
      UPDATE notifications 
      SET is_read = 1 
      WHERE user_id = ?
    `, [user_id]);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to mark all notifications as read'
    });
  }
};

// ✅ Delete notification
export const deleteNotification = async (req, res) => {
  const user_id = req.user.id;
  const { id } = req.params;

  try {
    const [result] = await pool.query(`
      DELETE FROM notifications 
      WHERE id = ? AND user_id = ?
    `, [id, user_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Notification not found',
        message: 'Notification not found or does not belong to you'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to delete notification'
    });
  }
};

// ✅ Create notification (for system use)
export const createNotification = async (req, res) => {
  const { user_id, message } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'User ID and message are required'
    });
  }

  try {
    await pool.query(`
      INSERT INTO notifications (user_id, message) 
      VALUES (?, ?)
    `, [user_id, message]);

    res.status(201).json({
      success: true,
      message: 'Notification created successfully'
    });
  } catch (err) {
    console.error('Create notification error:', err);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create notification'
    });
  }
};
