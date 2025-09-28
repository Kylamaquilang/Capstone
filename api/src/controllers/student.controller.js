import bcrypt from 'bcryptjs';
import { pool } from '../database/db.js';
import { validateEmail, validateStudentId } from '../utils/validation.js';
import { sendWelcomeEmail } from '../utils/emailService.js';
import csv from 'csv-parser';
import fs from 'fs';
import pkg from 'xlsx';
const { readFile, utils } = pkg;

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
      year_level,
      section,
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

    // Validate year_level
    const validYearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
    if (year_level && !validYearLevels.includes(year_level)) {
      return res.status(400).json({ 
        error: 'Invalid year level. Must be one of: 1st Year, 2nd Year, 3rd Year, 4th Year' 
      });
    }

    // Validate status
    const validStatuses = ['regular', 'irregular'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be either "regular" or "irregular"' 
      });
    }

    // Check if student already exists with this email (excluding soft-deleted users)
    const [existingEmail] = await pool.query('SELECT * FROM users WHERE email = ? AND (is_active = 1 OR deleted_at IS NULL)', [email.trim()]);
    if (existingEmail.length > 0) {
      return res.status(409).json({ 
        error: 'Student already exists with this email' 
      });
    }

    // Check if student already exists with this student_id (excluding soft-deleted users)
    const [existingStudentId] = await pool.query('SELECT * FROM users WHERE student_id = ? AND (is_active = 1 OR deleted_at IS NULL)', [student_id.trim()]);
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
        year_level,
        section,
        status,
        created_at, 
        is_active, 
        must_change_password
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1, 1)`,
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
        year_level || null,
        section?.trim() || null,
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
        const workbook = readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; // Use first sheet
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert Excel to JSON
        const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          throw new Error('Excel file must have at least a header row and one data row');
        }
        
        // Debug: Show raw Excel data before processing
        console.log('🔍 Raw Excel data (first 3 rows):', jsonData.slice(0, 3));
        console.log('🔍 Headers from raw data:', jsonData[0]);
        
        // Check if this is the special format with 4a/4b columns
        const isSpecialFormat = jsonData[0].some(header => 
          header && (header.toString().toLowerCase().includes('4a') || header.toString().toLowerCase().includes('4b'))
        );
        
        if (isSpecialFormat) {
          console.log('🔍 Detected special Excel format (4a/4b columns)');
          console.log(`📊 Processing ${jsonData.length - 1} rows...`);
          
          // Process special format with batch processing
          const batchSize = 10; // Process 10 rows at a time
          for (let i = 1; i < jsonData.length; i += batchSize) {
            const batch = jsonData.slice(i, i + batchSize);
            
            for (const row of batch) {
              // Extract student from 4a column (columns 0-6)
              if (row[0] && row[0].toString().trim()) {
                const studentA = {
                  student_id: row[0].toString().trim(),
                  first_name: row[1] ? row[1].toString().trim().split(',')[0].trim() : '',
                  last_name: row[2] ? row[2].toString().trim() : '',
                  email: `${row[0].toString().trim().toLowerCase()}@student.cpc.edu.ph`,
                  degree: 'BSIT',
                  status: 'regular'
                };
                results.push(studentA);
              }
              
              // Extract student from 4b column (columns 7-11)
              if (row[7] && row[7].toString().trim()) {
                const studentB = {
                  student_id: row[7].toString().trim(),
                  first_name: row[8] ? row[8].toString().trim().split(',')[0].trim() : '',
                  last_name: row[9] ? row[9].toString().trim() : '',
                  email: `${row[7].toString().trim().toLowerCase()}@student.cpc.edu.ph`,
                  degree: 'BSIT',
                  status: 'regular'
                };
                results.push(studentB);
              }
            }
            
            // Log progress every batch
            if (i % (batchSize * 5) === 1) {
              console.log(`📊 Processed ${Math.min(i + batchSize - 1, jsonData.length - 1)}/${jsonData.length - 1} rows...`);
            }
          }
          
          console.log(`📊 Processed ${results.length} students from special format`);
          console.log('🔍 Sample processed students:', results.slice(0, 3));
        } else {
          // Normal processing
          // Get headers from first row
          const headers = jsonData[0].map(h => h ? h.toString().trim().toLowerCase() : '');
          console.log('🔍 Excel Headers:', headers);
        
        // Enhanced header mapping with more variations
        const headerMapping = {
          'student id': 'student_id',
          'studentid': 'student_id',
          'id': 'student_id',
          'student number': 'student_id',
          'student_no': 'student_id',
          'student_no.': 'student_id',
          'stud_id': 'student_id',
          'first name': 'first_name',
          'firstname': 'first_name',
          'fname': 'first_name',
          'given name': 'first_name',
          'last name': 'last_name',
          'lastname': 'last_name',
          'lname': 'last_name',
          'surname': 'last_name',
          'family name': 'last_name',
          'middle name': 'middle_name',
          'middlename': 'middle_name',
          'mname': 'middle_name',
          'middle initial': 'middle_name',
          'email address': 'email',
          'emailaddress': 'email',
          'e-mail': 'email',
          'email_addr': 'email',
          'course': 'degree',
          'program': 'degree',
          'course/program': 'degree',
          'year level': 'year_level',
          'yearlevel': 'year_level',
          'level': 'year_level',
          'year': 'year_level',
          'grade level': 'year_level',
          'class': 'year_level',
          'section': 'section',
          'sec': 'section',
          'class section': 'section',
          'status': 'status',
          'student status': 'status'
        };
        
        // Auto-detect columns if mapping fails
        const autoDetectColumns = (headers, sampleRow) => {
          const detected = {};
          
          headers.forEach((header, index) => {
            const value = sampleRow[index];
            const headerLower = header.toLowerCase();
            
            // Auto-detect student_id
            if (!detected.student_id && (
              headerLower.includes('student') || 
              headerLower.includes('id') ||
              (value && /^\d{4,8}$/.test(value.toString().trim()))
            )) {
              detected.student_id = index;
            }
            
            // Auto-detect first_name
            if (!detected.first_name && (
              headerLower.includes('first') || 
              headerLower.includes('given') ||
              headerLower.includes('fname')
            )) {
              detected.first_name = index;
            }
            
            // Auto-detect last_name
            if (!detected.last_name && (
              headerLower.includes('last') || 
              headerLower.includes('surname') ||
              headerLower.includes('family') ||
              headerLower.includes('lname')
            )) {
              detected.last_name = index;
            }
            
            // Auto-detect email
            if (!detected.email && (
              headerLower.includes('email') || 
              headerLower.includes('e-mail') ||
              (value && /@/.test(value.toString()))
            )) {
              detected.email = index;
            }
            
            // Auto-detect degree
            if (!detected.degree && (
              headerLower.includes('course') || 
              headerLower.includes('program') ||
              headerLower.includes('degree') ||
              headerLower.includes('major')
            )) {
              detected.degree = index;
            }
            
            // Auto-detect status
            if (!detected.status && (
              headerLower.includes('year') || 
              headerLower.includes('level') ||
              headerLower.includes('grade') ||
              headerLower.includes('class')
            )) {
              detected.status = index;
            }
          });
          
          return detected;
        };
        
        // Try auto-detection if we have a sample row
        let autoDetectedColumns = {};
        if (jsonData.length > 1) {
          autoDetectedColumns = autoDetectColumns(headers, jsonData[1]);
          console.log('🔍 Auto-detected columns:', autoDetectedColumns);
        }
        
        // Process data rows
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const cleanedData = {};
          
          // First try header mapping
          headers.forEach((header, index) => {
            const cleanHeader = headerMapping[header] || header;
            cleanedData[cleanHeader] = row[index] ? row[index].toString().trim() : '';
          });
          
          // If auto-detection found columns, use them as fallback
          Object.keys(autoDetectedColumns).forEach(field => {
            const columnIndex = autoDetectedColumns[field];
            if (columnIndex !== undefined && row[columnIndex]) {
              cleanedData[field] = row[columnIndex].toString().trim();
            }
          });
          
          // Set default values if not provided
          if (!cleanedData.status) {
            cleanedData.status = 'regular'; // Default status
          }
          if (!cleanedData.year_level) {
            cleanedData.year_level = '1st Year'; // Default year level
          }
          if (!cleanedData.section) {
            cleanedData.section = 'A'; // Default section
          }
          
          // Debug: Show first few processed rows
          if (i <= 3) {
            console.log(`🔍 Processing row ${i}:`, {
              originalHeaders: headers,
              originalData: row,
              cleanedData: cleanedData,
              autoDetected: autoDetectedColumns
            });
          }
          
          results.push(cleanedData);
        }
        
        console.log('🔍 Header mapping applied:', headers.map(h => `${h} -> ${headerMapping[h] || h}`));
        
          console.log(`📊 Found ${results.length} rows in Excel file`);
          
          // Debug: Show first processed row
          if (results.length > 0) {
            console.log('🔍 First processed row:', JSON.stringify(results[0], null, 2));
          }
        }
        
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

    // Check if we have any data to process
    if (results.length === 0) {
      console.log('❌ No data found in file');
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        error: 'No data found in file', 
        details: 'The file appears to be empty or contains no valid data rows' 
      });
    }

    // Process each row
    try {
      console.log(`📊 Processing ${results.length} rows from file`);
      console.log('🔍 Sample of results:', results.slice(0, 2));
      
      // Batch check for existing students to avoid individual queries
      console.log('🔍 Batch checking for existing students...');
      const allStudentIds = results.map(row => row.student_id?.trim()).filter(id => id);
      const allEmails = results.map(row => row.email?.trim()).filter(email => email);
      
      // Get all existing student IDs and emails in one query
      const existingStudents = new Set();
      const existingEmails = new Set();
      
      if (allStudentIds.length > 0) {
        const placeholders = allStudentIds.map(() => '?').join(',');
        const [existingIds] = await pool.query(`SELECT student_id FROM users WHERE student_id IN (${placeholders})`, allStudentIds);
        existingIds.forEach(student => existingStudents.add(student.student_id));
      }
      
      if (allEmails.length > 0) {
        const placeholders = allEmails.map(() => '?').join(',');
        const [existingEmailsResult] = await pool.query(`SELECT email FROM users WHERE email IN (${placeholders})`, allEmails);
        existingEmailsResult.forEach(user => existingEmails.add(user.email));
      }
      
      console.log(`🔍 Found ${existingStudents.size} existing student IDs and ${existingEmails.size} existing emails`);
      
      // Prepare batch insert data
      const batchInsertData = [];
      
      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const rowNumber = i + 2; // +2 because file starts at row 2 (row 1 is header)

        // Debug: Log first few rows to see data structure
        if (i < 3) {
          console.log(`🔍 Debug Row ${rowNumber}:`, JSON.stringify(row, null, 2));
          console.log(`🔍 Available fields in row:`, Object.keys(row));
          console.log(`🔍 Required fields check:`, {
            student_id: !!row.student_id,
            first_name: !!row.first_name,
            last_name: !!row.last_name,
            email: !!row.email,
            degree: !!row.degree,
            status: !!row.status
          });
        }

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

          // Validate degree (more flexible)
          const validDegrees = ['BEED', 'BSED', 'BSIT', 'BSHM'];
          const degreeValue = row.degree.toUpperCase().trim();
          let mappedDegree = degreeValue;
          
          // Map common degree variations
          const degreeMapping = {
            'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY': 'BSIT',
            'BACHELOR OF SCIENCE IN EDUCATION': 'BSED',
            'BACHELOR OF ELEMENTARY EDUCATION': 'BEED',
            'BACHELOR OF SCIENCE IN HOSPITALITY MANAGEMENT': 'BSHM',
            'INFORMATION TECHNOLOGY': 'BSIT',
            'EDUCATION': 'BSED',
            'ELEMENTARY EDUCATION': 'BEED',
            'HOSPITALITY MANAGEMENT': 'BSHM'
          };
          
          if (degreeMapping[degreeValue]) {
            mappedDegree = degreeMapping[degreeValue];
          }
          
          if (!validDegrees.includes(mappedDegree)) {
            errors.push({
              row: rowNumber,
              error: `Invalid degree: "${row.degree}". Must be one of: ${validDegrees.join(', ')}`,
              data: row
            });
            errorCount++;
            continue;
          }

          // Validate status (more flexible)
          const validStatuses = ['regular', 'irregular'];
          const statusValue = row.status.toLowerCase().trim();
          let mappedStatus = statusValue;
          
          // Map common status variations
          const statusMapping = {
            '1st year': 'regular',
            '2nd year': 'regular',
            '3rd year': 'regular',
            '4th year': 'regular',
            'first year': 'regular',
            'second year': 'regular',
            'third year': 'regular',
            'fourth year': 'regular',
            'freshman': 'regular',
            'sophomore': 'regular',
            'junior': 'regular',
            'senior': 'regular'
          };
          
          if (statusMapping[statusValue]) {
            mappedStatus = statusMapping[statusValue];
          }
          
          if (!validStatuses.includes(mappedStatus)) {
            errors.push({
              row: rowNumber,
              error: `Invalid status: "${row.status}". Must be either "regular" or "irregular"`,
              data: row
            });
            errorCount++;
            continue;
          }

          // Check if student already exists using batch results
          if (existingEmails.has(row.email.trim())) {
            errors.push({
              row: rowNumber,
              error: `Student already exists with email: ${row.email}`,
              data: row
            });
            errorCount++;
            continue;
          }

          if (existingStudents.has(row.student_id.trim())) {
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

          // Add to batch insert data instead of individual insert
          batchInsertData.push([
            row.student_id.trim(),
            row.email.trim(),
            fullName,
            hashedPassword,
            'student',
            row.first_name.trim(),
            row.last_name.trim(),
            row.middle_name?.trim() || null,
            row.suffix?.trim() || null,
            mappedDegree,
            row.year_level || '1st Year',
            row.section || 'A',
            mappedStatus,
            1, // is_active (active by default)
            1  // must_change_password
          ]);

          successCount++;
          console.log(`✅ Prepared student for batch insert: ${row.student_id} - ${fullName}`);

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

      // Perform batch insert if we have valid data
      if (batchInsertData.length > 0) {
        console.log(`📊 Performing batch insert for ${batchInsertData.length} students...`);
        try {
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
              year_level,
              section,
              status,
              is_active, 
              must_change_password
            ) VALUES ?`,
            [batchInsertData]
          );
          console.log(`✅ Batch insert completed: ${batchInsertData.length} students added`);
        } catch (batchError) {
          console.error('❌ Batch insert failed:', batchError);
          // If batch insert fails, try individual inserts as fallback
          console.log('🔄 Falling back to individual inserts...');
          for (const studentData of batchInsertData) {
            try {
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
                  year_level,
                  section,
                  status,
                  is_active, 
                  must_change_password
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
                studentData
              );
            } catch (individualError) {
              console.error(`❌ Failed to insert individual student ${studentData[0]}:`, individualError.message);
            }
          }
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
