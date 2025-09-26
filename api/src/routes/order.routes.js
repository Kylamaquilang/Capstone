import express from 'express'
import {
  getUserOrders,
  getUserOrderDetails,
  getAllOrders,
  getOrderItems,
  getOrderById,
  updateOrderStatus,
  getOrderStats,
  getSalesPerformance,
  confirmOrderReceipt,
  userConfirmOrderReceipt,
  confirmOrderReceiptNotification
} from '../controllers/order.controller.js'
import { verifyToken, isAdmin } from '../middleware/verifyToken.js'

const router = express.Router()
router.get('/student', verifyToken, getUserOrders)
router.get('/user/:id', verifyToken, getUserOrderDetails)
router.get('/admin', verifyToken, isAdmin, getAllOrders)
router.get('/:id', verifyToken, isAdmin, getOrderById)

router.get('/:id/items', verifyToken, getOrderItems)
router.patch('/:id/status', verifyToken, isAdmin, updateOrderStatus)
router.post('/:id/confirm-receipt', verifyToken, isAdmin, confirmOrderReceipt)
router.post('/:id/user-confirm', verifyToken, userConfirmOrderReceipt)
router.post('/:orderId/confirm-notification', verifyToken, confirmOrderReceiptNotification)

// Analytics and reporting routes
router.get('/stats', verifyToken, isAdmin, getOrderStats)
router.get('/sales-performance', verifyToken, isAdmin, getSalesPerformance)

// Public sales data endpoint for testing (remove in production)
router.get('/sales-performance/public', getSalesPerformance)

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

export default router
