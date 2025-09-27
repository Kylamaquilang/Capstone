import { pool } from '../database/db.js'
import { createOrderStatusNotification, createAdminOrderNotification } from '../utils/notification-helper.js'
import { emitUserNotification, emitAdminNotification, emitInventoryUpdate, emitNewOrder } from '../utils/socket-helper.js'


export const checkout = async (req, res) => {
  const user_id = req.user.id
  const { payment_method, pay_at_counter, cart_item_ids, products } = req.body

  console.log('🛒 Checkout request:', { user_id, payment_method, pay_at_counter, cart_item_ids, products });

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
        
        // Validate that we have a valid price
        const price = item.size_id ? item.size_price : item.price;
        if (!price || isNaN(price)) {
          return res.status(400).json({ 
            error: 'Invalid price',
            message: `Price not found for product ID ${product.product_id}${product.size_id ? ` with size ID ${product.size_id}` : ''}`
          });
        }
        
        cartItems.push({
          cart_id: null, // No cart ID for direct products
          quantity: product.quantity,
          product_id: item.product_id,
          size_id: product.size_id || null,
          stock: item.size_id ? item.size_stock : item.stock,
          price: parseFloat(price),
          size_price: parseFloat(item.size_price || 0)
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

    // Convert prices to numbers for all cart items
    cartItems = cartItems.map(item => ({
      ...item,
      price: parseFloat(item.price || 0),
      size_price: parseFloat(item.size_price || 0)
    }));

    if (cartItems.length === 0) {
      return res.status(400).json({ 
        error: 'Empty cart',
        message: 'Your cart is empty. Please add items before checkout.'
      })
    }

    // Validate stock availability for all items
    for (const item of cartItems) {
      // Check stock based on whether it's a size-specific item or general product
      const availableStock = item.size_id ? item.size_stock : item.stock
      console.log(`🔍 Stock validation: Product ID ${item.product_id}, Size ID ${item.size_id || 'N/A'}, Available: ${availableStock}, Requested: ${item.quantity}`);
      
      if (item.quantity > availableStock) {
        return res.status(400).json({
          error: 'Insufficient stock',
          message: `Insufficient stock for product ID ${item.product_id}. Available: ${availableStock}, Requested: ${item.quantity}`
        })
      }
    }

    console.log('🔍 Cart items after processing:', cartItems.map(item => ({
      product_id: item.product_id,
      size_id: item.size_id,
      quantity: item.quantity,
      price: item.price,
      size_price: item.size_price,
      calculated_price: item.size_id ? item.size_price : item.price
    })));

    const total_amount = cartItems.reduce((sum, item) => {
      const price = item.size_id ? item.size_price : item.price
      const itemTotal = price * item.quantity
      
      console.log(`💰 Price calculation: Product ${item.product_id}, Size ${item.size_id}, Price ${price}, Quantity ${item.quantity}, Total ${itemTotal}`);
      
      if (isNaN(itemTotal)) {
        throw new Error(`Invalid price calculation for product ID ${item.product_id}: price=${price}, quantity=${item.quantity}`)
      }
      
      return sum + itemTotal
    }, 0)

    console.log('💰 Total amount calculated:', total_amount);

    // Validate total amount
    if (isNaN(total_amount) || total_amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid total amount',
        message: 'Unable to calculate order total. Please check product prices.'
      })
    }

    // Generate unique order number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const [existingOrders] = await pool.query(`
      SELECT COUNT(*) as count FROM orders WHERE order_number LIKE ?
    `, [`ORD${dateStr}%`]);
    
    const orderNumber = `ORD${dateStr}${String(existingOrders[0].count + 1).padStart(4, '0')}`;

    // Start database transaction to ensure atomicity
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    let orderId; // Declare orderId outside the try block

    try {
      // Create order
      const [orderResult] = await connection.query(`
        INSERT INTO orders (user_id, order_number, total_amount, payment_method, payment_status, status, pay_at_counter)
        VALUES (?, ?, ?, ?, 'unpaid', 'pending', ?)
      `, [user_id, orderNumber, total_amount, payment_method, pay_at_counter || false])

      orderId = orderResult.insertId

      // Process each item in the order
      for (const item of cartItems) {
        // Get product name
        const [productInfo] = await connection.query(`SELECT name FROM products WHERE id = ?`, [item.product_id]);
        const productName = productInfo[0]?.name || 'Unknown Product';
        
        // Get product cost price
        const [productData] = await connection.query(
          `SELECT original_price FROM products WHERE id = ?`,
          [item.product_id]
        );
        const costPrice = productData[0]?.original_price || 0;

        // Insert order item
        await connection.query(
          `INSERT INTO order_items (order_id, product_id, size_id, product_name, quantity, unit_price, unit_cost, total_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.product_id, item.size_id || null, productName, item.quantity, item.size_price || item.price, costPrice, (item.size_price || item.price) * item.quantity]
        )

        // Log inventory movement - the database trigger will handle stock deduction
        if (item.size_id) {
          console.log(`📦 Processing size-specific item: Product ID ${item.product_id}, Size ID ${item.size_id}, Quantity ${item.quantity}`);
          
          // Check stock before processing
          const [currentStock] = await connection.query(
            `SELECT stock FROM product_sizes WHERE id = ?`,
            [item.size_id]
          );
          
          if (currentStock.length === 0) {
            throw new Error(`Size ID ${item.size_id} not found`);
          }
          
          const availableStock = currentStock[0].stock;
          console.log(`📦 Size ID ${item.size_id} current stock: ${availableStock}, requested: ${item.quantity}`);
          
          if (availableStock < item.quantity) {
            throw new Error(`Insufficient stock for size ID ${item.size_id}. Available: ${availableStock}, Requested: ${item.quantity}`);
          }
          
          // Log inventory movement - trigger will deduct stock automatically
          await connection.query(`
            INSERT INTO inventory_movements (product_id, size_id, movement_type, quantity_change, reason, order_id, created_at)
            VALUES (?, ?, 'sale', ?, 'Order placed', ?, NOW())
          `, [item.product_id, item.size_id, -item.quantity, orderId])
          
          console.log(`✅ Size-specific stock deduction logged for Size ID ${item.size_id} (trigger will handle deduction)`);
        } else {
          // Check stock before processing
          const [currentStock] = await connection.query(
            `SELECT stock FROM products WHERE id = ?`,
            [item.product_id]
          );
          
          if (currentStock.length === 0) {
            throw new Error(`Product ID ${item.product_id} not found`);
          }
          
          const availableStock = currentStock[0].stock;
          console.log(`📦 Product ID ${item.product_id} current stock: ${availableStock}, requested: ${item.quantity}`);
          
          if (availableStock < item.quantity) {
            throw new Error(`Insufficient stock for product ID ${item.product_id}. Available: ${availableStock}, Requested: ${item.quantity}`);
          }
          
          // Log inventory movement - trigger will deduct stock automatically
          await connection.query(`
            INSERT INTO inventory_movements (product_id, movement_type, quantity_change, reason, order_id, created_at)
            VALUES (?, 'sale', ?, 'Order placed', ?, NOW())
          `, [item.product_id, -item.quantity, orderId])
          
          console.log(`✅ General product stock deduction logged for Product ID ${item.product_id} (trigger will handle deduction)`);
        }
      }

      // Only delete cart items if we processed cart items (not direct products)
      if (products && products.length > 0) {
        // For direct products (BUY NOW), don't delete cart items since they weren't in cart
        console.log('Direct product checkout - no cart items to delete');
      } else if (cart_item_ids && cart_item_ids.length > 0) {
        // Delete only the selected cart items
        const placeholders = cart_item_ids.map(() => '?').join(',');
        await connection.query(`DELETE FROM cart_items WHERE user_id = ? AND id IN (${placeholders})`, [user_id, ...cart_item_ids])
      } else {
        // Fallback: delete all cart items (for backward compatibility)
        await connection.query(`DELETE FROM cart_items WHERE user_id = ?`, [user_id])
      }

      // Commit the transaction
      await connection.commit();
      
    } catch (error) {
      // Rollback the transaction on error
      console.error('❌ Checkout transaction error:', error);
      await connection.rollback();
      throw error;
    } finally {
      // Release the connection
      connection.release();
    }

    console.log('✅ Transaction completed successfully, orderId:', orderId);

    // Emit inventory updates and new order to admin
    try {
      const io = req.app.get('io');
      if (io) {
        // Emit inventory updates for each product
        for (const item of items) {
          emitInventoryUpdate(io, {
            productId: item.product_id,
            productName: item.product_name,
            quantityChange: -item.quantity,
            movementType: 'sale',
            reason: 'Order placed',
            orderId: orderId
          });
        }
        
        // Emit new order event
        emitNewOrder(io, {
          orderId: orderId,
          userId: user_id,
          totalAmount: total_amount,
          paymentMethod: payment_method,
          itemCount: items.length,
          timestamp: new Date().toISOString()
        });
        
        console.log('📡 Real-time inventory updates and new order sent to admin');
      }
    } catch (socketError) {
      console.error('❌ Error emitting inventory updates:', socketError);
      // Don't fail the checkout if socket emission fails
    }

    // Create user notification for order placed
    try {
      console.log('📧 Creating user notification...');
      const userNotification = await createOrderStatusNotification(user_id, orderId, 'pending');
      console.log('✅ User notification created');
      
      // Emit real-time notification to user
      const io = req.app.get('io');
      if (io) {
        emitUserNotification(io, user_id, {
          title: userNotification.title,
          message: userNotification.message,
          type: 'system',
          orderId: orderId,
          status: 'pending',
          read: false
        });
        console.log('📡 Real-time user notification sent');
      }
    } catch (notificationError) {
      console.error('❌ Error creating user notification:', notificationError);
      // Don't fail the checkout if notification fails
    }

    // Create admin notifications for new order (outside transaction)
    try {
      console.log('📧 Creating admin notification...');
      const adminNotification = await createAdminOrderNotification(orderId, total_amount, payment_method);
      console.log('✅ Admin notification created');
      
      // Emit real-time notification to admin
      const io = req.app.get('io');
      if (io) {
        emitAdminNotification(io, {
          title: adminNotification.title,
          message: adminNotification.message,
          type: 'admin_order',
          orderId: orderId,
          customerName: adminNotification.customerName,
          studentId: adminNotification.studentId,
          totalAmount: adminNotification.totalAmount,
          paymentMethod: adminNotification.paymentMethod,
          paymentStatus: adminNotification.paymentStatus,
          read: false
        });
        console.log('📡 Real-time admin notification sent');
      }
    } catch (notificationError) {
      console.error('❌ Error creating admin notification:', notificationError);
      // Don't fail the checkout if notification fails
    }

    console.log('🎉 Checkout completed successfully, sending response...');
    res.status(200).json({
      success: true,
      message: 'Checkout successful',
      orderId,
      total_amount,
      payment_method,
      payment_status: payment_method === 'gcash' ? 'unpaid' : 'pending'
    })
  } catch (err) {
    console.error('❌ Checkout error:', err);
    console.error('❌ Error stack:', err.stack);
    
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
      message: 'Failed to process checkout. Please try again.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    })
  }
}
