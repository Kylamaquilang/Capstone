import { pool } from '../database/db.js';

// Admin Dashboard Controller
export const getAdminDashboard = async (req, res) => {
  try {
    const [[userCount]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM dashboard_users');
    const [[orderCount]] = await pool.query('SELECT COUNT(*) AS totalOrders FROM orders');
    const [[totalSales]] = await pool.query('SELECT SUM(total_amount) AS totalSales FROM orders');

    res.json({
      totalUsers: userCount.totalUsers,
      totalOrders: orderCount.totalOrders,
      totalSales: totalSales.totalSales || 0,
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Student/User Dashboard Controller
export const getUserDashboard = async (req, res) => {
  try {
    const student_id = req.user.student_id;

    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ orders });
  } catch (error) {
    console.error('User Dashboard Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

