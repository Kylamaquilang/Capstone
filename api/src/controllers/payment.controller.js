import { pool } from '../database/db.js';

// Track GCash payment selection (no actual payment processing)
export const selectGCashPayment = async (req, res) => {
  const { orderId, amount, description } = req.body;
  const userId = req.user.id;

  try {
    // Validate input
    if (!orderId || !amount || !description) {
      return res.status(400).json({ 
        error: 'Order ID, amount, and description are required' 
      });
    }

    // Verify order belongs to user
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Check if order is already paid
    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    console.log(`💳 GCash payment selected for order ${orderId} by user ${userId}`);
      
    // Generate a tracking ID for GCash selection
    const gcashTrackingId = `gcash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
    // Update order with GCash selection and set as unpaid
      await pool.query(
      'UPDATE orders SET payment_intent_id = ?, payment_status = ?, payment_method = ? WHERE id = ?',
      [gcashTrackingId, 'unpaid', 'gcash', orderId]
      );

    // Store payment transaction for tracking
      await pool.query(`
        INSERT INTO payment_transactions (
          order_id, 
          transaction_id, 
          amount, 
          payment_method, 
          status, 
          gateway_response
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        orderId,
      gcashTrackingId,
        amount,
        'gcash',
      'unpaid',
      JSON.stringify({ 
        method: 'gcash_selection', 
        message: 'GCash payment method selected - payment status set to unpaid',
        selected_at: new Date().toISOString()
      })
    ]);

    console.log(`✅ GCash payment selection tracked for order ${orderId}`);

    res.json({
      success: true,
      payment_intent_id: gcashTrackingId,
      payment_status: 'unpaid',
      payment_method: 'gcash',
      message: 'GCash payment method selected. Order status set to unpaid.',
      orderId: orderId
    });

  } catch (error) {
    console.error('GCash payment selection error:', error);
    res.status(500).json({ 
      error: 'Failed to process GCash selection',
      details: error.message
    });
  }
};

// Get payment status
export const getPaymentStatus = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  try {
    const [orders] = await pool.query(
      'SELECT payment_status, payment_intent_id, payment_method FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];
      
      res.json({
        order_id: orderId,
        payment_status: order.payment_status,
      payment_method: order.payment_method,
      payment_intent_id: order.payment_intent_id
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
};

// Get GCash payment statistics (for admin tracking)
export const getGCashStats = async (req, res) => {
  try {
    // Get total GCash selections
    const [gcashStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_gcash_selections,
        COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid_gcash_orders,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_gcash_orders,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_gcash_revenue
      FROM orders 
      WHERE payment_method = 'gcash'
    `);

    // Get GCash selections by date
    const [gcashByDate] = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as selections,
        COUNT(CASE WHEN payment_status = 'unpaid' THEN 1 END) as unpaid,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid
      FROM orders 
      WHERE payment_method = 'gcash'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `);

    res.json({
      success: true,
      stats: gcashStats[0],
      daily_breakdown: gcashByDate
    });

  } catch (error) {
    console.error('Get GCash stats error:', error);
    res.status(500).json({ error: 'Failed to get GCash statistics' });
  }
};
