import express from 'express'
import {
  addToCart,
  getCart,
  updateCart,
  deleteCartItem
} from '../controllers/cart.controller.js'

import { verifyToken } from '../middleware/verifyToken.js'

const router = express.Router()

router.post('/', verifyToken, addToCart)
router.get('/', verifyToken, getCart)
router.put('/:id', verifyToken, updateCart)
router.delete('/:id', verifyToken, deleteCartItem)

export default router
