import { pool } from '../database/db.js'
import { createOrderStatusNotification } from '../utils/notification-helper.js'

// Helper function to create admin notifications for new orders
const createAdminOrderNotification = async (orderId, totalAmount, paymentMethod) => {
  try {
    // Get all admin users
    const [adminUsers] = await pool.query(`
      SELECT id, name FROM users WHERE role = 'admin'
    `);
    
    // Get customer info for the order
    const [orderInfo] = await pool.query(`
      SELECT u.name as customer_name, u.email as customer_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [orderId]);
    
    const customerName = orderInfo[0]?.customer_name || 'Customer';
    
    // Get product details for the order
    const [productInfo] = await pool.query(`
      SELECT p.name as product_name, oi.quantity, ps.size as size_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_sizes ps ON oi.size_id = ps.id
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `, [orderId]);
    
    // Create product summary
    let productSummary = '';
    if (productInfo.length > 0) {
      if (productInfo.length === 1) {
        const item = productInfo[0];
        productSummary = item.size_name 
          ? `${item.quantity}x ${item.product_name} (${item.size_name})`
          : `${item.quantity}x ${item.product_name}`;
      } else if (productInfo.length <= 3) {
        productSummary = productInfo.map(item => 
          item.size_name 
            ? `${item.quantity}x ${item.product_name} (${item.size_name})`
            : `${item.quantity}x ${item.product_name}`
        ).join(', ');
      } else {
        const firstItem = productInfo[0];
        const firstItemText = firstItem.size_name 
          ? `${firstItem.quantity}x ${firstItem.product_name} (${firstItem.size_name})`
          : `${firstItem.quantity}x ${firstItem.product_name}`;
        productSummary = `${firstItemText} and ${productInfo.length - 1} more items`;
      }
    }
    
    // Create notification for each admin user
    for (const admin of adminUsers) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, related_id, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        admin.id,
        `🆕 New Order`,
        `New order #${orderId} from ${customerName} for ${productSummary} - ₱${totalAmount.toFixed(2)}`,
        'admin_order',
        orderId
      ]);
    }
    
    console.log(`✅ Admin notifications created for order #${orderId}`);
  } catch (error) {
    console.error('❌ Error creating admin notifications:', error);
  }
}

export const checkout = async (req, res) => {
  const user_id = req.user.id
  const { payment_method, pay_at_counter, cart_item_ids, products } = req.body

  if (!payment_method) {
    return res.status(400).json({ 
      error: 'Payment method required',
      message: 'Please select a payment method'
    })
  }

  try {
    let cartItems;
    
    // Check if we're processing direct products (BUY NOW flow) or cart items
    if (products && products.length > 0) {
      // Process direct products (BUY NOW flow)
      cartItems = [];
      for (const product of products) {
        const [productData] = await pool.query(`
          SELECT p.id as product_id, p.stock, p.price, ps.id as size_id, ps.stock as size_stock, ps.price as size_price
          FROM products p
          LEFT JOIN product_sizes ps ON p.id = ps.product_id AND ps.id = ?
          WHERE p.id = ?
        `, [product.size_id || null, product.product_id]);
        
        if (productData.length === 0) {
          return res.status(404).json({ 
            error: 'Product not found',
            message: `Product ID ${product.product_id} not found`
          });
        }
        
        const item = productData[0];
        cartItems.push({
          cart_id: null, // No cart ID for direct products
          quantity: product.quantity,
          product_id: item.product_id,
          size_id: product.size_id || null,
          stock: item.size_id ? item.size_stock : item.stock,
          price: item.size_id ? item.size_price : item.price
        });
      }
    } else if (cart_item_ids && cart_item_ids.length > 0) {
      // Process only selected cart items
      const placeholders = cart_item_ids.map(() => '?').join(',');
      [cartItems] = await pool.query(`
        SELECT c.id AS cart_id, c.quantity, c.product_id, c.size_id,
               p.stock, p.price, ps.stock as size_stock, ps.price as size_price
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        LEFT JOIN product_sizes ps ON c.size_id = ps.id
        WHERE c.user_id = ? AND c.id IN (${placeholders})
      `, [user_id, ...cart_item_ids])
    } else {
      // Fallback: process all cart items
      [cartItems] = await pool.query(`
        SELECT c.id AS cart_id, c.quantity, c.product_id, c.size_id,
               p.stock, p.price, ps.stock as size_stock, ps.price as size_price
        FROM cart_items c
        JOIN products p ON c.product_id = p.id
        LEFT JOIN product_sizes ps ON c.size_id = ps.id
        WHERE c.user_id = ?
      `, [user_id])
    }

    if (cartItems.length === 0) {
      return res.status(400).json({ 
        error: 'Empty cart',
        message: 'Your cart is empty. Please add items before checkout.'
      })
    }

    for (const item of cartItems) {
      // Check stock based on whether it's a size-specific item or general product
      const availableStock = item.size_id ? item.size_stock : item.stock
      if (item.quantity > availableStock) {
        return res.status(400).json({
          error: 'Insufficient stock',
          message: `Insufficient stock for product ID ${item.product_id}`
        })
      }
    }

    const total_amount = cartItems.reduce((sum, item) => {
      const price = item.size_id ? item.size_price : item.price
      return sum + price * item.quantity
    }, 0)

    // Generate unique order number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const [existingOrders] = await pool.query(`
      SELECT COUNT(*) as count FROM orders WHERE order_number LIKE ?
    `, [`ORD${dateStr}%`]);
    
    const orderNumber = `ORD${dateStr}${String(existingOrders[0].count + 1).padStart(4, '0')}`;

    const [orderResult] = await pool.query(`
      INSERT INTO orders (user_id, order_number, total_amount, payment_method, payment_status, status, pay_at_counter)
      VALUES (?, ?, ?, ?, 'unpaid', 'pending', ?)
    `, [user_id, orderNumber, total_amount, payment_method, pay_at_counter || false])

    const orderId = orderResult.insertId

    for (const item of cartItems) {
      // Get product name
      const [productInfo] = await pool.query(`SELECT name FROM products WHERE id = ?`, [item.product_id]);
      const productName = productInfo[0]?.name || 'Unknown Product';
      
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, size_id, product_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.size_id || null, productName, item.quantity, item.size_price || item.price, (item.size_price || item.price) * item.quantity]
      )

      // Update stock and log inventory movement
      if (item.size_id) {
        await pool.query(
          `UPDATE product_sizes SET stock = stock - ? WHERE id = ?`,
          [item.quantity, item.size_id]
        )
        
        // Log inventory movement for size-specific items
        await pool.query(`
          INSERT INTO inventory_movements (product_id, size_id, movement_type, quantity_change, reason, order_id, created_at)
          VALUES (?, ?, 'sale', ?, 'Order placed', ?, NOW())
        `, [item.product_id, item.size_id, -item.quantity, orderId])
      } else {
        await pool.query(
          `UPDATE products SET stock = stock - ? WHERE id = ?`,
          [item.quantity, item.product_id]
        )
        
        // Log inventory movement for general products
        await pool.query(`
          INSERT INTO inventory_movements (product_id, movement_type, quantity_change, reason, order_id, created_at)
          VALUES (?, 'sale', ?, 'Order placed', ?, NOW())
        `, [item.product_id, -item.quantity, orderId])
      }
    }

    // Only delete cart items if we processed cart items (not direct products)
    if (products && products.length > 0) {
      // For direct products (BUY NOW), don't delete cart items since they weren't in cart
      console.log('Direct product checkout - no cart items to delete');
    } else if (cart_item_ids && cart_item_ids.length > 0) {
      // Delete only the selected cart items
      const placeholders = cart_item_ids.map(() => '?').join(',');
      await pool.query(`DELETE FROM cart_items WHERE user_id = ? AND id IN (${placeholders})`, [user_id, ...cart_item_ids])
    } else {
      // Fallback: delete all cart items (for backward compatibility)
      await pool.query(`DELETE FROM cart_items WHERE user_id = ?`, [user_id])
    }

    // Create notification for order placement
    await createOrderStatusNotification(user_id, orderId, 'pending');

    // Create admin notifications for new order
    await createAdminOrderNotification(orderId, total_amount, payment_method);

    res.status(200).json({
      success: true,
      message: 'Checkout successful',
      orderId,
      total_amount
    })
  } catch (err) {
    console.error('Checkout error:', err)
    
    // Handle specific database errors
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ 
        error: 'Database configuration error',
        message: 'Required tables not found. Please contact administrator.'
      });
    }
    
    if (err.code === 'ER_BAD_DB_ERROR') {
      return res.status(500).json({ 
        error: 'Database connection error',
        message: 'Unable to connect to database. Please try again.'
      });
    }
    
    res.status(500).json({ 
      error: 'Server error',
      message: 'Failed to process checkout. Please try again.'
    })
  }
}
