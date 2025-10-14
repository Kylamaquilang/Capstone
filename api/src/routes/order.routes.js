import express from 'express'
import {
  getUserOrders,
  getUserOrderDetails,
  getAllOrders,
  getOrderItems,
  getOrderById,
  updateOrderStatus,
  updateOrderPaymentMethod,
  getOrderStats,
  getSalesPerformance,
  confirmOrderReceipt,
  userConfirmOrderReceipt,
  confirmOrderReceiptNotification,
  testNotification,
  getSalesAnalytics,
  confirmOrderReceiptPublic,
  userCancelOrder
} from '../controllers/order.controller.js'
import { verifyToken, isAdmin } from '../middleware/verifyToken.js'

const router = express.Router()
router.get('/student', verifyToken, getUserOrders)
router.get('/user/:id', verifyToken, getUserOrderDetails)
router.get('/admin', verifyToken, isAdmin, getAllOrders)
router.get('/:id', verifyToken, isAdmin, getOrderById)

router.get('/:id/items', verifyToken, getOrderItems)
router.patch('/:id/status', verifyToken, isAdmin, updateOrderStatus)
router.patch('/:id/payment-method', verifyToken, isAdmin, updateOrderPaymentMethod)
router.post('/:id/confirm-receipt', verifyToken, isAdmin, confirmOrderReceipt)
router.post('/:id/user-confirm', verifyToken, userConfirmOrderReceipt)
router.post('/:id/cancel', verifyToken, userCancelOrder)
router.post('/:orderId/confirm-notification', verifyToken, confirmOrderReceiptNotification)

// Analytics and reporting routes
router.get('/stats', verifyToken, isAdmin, getOrderStats)
router.get('/sales-performance', verifyToken, isAdmin, getSalesPerformance)
router.get('/sales-analytics', verifyToken, isAdmin, getSalesAnalytics)

// Public sales data endpoint for testing (remove in production)
router.get('/sales-performance/public', getSalesPerformance)

// Public endpoint for email confirmation (no auth required)
router.get('/:orderId/confirm-receipt', confirmOrderReceiptPublic)

// Test endpoint to check database connection
router.get('/test-db', async (req, res) => {
  try {
    const { pool } = await import('../database/db.js')
    const [rows] = await pool.query('SELECT 1 as test')
    res.json({ 
      success: true, 
      message: 'Database connected successfully',
      test: rows[0]
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Database connection failed',
      message: error.message 
    })
  }
})

// Test notification endpoint (for debugging)
router.post('/test-notification', testNotification)

export default router
