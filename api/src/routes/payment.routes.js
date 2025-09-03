import express from 'express';
import {
  createGCashPayment,
  handlePayMongoWebhook,
  getPaymentStatus,
  cancelPayment
} from '../controllers/payment.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// GCash payment routes
router.post('/gcash/create', verifyToken, createGCashPayment);
router.get('/status/:orderId', verifyToken, getPaymentStatus);
router.post('/cancel/:orderId', verifyToken, cancelPayment);

// PayMongo webhook (no authentication needed)
router.post('/webhook/paymongo', handlePayMongoWebhook);

export default router;
