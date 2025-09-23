import bcrypt from 'bcryptjs';
import { pool } from '../database/db.js';
import { validateEmail, validateStudentId } from '../utils/validation.js';
import { sendWelcomeEmail } from '../utils/emailService.js';
import csv from 'csv-parser';
import fs from 'fs';
import * as XLSX from 'xlsx';

const SALT_ROUNDS = 12;
const DEFAULT_STUDENT_PASSWORD = process.env.DEFAULT_STUDENT_PASSWORD || 'cpc123';

// ✅ Add single student
export const addStudent = async (req, res) => {
  try {
    const { 
      student_id,
      first_name, 
      last_name, 
      middle_name, 
      suffix, 
      email, 
      degree, 
      status 
    } = req.body;

    // Validation
    if (!student_id || !first_name || !last_name || !email || !degree || !status) {
      return res.status(400).json({ 
        error: 'Required fields missing',
        required: ['student_id', 'first_name', 'last_name', 'email', 'degree', 'status']
      });
    }

    // Validate student ID format
    if (!validateStudentId(student_id)) {
      return res.status(400).json({ 
        error: 'Invalid student ID format. Expected numeric format (4-8 digits)' 
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Validate degree
    const validDegrees = ['BEED', 'BSED', 'BSIT', 'BSHM'];
    if (!validDegrees.includes(degree)) {
      return res.status(400).json({ 
        error: 'Invalid degree. Must be one of: BEED, BSED, BSIT, BSHM' 
      });
    }

    // Validate status
    const validStatuses = ['regular', 'irregular'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be either "regular" or "irregular"' 
      });
    }

    // Check if student already exists with this email
    const [existingEmail] = await pool.query('SELECT * FROM users WHERE email = ?', [email.trim()]);
    if (existingEmail.length > 0) {
      return res.status(409).json({ 
        error: 'Student already exists with this email' 
      });
    }

    // Check if student already exists with this student_id
    const [existingStudentId] = await pool.query('SELECT * FROM users WHERE student_id = ?', [student_id.trim()]);
    if (existingStudentId.length > 0) {
      return res.status(409).json({ 
        error: 'Student ID already exists' 
      });
    }

    // Create full name
    const fullName = `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}${suffix ? ' ' + suffix : ''}`;

    // Hash default password
    const hashedPassword = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, SALT_ROUNDS);

    // Insert new student
    const [result] = await pool.query(
      `INSERT INTO users (
        student_id, 
        email, 
        name, 
        password, 
        role, 
        first_name,
        last_name,
        middle_name,
        suffix,
        degree,
        status,
        created_at, 
        is_active, 
        must_change_password
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1, 1)`,
      [
        student_id.trim(),
        email.trim(),
        fullName,
        hashedPassword,
        'student',
        first_name.trim(),
        last_name.trim(),
        middle_name?.trim() || null,
        suffix?.trim() || null,
        degree,
        status,
      ]
    );

    // Send welcome email
    try {
      await sendWelcomeEmail(email.trim(), fullName, student_id.trim(), DEFAULT_STUDENT_PASSWORD);
    } catch (emailError) {
      console.warn('Failed to send welcome email:', emailError.message);
    }

    res.status(201).json({ 
      message: 'Student added successfully',
      student: {
        id: result.insertId,
        student_id: student_id.trim(),
        name: fullName,
        email: email.trim(),
        degree,
        status
      }
    });
  } catch (error) {
    console.error('Add student error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Add students in bulk via CSV or Excel
export const addStudentsBulk = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📁 Processing file:', req.file.filename);
    console.log('📁 File size:', req.file.size, 'bytes');
    console.log('📁 File type:', req.file.mimetype);

    const results = [];
    const errors = [];
    let successCount = 0;
    let errorCount = 0;

    // Determine file type and parse accordingly
    const fileExtension = req.file.originalname.toLowerCase().split('.').pop();
    
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Handle Excel files
      try {
        console.log('📊 Processing Excel file...');
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; // Use first sheet
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert Excel to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          throw new Error('Excel file must have at least a header row and one data row');
        }
        
        // Get headers from first row
        const headers = jsonData[0].map(h => h ? h.toString().trim().toLowerCase() : '');
        
        // Process data rows
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const cleanedData = {};
          
          headers.forEach((header, index) => {
            cleanedData[header] = row[index] ? row[index].toString().trim() : '';
          });
          
          results.push(cleanedData);
        }
        
        console.log(`📊 Found ${results.length} rows in Excel file`);
        
      } catch (excelError) {
        console.error('❌ Error reading Excel file:', excelError);
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          error: 'Error reading Excel file', 
          details: excelError.message 
        });
      }
      
    } else if (fileExtension === 'csv') {
      // Handle CSV files
      try {
        console.log('📊 Processing CSV file...');
        
        await new Promise((resolve, reject) => {
          fs.createReadStream(req.file.path)
            .pipe(csv({
              skipEmptyLines: true,
              skipLinesWithError: true
            }))
            .on('data', (data) => {
              // Clean and validate CSV data
              const cleanedData = {};
              Object.keys(data).forEach(key => {
                const cleanKey = key.trim().toLowerCase();
                const cleanValue = data[key] ? data[key].trim() : '';
                cleanedData[cleanKey] = cleanValue;
              });
              results.push(cleanedData);
            })
            .on('end', () => {
              console.log(`📊 Found ${results.length} rows in CSV file`);
              resolve();
            })
            .on('error', (error) => {
              reject(error);
            });
        });
        
      } catch (csvError) {
        console.error('❌ Error reading CSV file:', csvError);
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          error: 'Error reading CSV file', 
          details: csvError.message 
        });
      }
      
    } else {
      // Unsupported file type
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        error: 'Unsupported file type', 
        details: 'Please upload a CSV (.csv) or Excel (.xlsx, .xls) file' 
      });
    }

    // Process each row
    try {
      console.log(`📊 Processing ${results.length} rows from file`);
      
      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const rowNumber = i + 2; // +2 because file starts at row 2 (row 1 is header)

        try {
          // Validate required fields with better error messages
          const requiredFields = ['student_id', 'first_name', 'last_name', 'email', 'degree', 'status'];
          const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '');
          
          if (missingFields.length > 0) {
            errors.push({
              row: rowNumber,
              error: `Missing required fields: ${missingFields.join(', ')}`,
              data: row
            });
            errorCount++;
            continue;
          }

          // Validate student ID format
          if (!validateStudentId(row.student_id)) {
            errors.push({
              row: rowNumber,
              error: `Invalid student ID format: "${row.student_id}". Expected numeric format (4-8 digits)`,
              data: row
            });
            errorCount++;
            continue;
          }

          // Validate email
          if (!validateEmail(row.email)) {
            errors.push({
              row: rowNumber,
              error: `Invalid email format: "${row.email}"`,
              data: row
            });
            errorCount++;
            continue;
          }

          // Validate degree
          const validDegrees = ['BEED', 'BSED', 'BSIT', 'BSHM'];
          if (!validDegrees.includes(row.degree.toUpperCase())) {
            errors.push({
              row: rowNumber,
              error: `Invalid degree: "${row.degree}". Must be one of: ${validDegrees.join(', ')}`,
              data: row
            });
            errorCount++;
            continue;
          }

          // Validate status
          const validStatuses = ['regular', 'irregular'];
          if (!validStatuses.includes(row.status.toLowerCase())) {
            errors.push({
              row: rowNumber,
              error: `Invalid status: "${row.status}". Must be either "regular" or "irregular"`,
              data: row
            });
            errorCount++;
            continue;
          }

          // Check if student already exists with this email
          const [existingEmail] = await pool.query('SELECT * FROM users WHERE email = ?', [row.email.trim()]);
          if (existingEmail.length > 0) {
            errors.push({
              row: rowNumber,
              error: `Student already exists with email: ${row.email}`,
              data: row
            });
            errorCount++;
            continue;
          }

          // Check if student already exists with this student_id
          const [existingStudentId] = await pool.query('SELECT * FROM users WHERE student_id = ?', [row.student_id.trim()]);
          if (existingStudentId.length > 0) {
            errors.push({
              row: rowNumber,
              error: `Student ID already exists: ${row.student_id}`,
              data: row
            });
            errorCount++;
            continue;
          }

          // Create full name
          const fullName = `${row.first_name} ${row.middle_name ? row.middle_name + ' ' : ''}${row.last_name}${row.suffix ? ' ' + row.suffix : ''}`;

          // Hash default password
          const hashedPassword = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, SALT_ROUNDS);

          // Insert new student
          await pool.query(
            `INSERT INTO users (
              student_id, 
              email, 
              name, 
              password, 
              role, 
              first_name,
              last_name,
              middle_name,
              suffix,
              degree,
              status,
              created_at, 
              is_active, 
              must_change_password
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1, 1)`,
            [
              row.student_id.trim(),
              row.email.trim(),
              fullName,
              hashedPassword,
              'student',
              row.first_name.trim(),
              row.last_name.trim(),
              row.middle_name?.trim() || null,
              row.suffix?.trim() || null,
              row.degree.toUpperCase(),
              row.status.toLowerCase(),
            ]
          );

          // Send welcome email (optional - don't fail if email fails)
          try {
            await sendWelcomeEmail(row.email.trim(), fullName, row.student_id.trim(), DEFAULT_STUDENT_PASSWORD);
          } catch (emailError) {
            console.warn(`Failed to send welcome email for ${row.email}:`, emailError.message);
          }

          successCount++;
          console.log(`✅ Successfully added student: ${row.student_id} - ${fullName}`);

        } catch (rowError) {
          console.error(`❌ Error processing row ${rowNumber}:`, rowError.message);
          errors.push({
            row: rowNumber,
            error: `Database error: ${rowError.message}`,
            data: row
          });
          errorCount++;
        }
      }

      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      console.log(`📊 Bulk upload completed: ${successCount} successful, ${errorCount} errors`);

      res.status(200).json({
        message: 'Bulk upload completed',
        summary: {
          total: results.length,
          success: successCount,
          errors: errorCount
        },
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (processError) {
      console.error('❌ Error processing bulk upload:', processError);
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ 
        error: 'Error processing bulk upload', 
        details: processError.message 
      });
    }
    
  } catch (error) {
    console.error('❌ Bulk upload error:', error);
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: error.message 
    });
  }
};

// ✅ Get all students
export const getAllStudents = async (req, res) => {
  try {
    const [students] = await pool.query(
      `SELECT 
        id, 
        student_id, 
        name, 
        email, 
        first_name,
        last_name,
        middle_name,
        suffix,
        degree,
        status,
        created_at 
       FROM users 
       WHERE role = 'student' 
       ORDER BY created_at DESC`
    );

    res.json({ students });
  } catch (error) {
    console.error('Get students error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
