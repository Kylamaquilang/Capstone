import express from 'express'
import { getProfile, updateProfile } from '../controllers/profile.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'

const router = express.Router()

// Protected routes
router.get('/', verifyToken, getProfile)
router.put('/', verifyToken, updateProfile)

export default router
