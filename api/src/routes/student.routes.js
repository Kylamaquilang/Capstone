import express from 'express';
import multer from 'multer';
import { addStudent, addStudentsBulk, getAllStudents } from '../controllers/student.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.csv');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Protected routes (admin only)
router.post('/add', verifyToken, isAdmin, addStudent);
router.post('/bulk-upload', verifyToken, isAdmin, upload.single('file'), addStudentsBulk);
router.get('/all', verifyToken, isAdmin, getAllStudents);

export default router;
