import bcrypt from 'bcryptjs';
import { pool } from '../database/db.js';
import { validateEmail, validateStudentId } from '../utils/validation.js';
import { sendWelcomeEmail } from '../utils/emailService.js';
import csv from 'csv-parser';
import fs from 'fs';

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

// ✅ Add students in bulk via CSV
export const addStudentsBulk = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const results = [];
    const errors = [];
    let successCount = 0;
    let errorCount = 0;

    // Read CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        try {
          // Process each row
          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const rowNumber = i + 2; // +2 because CSV starts at row 2 (row 1 is header)

            try {
              // Validate required fields
              if (!row.student_id || !row.first_name || !row.last_name || !row.email || !row.degree || !row.status) {
                errors.push({
                  row: rowNumber,
                  error: 'Missing required fields',
                  data: row
                });
                errorCount++;
                continue;
              }

              // Validate student ID format
              if (!validateStudentId(row.student_id)) {
                errors.push({
                  row: rowNumber,
                  error: 'Invalid student ID format. Expected numeric format (4-8 digits)',
                  data: row
                });
                errorCount++;
                continue;
              }

              // Validate email
              if (!validateEmail(row.email)) {
                errors.push({
                  row: rowNumber,
                  error: 'Invalid email format',
                  data: row
                });
                errorCount++;
                continue;
              }

              // Validate degree
              const validDegrees = ['BEED', 'BSED', 'BSIT', 'BSHM'];
              if (!validDegrees.includes(row.degree)) {
                errors.push({
                  row: rowNumber,
                  error: 'Invalid degree. Must be one of: BEED, BSED, BSIT, BSHM',
                  data: row
                });
                errorCount++;
                continue;
              }

              // Validate status
              const validStatuses = ['regular', 'irregular'];
              if (!validStatuses.includes(row.status)) {
                errors.push({
                  row: rowNumber,
                  error: 'Invalid status. Must be either "regular" or "irregular"',
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
                  error: 'Student already exists with this email',
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
                  error: 'Student ID already exists',
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
                  row.degree,
                  row.status,
                ]
              );

              // Send welcome email
              try {
                await sendWelcomeEmail(row.email.trim(), fullName, row.student_id.trim(), DEFAULT_STUDENT_PASSWORD);
              } catch (emailError) {
                console.warn('Failed to send welcome email:', emailError.message);
              }

              successCount++;
            } catch (rowError) {
              errors.push({
                row: rowNumber,
                error: rowError.message,
                data: row
              });
              errorCount++;
            }
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

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
          // Clean up uploaded file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          res.status(500).json({ error: 'Error processing bulk upload', details: processError.message });
        }
      })
      .on('error', (error) => {
        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Error reading CSV file', details: error.message });
      });
  } catch (error) {
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Bulk upload error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
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
