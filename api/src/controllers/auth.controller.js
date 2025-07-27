import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// ✅ SIGNUP for both roles
export const signup = async (req, res) => {
  try {
    const { role, name, student_id, email } = req.body;

    if (!role || !name || (role === 'student' && !student_id) || (role === 'admin' && !email)) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const defaultPassword = role === 'admin' ? 'admin123' : '123456';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const checkQuery = role === 'admin'
      ? 'SELECT * FROM users WHERE email = ?'
      : 'SELECT * FROM users WHERE student_id = ?';

    const checkValue = role === 'admin' ? email.trim() : student_id.trim();
    const [existing] = await pool.query(checkQuery, [checkValue]);

    if (existing.length > 0) {
      return res.status(409).json({ error: `${role} already exists` });
    }

    await pool.query(
      'INSERT INTO users (student_id, email, name, password, role) VALUES (?, ?, ?, ?, ?)',
      [
        student_id?.trim() || null,
        email?.trim() || null,
        name.trim(),
        hashedPassword,
        role,
      ]
    );

    res.status(201).json({ message: `${role} registered successfully` });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ SIGNIN for both roles
export const signin = async (req, res) => {
  try {
    const { student_id, email, password } = req.body;

    if ((!student_id && !email) || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const identifier = student_id?.trim() || email.trim();
    const [users] = await pool.query(
      'SELECT * FROM users WHERE ' + (student_id ? 'student_id = ?' : 'email = ?'),
      [identifier]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password.trim(), user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        student_id: user.student_id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Signin error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { student_id, newPassword } = req.body;

    if (!student_id || !newPassword) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    const [result] = await pool.query(
      'UPDATE users SET password = ? WHERE student_id = ?',
      [hashedPassword, student_id.trim()]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ LOGOUT — client handles token removal
export const logout = async (req, res) => {
  try {
    res.status(200).json({ message: 'Logout successful (handled on client)' });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
