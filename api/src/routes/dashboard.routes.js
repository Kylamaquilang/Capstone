import express from 'express';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// ✅ Route for admin access only
router.get('/admin', verifyToken, isAdmin, (req, res) => {
  res.status(200).json({
    message: 'Welcome to the Admin Dashboard',
    user: req.user,
  });
});

// ✅ Route for any logged-in user
router.get('/user', verifyToken, (req, res) => {
  res.status(200).json({
    message: 'Welcome to the User Dashboard',
    user: req.user,
  });
});

export default router;
