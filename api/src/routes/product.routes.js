import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
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

// Resolve uploads directory relative to this file
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, '..', '..', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
  }
})
const upload = multer({ storage })

// ✅ Public read routes first
router.get('/', getAllProductsSimple) // Simple version for frontend
router.get('/detailed', getAllProducts) // Detailed version with pagination
router.get('/stats', verifyToken, isAdmin, getProductStats)
router.get('/low-stock', verifyToken, isAdmin, getLowStockProducts)
router.get('/:id', getProductById)

// ✅ Admin-only below
router.post('/', verifyToken, isAdmin, createProduct)
router.post('/upload-image', verifyToken, isAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  // Return a public URL to the uploaded file
  const publicUrl = `/uploads/${req.file.filename}`
  res.status(201).json({ url: publicUrl })
})
router.put('/:id', verifyToken, isAdmin, updateProduct)
router.delete('/:id', verifyToken, isAdmin, deleteProduct)

export default router
