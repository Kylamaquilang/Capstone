import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/db.js';
import { validateEmail, validateStudentId, validatePassword } from '../utils/validation.js';
import { sendPasswordResetEmail, generateVerificationCode, sendWelcomeEmail } from '../utils/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const DEFAULT_STUDENT_PASSWORD = process.env.DEFAULT_STUDENT_PASSWORD || 'cpc123';

// ✅ SIGNUP for both roles
export const signup = async (req, res) => {
  try {
    const { role, name, student_id, email, password, contact_number } = req.body;

    // Enhanced validation
    if (!role || !name) {
      return res.status(400).json({ 
        error: 'Role and name are required',
        required: ['role', 'name']
      });
    }

    if (role !== 'student' && role !== 'admin') {
      return res.status(400).json({ 
        error: 'Role must be either "student" or "admin"' 
      });
    }

    if (role === 'student' && !student_id) {
      return res.status(400).json({ 
        error: 'Student ID is required for student registration' 
      });
    }

    if (role === 'admin' && !email) {
      return res.status(400).json({ 
        error: 'Email is required for admin registration' 
      });
    }

    // Validate email format if provided
    if (email && !validateEmail(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Validate student ID format if provided
    if (student_id && !validateStudentId(student_id)) {
      return res.status(400).json({ 
        error: 'Invalid student ID format' 
      });
    }

    // Check if user already exists
    const checkQuery = role === 'admin'
      ? 'SELECT * FROM users WHERE email = ?'
      : 'SELECT * FROM users WHERE student_id = ?';

    const checkValue = role === 'admin' ? email.trim() : student_id.trim();
    const [existing] = await pool.query(checkQuery, [checkValue]);

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: `${role} already exists with this ${role === 'admin' ? 'email' : 'student ID'}` 
      });
    }

    // Generate password if not provided
    const finalPassword = password || (role === 'admin' ? 'admin123' : DEFAULT_STUDENT_PASSWORD);
    
    // Validate password strength
    if (!validatePassword(finalPassword)) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    const hashedPassword = await bcrypt.hash(finalPassword, SALT_ROUNDS);

    // Insert new user
    const [result] = await pool.query(
      `INSERT INTO users (student_id, email, name, password, role, contact_number, created_at, is_active, must_change_password) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), 1, 1)`,
      [
        student_id?.trim() || null,
        email?.trim() || null,
        name.trim(),
        hashedPassword,
        role,
        contact_number?.trim() || null
      ]
    );

    // Send welcome email if user has email and is a student
    if (email && role === 'student') {
      try {
        await sendWelcomeEmail(email.trim(), name.trim(), student_id?.trim(), DEFAULT_STUDENT_PASSWORD);
      } catch (emailError) {
        console.warn('Failed to send welcome email:', emailError.message);
        // Don't fail registration if email fails
      }
    }

    res.status(201).json({ 
      message: `${role} registered successfully`,
      userId: result.insertId,
      role: role
    });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ SIGNIN for both roles
export const signin = async (req, res) => {
  try {
    const { student_id, email, password } = req.body;

    console.log('🔍 Login attempt:', { student_id, email, hasPassword: !!password });

    // Enhanced validation
    if ((!student_id && !email) || !password) {
      return res.status(400).json({ 
        error: 'Missing credentials',
        required: ['password', 'student_id or email']
      });
    }

    if (password.length < 1) {
      return res.status(400).json({ error: 'Password cannot be empty' });
    }

    // Students must login with student_id; Admins may use email
    let identifier = null;
    let identifierField = null;
    if (student_id) {
      identifier = student_id.trim();
      identifierField = 'student_id';
    } else if (email) {
      identifier = email.trim();
      identifierField = 'email';
    }

    console.log('🔍 Looking for user with:', { identifierField, identifier });

    // Find user
    const [users] = await pool.query(
      `SELECT * FROM users WHERE ${identifierField} = ?`,
      [identifier]
    );

    console.log('🔍 Found users:', users.length);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    console.log('🔍 User found:', { id: user.id, name: user.name, role: user.role, hasPassword: !!user.password });

    // Prevent students from logging in via email
    if (user.role === 'student' && identifierField === 'email') {
      return res.status(400).json({ error: 'Students must login with student ID' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Please contact an administrator.' });
    }

    // Verify password
    console.log('🔍 Verifying password...');
    const isMatch = await bcrypt.compare(password.trim(), user.password);
    console.log('🔍 Password match:', isMatch);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        student_id: user.student_id,
        email: user.email,
        must_change_password: user.must_change_password
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log('✅ Login successful for:', user.name);

    res.status(200).json({ 
      message: 'Login successful', 
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        student_id: user.student_id,
        email: user.email,
        contact_number: user.contact_number,
        must_change_password: user.must_change_password,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error('❌ Signin error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ CHANGE PASSWORD
export const changePassword = async (req, res) => {
  try {
    const { email, student_id, oldPassword, newPassword } = req.body;

    // Enhanced validation
    if ((!email && !student_id) || !oldPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'All fields are required',
        required: ['email or student_id', 'oldPassword', 'newPassword']
      });
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ 
        error: 'New password must be at least 6 characters long' 
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ 
        error: 'New password must be different from old password' 
      });
    }

    // Find user by email or student_id
    const lookupField = email ? 'email' : 'student_id';
    const lookupValue = email ? email.trim() : student_id.trim();
    const [users] = await pool.query(`SELECT * FROM users WHERE ${lookupField} = ?`, [lookupValue]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Compare old password
    const isMatch = await bcrypt.compare(oldPassword.trim(), user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Old password is incorrect' });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword.trim(), SALT_ROUNDS);
    await pool.query(
      `UPDATE users SET password = ?, must_change_password = 0 WHERE ${lookupField} = ?`, 
      [hashedPassword, lookupValue]
    );

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ LOGOUT — client handles token removal
export const logout = async (req, res) => {
  try {
    // In a production environment, you might want to blacklist the token
    // For now, we'll just return success and let the client handle it
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ REFRESH TOKEN
export const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Generate new token
      const newToken = jwt.sign(
        {
          id: decoded.id,
          name: decoded.name,
          role: decoded.role,
          student_id: decoded.student_id,
          email: decoded.email,
          must_change_password: decoded.must_change_password
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(200).json({ 
        message: 'Token refreshed successfully', 
        token: newToken 
      });
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Refresh token error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ REQUEST PASSWORD RESET
export const requestPasswordReset = async (req, res) => {
  try {
    const { email, student_id } = req.body;

    if (!email && !student_id) {
      return res.status(400).json({ 
        error: 'Email or Student ID is required' 
      });
    }

    // Find user by email or student_id
    const lookupField = email ? 'email' : 'student_id';
    const lookupValue = email ? email.trim() : student_id.trim();
    
    const [users] = await pool.query(
      `SELECT id, name, email, student_id FROM users WHERE ${lookupField} = ?`,
      [lookupValue]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Check if user has an email address
    if (!user.email) {
      return res.status(400).json({ 
        error: 'No email address found for this account. Please contact an administrator.' 
      });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store verification code in database
    await pool.query(
      `INSERT INTO password_reset_codes (user_id, code, expires_at, created_at) 
       VALUES (?, ?, ?, NOW())`,
      [user.id, verificationCode, expiresAt]
    );

    // Send email with verification code
    await sendPasswordResetEmail(user.email, verificationCode, user.name);

    res.status(200).json({ 
      message: 'Password reset verification code sent to your email',
      email: user.email // Return masked email for confirmation
    });
  } catch (error) {
    console.error('Request password reset error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ VERIFY PASSWORD RESET CODE
export const verifyPasswordResetCode = async (req, res) => {
  try {
    const { email, student_id, verificationCode } = req.body;

    if (!email && !student_id || !verificationCode) {
      return res.status(400).json({ 
        error: 'Email/Student ID and verification code are required' 
      });
    }

    // Find user by email or student_id
    const lookupField = email ? 'email' : 'student_id';
    const lookupValue = email ? email.trim() : student_id.trim();
    
    const [users] = await pool.query(
      `SELECT id FROM users WHERE ${lookupField} = ?`,
      [lookupValue]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = users[0].id;

    // Check if verification code is valid and not expired
    const [codes] = await pool.query(
      `SELECT * FROM password_reset_codes 
       WHERE user_id = ? AND code = ? AND expires_at > NOW() 
       ORDER BY created_at DESC LIMIT 1`,
      [userId, verificationCode]
    );

    if (codes.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Generate a temporary reset token (valid for 15 minutes)
    const resetToken = jwt.sign(
      { userId, type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Delete the used verification code
    await pool.query(
      `DELETE FROM password_reset_codes WHERE id = ?`,
      [codes[0].id]
    );

    res.status(200).json({ 
      message: 'Verification code verified successfully',
      resetToken,
      expiresIn: '15 minutes'
    });
  } catch (error) {
    console.error('Verify password reset code error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ RESET PASSWORD WITH TOKEN
export const resetPasswordWithToken = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ 
        error: 'Reset token and new password are required' 
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({ 
        error: 'New password must be at least 6 characters long' 
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        return res.status(400).json({ error: 'Invalid token type' });
      }
    } catch (jwtError) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword.trim(), SALT_ROUNDS);

    // Update password
    await pool.query(
      `UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?`,
      [hashedPassword, decoded.userId]
    );

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password with token error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ UPDATE USER PROFILE
export const updateProfile = async (req, res) => {
  try {
    const { id } = req.user; // From JWT token
    const { name, contact_number, email } = req.body;

    if (!name && !contact_number && !email) {
      return res.status(400).json({ 
        error: 'At least one field must be provided for update' 
      });
    }

    // Validate email if provided
    if (email && !validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email is already taken by another user
    if (email) {
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email.trim(), id]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Email already taken' });
      }
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];

    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name.trim());
    }

    if (contact_number !== undefined) {
      updateFields.push('contact_number = ?');
      updateValues.push(contact_number?.trim() || null);
    }

    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email.trim());
    }

    updateValues.push(id);

    await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
