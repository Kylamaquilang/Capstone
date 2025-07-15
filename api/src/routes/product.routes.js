import express from 'express'
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getLowStockProducts
} from '../controllers/product.controller.js'

import { verifyToken, isAdmin } from '../middleware/verifyToken.js'

const router = express.Router()

// ✅ Public read routes first
router.get('/', getAllProducts)
router.get('/low-stock', verifyToken, isAdmin, getLowStockProducts) // move ABOVE `/:id`
router.get('/:id', getProductById)

// ✅ Admin-only below
router.post('/', verifyToken, isAdmin, createProduct)
router.put('/:id', verifyToken, isAdmin, updateProduct)
router.delete('/:id', verifyToken, isAdmin, deleteProduct)


export default router
