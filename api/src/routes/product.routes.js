import express from 'express'
import {
  createProduct,
  getAllProducts,
  getAllProductsSimple,
  getProductById,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getProductStats
} from '../controllers/product.controller.js'

import { verifyToken, isAdmin } from '../middleware/auth.middleware.js'

const router = express.Router()

// ✅ Public read routes first
router.get('/', getAllProductsSimple) // Simple version for frontend
router.get('/detailed', getAllProducts) // Detailed version with pagination
router.get('/stats', verifyToken, isAdmin, getProductStats)
router.get('/low-stock', verifyToken, isAdmin, getLowStockProducts)
router.get('/:id', getProductById)

// ✅ Admin-only below
router.post('/', verifyToken, isAdmin, createProduct)
router.put('/:id', verifyToken, isAdmin, updateProduct)
router.delete('/:id', verifyToken, isAdmin, deleteProduct)

export default router
