import express from 'express';
import multer from 'multer';
import { debugExcelFile } from '../controllers/debug.controller.js';
import { testExcelStructure } from '../controllers/test.controller.js';
import { testExcelProcessing } from '../controllers/test-excel.controller.js';
import { createSampleExcel } from '../controllers/sample-excel.controller.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'debug-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Debug Excel file structure
router.post('/debug-excel', upload.single('file'), debugExcelFile);

// Test Excel structure
router.post('/test-excel', upload.single('file'), testExcelStructure);

// Test Excel processing
router.post('/test-processing', upload.single('file'), testExcelProcessing);

// Download sample Excel template
router.get('/sample-excel', createSampleExcel);

export default router;
