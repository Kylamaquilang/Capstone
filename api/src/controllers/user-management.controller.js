import { pool } from '../database/db.js';
import { verifyToken } from '../middleware/auth.middleware.js';

// ✅ Get all users with status management
export const getAllUsersWithStatus = async (req, res) => {
  try {
    const [users] = await pool.query(
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
        year_level,
        section,
        status,
        role,
        is_active,
        profile_image,
        created_at,
        contact_number
       FROM users 
       WHERE is_active = 1
       ORDER BY created_at DESC`
    );

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Toggle user status (active/inactive)
export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean value' });
    }

    // Check if user exists
    const [users] = await pool.query('SELECT id, name, role FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Prevent admin from deactivating themselves
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    // Update user status
    await pool.query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [is_active, userId]
    );

    res.status(200).json({ 
      message: `User ${user.name} ${is_active ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        is_active: is_active
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Update user profile image
export const updateUserProfileImage = async (req, res) => {
  try {
    const { id } = req.user;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    // Update user profile image
    await pool.query(
      'UPDATE users SET profile_image = ? WHERE id = ?',
      [imageUrl, id]
    );

    res.status(200).json({ 
      message: 'Profile image updated successfully',
      profile_image: imageUrl
    });
  } catch (error) {
    console.error('Update profile image error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.user;

    const [users] = await pool.query(
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
        role,
        is_active,
        profile_image,
        contact_number,
        created_at
       FROM users 
       WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get user profile error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { name, contact_number, email } = req.body;

    if (!name && !contact_number && !email) {
      return res.status(400).json({ error: 'At least one field must be provided' });
    }

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name.trim());
    }

    if (contact_number !== undefined) {
      updateFields.push('contact_number = ?');
      updateValues.push(contact_number?.trim() || null);
    }

    if (email !== undefined) {
      // Check if email is already taken by another user
      const [existingUsers] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email.trim(), id]
      );
      
      if (existingUsers.length > 0) {
        return res.status(409).json({ error: 'Email is already taken by another user' });
      }
      
      updateFields.push('email = ?');
      updateValues.push(email.trim());
    }

    updateValues.push(id);

    await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Admin update user (for admin panel)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { year_level, section, degree, status } = req.body;

    if (!year_level && !section && !degree && !status) {
      return res.status(400).json({ error: 'At least one field must be provided' });
    }

    const updateFields = [];
    const updateValues = [];

    if (year_level !== undefined) {
      // Validate year level
      const validYearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
      if (year_level && !validYearLevels.includes(year_level)) {
        return res.status(400).json({ 
          error: 'Invalid year level. Must be one of: 1st Year, 2nd Year, 3rd Year, 4th Year' 
        });
      }
      updateFields.push('year_level = ?');
      updateValues.push(year_level || null);
    }

    if (section !== undefined) {
      updateFields.push('section = ?');
      updateValues.push(section?.trim() || null);
    }

    if (degree !== undefined) {
      // Validate degree
      const validDegrees = ['BEED', 'BSED', 'BSIT', 'BSHM'];
      if (degree && !validDegrees.includes(degree)) {
        return res.status(400).json({ 
          error: 'Invalid degree. Must be one of: BEED, BSED, BSIT, BSHM' 
        });
      }
      updateFields.push('degree = ?');
      updateValues.push(degree || null);
    }

    if (status !== undefined) {
      // Validate status
      const validStatuses = ['regular', 'irregular'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: 'Invalid status. Must be one of: regular, irregular' 
        });
      }
      updateFields.push('status = ?');
      updateValues.push(status || null);
    }

    updateValues.push(id);

    await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Delete user (soft delete by setting is_active to false)
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const [users] = await pool.query('SELECT id, name, role FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Soft delete by setting is_active to false and deleted_at timestamp
    await pool.query(
      'UPDATE users SET is_active = 0, deleted_at = NOW() WHERE id = ?',
      [userId]
    );

    res.status(200).json({ 
      message: `User ${user.name} deleted successfully`,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        is_active: false
      }
    });
  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

