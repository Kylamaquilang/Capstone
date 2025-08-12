import express from 'express';
import { verifyToken, isAdmin } from '../middleware/auth.middleware.js';
import {
  getAdminDashboard,
  getUserDashboard,
} from '../controllers/dashboard.controller.js';

const router = express.Router();

// Admin dashboard (requires token + admin role)
router.get('/admin', verifyToken, isAdmin, getAdminDashboard);

// Student/user dashboard (requires token)
router.get('/student', verifyToken, getUserDashboard);

export default router;
