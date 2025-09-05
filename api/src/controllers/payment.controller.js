import { pool } from '../database/db.js';
import axios from 'axios';

// PayMongo configuration
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_PUBLIC_KEY = process.env.PAYMONGO_PUBLIC_KEY;
const PAYMONGO_BASE_URL = 'https://api.paymongo.com/v1';

// Create PayMongo payment intent for GCash
export const createGCashPayment = async (req, res) => {
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

    // Check if PayMongo is configured
    if (!PAYMONGO_SECRET_KEY || !PAYMONGO_PUBLIC_KEY) {
      console.log('PayMongo not configured, creating mock payment for development');
      
      // Create a mock payment for development
      const mockPaymentIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Update order with mock payment intent ID
      await pool.query(
        'UPDATE orders SET payment_intent_id = ?, payment_status = ? WHERE id = ?',
        [mockPaymentIntentId, 'pending', orderId]
      );

      // Store payment transaction
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
        mockPaymentIntentId,
        amount,
        'gcash',
        'pending',
        JSON.stringify({ mock: true, message: 'Development mode - PayMongo not configured' })
      ]);

      return res.json({
        success: true,
        payment_intent_id: mockPaymentIntentId,
        client_key: 'mock_key',
        payment_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/success?order_id=${orderId}&mock=true`,
        payment_data: {
          attributes: {
            next_action: {
              redirect: {
                url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/success?order_id=${orderId}&mock=true`
              }
            }
          }
        },
        mock: true,
        message: 'Development mode - PayMongo not configured. Payment will be marked as successful.'
      });
    }

    // Create PayMongo payment intent
    const paymentIntentData = {
      data: {
        attributes: {
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'PHP',
          capture_method: 'automatic',
          statement_descriptor: 'CPC Store',
          description: description,
          metadata: {
            order_id: orderId,
            user_id: userId
          }
        }
      }
    };

    const paymentIntentResponse = await axios.post(
      `${PAYMONGO_BASE_URL}/payment_intents`,
      paymentIntentData,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const paymentIntent = paymentIntentResponse.data.data;

    // Create payment method for GCash
    const paymentMethodData = {
      data: {
        attributes: {
          type: 'gcash',
          details: {
            email: req.user.email || 'customer@example.com'
          }
        }
      }
    };

    const paymentMethodResponse = await axios.post(
      `${PAYMONGO_BASE_URL}/payment_methods`,
      paymentMethodData,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const paymentMethod = paymentMethodResponse.data.data;

    // Attach payment method to payment intent
    const attachData = {
      data: {
        attributes: {
          payment_method: paymentMethod.id,
          return_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/success?order_id=${orderId}`,
          cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/cancel?order_id=${orderId}`
        }
      }
    };

    const attachResponse = await axios.post(
      `${PAYMONGO_BASE_URL}/payment_intents/${paymentIntent.id}/attach`,
      attachData,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const attachedPayment = attachResponse.data.data;

    // Update order with payment intent ID
    await pool.query(
      'UPDATE orders SET payment_intent_id = ?, payment_status = ? WHERE id = ?',
      [paymentIntent.id, 'pending', orderId]
    );

    // Store payment transaction
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
      paymentIntent.id,
      amount,
      'gcash',
      'pending',
      JSON.stringify(attachedPayment)
    ]);

    res.json({
      success: true,
      payment_intent_id: paymentIntent.id,
      client_key: PAYMONGO_PUBLIC_KEY,
      payment_url: attachedPayment.attributes.next_action?.redirect?.url,
      payment_data: attachedPayment
    });

  } catch (error) {
    console.error('PayMongo payment error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Payment processing failed',
      details: error.response?.data || error.message
    });
  }
};

// Mock payment success for development
export const mockPaymentSuccess = async (req, res) => {
  const { orderId } = req.query;
  
  try {
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Update order status to paid
    await pool.query(
      'UPDATE orders SET payment_status = ?, status = ? WHERE id = ?',
      ['paid', 'processing', orderId]
    );

    // Update payment transaction
    await pool.query(
      'UPDATE payment_transactions SET status = ? WHERE order_id = ?',
      ['completed', orderId]
    );

    console.log(`Mock payment completed for order ${orderId}`);

    res.json({
      success: true,
      message: 'Payment completed successfully (mock)',
      orderId: orderId
    });

  } catch (error) {
    console.error('Mock payment success error:', error);
    res.status(500).json({ error: 'Failed to process mock payment' });
  }
};

// Handle PayMongo webhook
export const handlePayMongoWebhook = async (req, res) => {
  const signature = req.headers['paymongo-signature'];
  
  try {
    // Verify webhook signature (implement signature verification)
    // For now, we'll process the webhook directly
    
    const event = req.body;
    
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.attributes;
      const orderId = paymentIntent.metadata?.order_id;
      
      if (orderId) {
        // Update order status
        await pool.query(
          'UPDATE orders SET payment_status = ?, status = ? WHERE id = ?',
          ['paid', 'processing', orderId]
        );

        // Update payment transaction
        await pool.query(
          'UPDATE payment_transactions SET status = ?, gateway_response = ? WHERE transaction_id = ?',
          ['completed', JSON.stringify(event), paymentIntent.id]
        );

        console.log(`Payment completed for order ${orderId}`);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Get payment status
export const getPaymentStatus = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  try {
    const [orders] = await pool.query(
      'SELECT payment_status, payment_intent_id FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    if (order.payment_intent_id) {
      // Get payment status from PayMongo
      const paymentResponse = await axios.get(
        `${PAYMONGO_BASE_URL}/payment_intents/${order.payment_intent_id}`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const paymentData = paymentResponse.data.data;
      
      res.json({
        order_id: orderId,
        payment_status: order.payment_status,
        paymongo_status: paymentData.attributes.status,
        payment_data: paymentData
      });
    } else {
      res.json({
        order_id: orderId,
        payment_status: order.payment_status
      });
    }

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
};

// Cancel payment
export const cancelPayment = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  try {
    const [orders] = await pool.query(
      'SELECT payment_intent_id FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    if (order.payment_intent_id) {
      // Cancel payment intent in PayMongo
      await axios.post(
        `${PAYMONGO_BASE_URL}/payment_intents/${order.payment_intent_id}/cancel`,
        {},
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update order status
      await pool.query(
        'UPDATE orders SET payment_status = ?, status = ? WHERE id = ?',
        ['cancelled', 'cancelled', orderId]
      );

      // Update payment transaction
      await pool.query(
        'UPDATE payment_transactions SET status = ? WHERE transaction_id = ?',
        ['cancelled', order.payment_intent_id]
      );
    }

    res.json({ message: 'Payment cancelled successfully' });

  } catch (error) {
    console.error('Cancel payment error:', error);
    res.status(500).json({ error: 'Failed to cancel payment' });
  }
};
