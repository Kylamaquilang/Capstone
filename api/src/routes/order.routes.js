import express from 'express'
import {
  getUserOrders,
  getAllOrders,
  getOrderItems,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
  getSalesPerformance,
  confirmOrderReceipt,
  userConfirmOrderReceipt
} from '../controllers/order.controller.js'
import { verifyToken, isAdmin } from '../middleware/verifyToken.js'

const router = express.Router()
router.get('/student', verifyToken, getUserOrders)
router.get('/admin', verifyToken, isAdmin, getAllOrders)
router.get('/:id', verifyToken, isAdmin, getOrderById)

router.get('/:id/items', verifyToken, getOrderItems)
router.patch('/:id/status', verifyToken, isAdmin, updateOrderStatus)
router.post('/:id/confirm-receipt', verifyToken, isAdmin, confirmOrderReceipt)
router.post('/:id/user-confirm', verifyToken, userConfirmOrderReceipt)

// Analytics and reporting routes
router.get('/stats', verifyToken, isAdmin, getOrderStats)
router.get('/sales-performance', verifyToken, isAdmin, getSalesPerformance)

// Public sales data endpoint for testing (remove in production)
router.get('/sales-performance/public', getSalesPerformance)

export default router
