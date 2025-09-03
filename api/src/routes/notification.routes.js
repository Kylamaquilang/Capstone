import express from 'express';
import {
  getUnreadCount,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification
} from '../controllers/notification.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get unread notification count (for navbar badge)
router.get('/unread-count', verifyToken, getUnreadCount);

// Get all notifications for user
router.get('/', verifyToken, getNotifications);

// Mark notification as read
router.put('/:id/read', verifyToken, markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', verifyToken, markAllAsRead);

// Delete notification
router.delete('/:id', verifyToken, deleteNotification);

// Create notification (for system use)
router.post('/', verifyToken, createNotification);

export default router;
