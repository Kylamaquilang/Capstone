import express from 'express'
import {
  getUserOrders,
  getAllOrders,
  getOrderItems,
  updateOrderStatus
} from '../controllers/order.controller.js'
import { verifyToken, isAdmin } from '../middleware/verifyToken.js'

const router = express.Router()
router.get('/student', verifyToken, getUserOrders)
router.get('/admin', verifyToken, isAdmin, getAllOrders)

router.get('/:id/items', verifyToken, getOrderItems)
router.patch('/:id/status', verifyToken, isAdmin, updateOrderStatus)

export default router
