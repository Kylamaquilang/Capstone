import express from 'express';
import multer from 'multer';
import { 
  getAllUsersWithStatus, 
  toggleUserStatus, 
  updateUserProfileImage,
  getUserProfile,
  updateUserProfile,
  updateUser,
  deleteUser
} from '../controllers/user-management.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, 'profile-' + uniqueSuffix + '.' + ext);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Admin routes (admin only)
router.get('/all', verifyToken, isAdmin, getAllUsersWithStatus);
router.put('/:id', verifyToken, isAdmin, updateUser);
router.patch('/:userId/status', verifyToken, isAdmin, toggleUserStatus);
router.delete('/:userId', verifyToken, isAdmin, deleteUser);

// User routes (authenticated users)
router.get('/profile', verifyToken, getUserProfile);
router.put('/profile', verifyToken, updateUserProfile);
router.put('/profile/image', verifyToken, upload.single('image'), updateUserProfileImage);

export default router;
