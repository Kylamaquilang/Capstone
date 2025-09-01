import express from 'express';
import { 
  signup, 
  signin, 
  logout, 
  changePassword, 
  refreshToken, 
  updateProfile,
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPasswordWithToken
} from '../controllers/auth.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { pool } from '../database/db.js';

const router = express.Router();

// Test endpoint to debug database
router.get('/test-db', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, name, student_id, LEFT(password, 20) as password_preview, role FROM users LIMIT 5');
    res.json({ 
      message: 'Database connection successful',
      users: users,
      totalUsers: users.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Public routes
router.post('/signup', signup);
router.post('/signin', signin);
router.post('/logout', logout);
router.post('/change-password', changePassword);
router.post('/refresh-token', refreshToken);

// Password reset routes
router.post('/request-reset', requestPasswordReset);
router.post('/verify-code', verifyPasswordResetCode);
router.post('/reset-password', resetPasswordWithToken);

// Protected routes
router.put('/profile', verifyToken, updateProfile);

export default router;