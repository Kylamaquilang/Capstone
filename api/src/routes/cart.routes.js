import express from 'express'
import {
  addToCart,
  getCart,
  updateCart,
  deleteCartItem,
  clearCart
} from '../controllers/cart.controller.js'

import { verifyToken } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/', verifyToken, addToCart)
router.get('/', verifyToken, getCart)
router.put('/:id', verifyToken, updateCart)
router.delete('/:id', verifyToken, deleteCartItem)
router.delete('/', verifyToken, clearCart)

export default router
