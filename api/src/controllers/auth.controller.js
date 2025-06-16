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

    // Set default passwords
    const defaultPassword = role === 'admin' ? 'admin123' : '123456';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Check if user exists
    const checkQuery = role === 'admin'
      ? 'SELECT * FROM users WHERE email = ?'
      : 'SELECT * FROM users WHERE student_id = ?';

    const [existing] = await pool.query(checkQuery, [role === 'admin' ? email : student_id]);

    if (existing.length > 0) {
      return res.status(409).json({ error: `${role} already exists` });
    }

    await pool.query(
      'INSERT INTO users (student_id, email, name, password, role) VALUES (?, ?, ?, ?, ?)',
      [student_id || null, email || null, name, hashedPassword, role]
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

    const [users] = await pool.query(
      student_id
        ? 'SELECT * FROM users WHERE student_id = ?'
        : 'SELECT * FROM users WHERE email = ?',
      [student_id || email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, student_id: user.student_id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Signin error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ LOGOUT (client-side)
export const logout = async (req, res) => {
  try {
    res.status(200).json({ message: 'Logout successful (client-side handled)' });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
