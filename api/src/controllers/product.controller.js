import { pool } from '../database/db.js';
import {
    validateId,
    validateImageUrl,
    validateName,
    validatePagination,
    validatePrice,
    validateSize,
    validateStock
} from '../utils/validation.js';
import { emitAdminDataRefresh, emitDataRefresh } from '../utils/socket-helper.js';
import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  logger,
  asyncHandler 
} from '../utils/errorHandler.js';

// Low stock threshold
const LOW_STOCK_THRESHOLD = 5;

// Stock movement types
const STOCK_MOVEMENT_TYPES = {
  PURCHASE: 'purchase',
  SALE: 'sale',
  ADJUSTMENT: 'adjustment',
  RETURN: 'return'
};

// ✅ Get All Products - Simple version for frontend
export const getAllProductsSimple = async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.original_price,
        p.stock,
        p.image,
        p.created_at,
        p.last_restock_date,
        c.name as category_name,
        c.name as category
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.name, p.created_at DESC
    `);

    // Get sizes for each product
    const productsWithSizes = await Promise.all(
      products.map(async (product) => {
        try {
          const [sizes] = await pool.query(
            `SELECT id, size, stock, price, is_active 
             FROM product_sizes 
             WHERE product_id = ? AND is_active = 1 
             ORDER BY 
               CASE size 
                 WHEN 'NONE' THEN 0
                 WHEN 'XS' THEN 1 
                 WHEN 'S' THEN 2 
                 WHEN 'M' THEN 3 
                 WHEN 'L' THEN 4 
                 WHEN 'XL' THEN 5 
                 WHEN 'XXL' THEN 6 
                 ELSE 7 
               END`,
            [product.id]
          );
          
          return {
            id: product.id,
            product_code: `PRD${String(product.id).padStart(3, '0')}`,
            name: product.name,
            description: product.description,
            price: parseFloat(product.price),
            original_price: parseFloat(product.original_price || 0),
            stock: parseInt(product.stock),
            image_url: product.image ? product.image : null,
            image: product.image ? product.image : null,
            unit_of_measure: 'pcs',
            supplier: 'N/A',
            reorder_level: 5,
            updated_by: 'N/A',
            created_at: product.created_at,
            last_restock_date: product.last_restock_date,
            category_name: product.category_name,
            category: product.category || 'Other',
            sizes: sizes.map(size => ({
              id: size.id,
              size: size.size,
              stock: parseInt(size.stock),
              price: parseFloat(size.price)
            }))
          };
        } catch (error) {
          console.error(`Error fetching sizes for product ${product.id}:`, error);
          return {
            id: product.id,
            product_code: `PRD${String(product.id).padStart(3, '0')}`,
            name: product.name,
            description: product.description,
            price: parseFloat(product.price),
            original_price: parseFloat(product.original_price || 0),
            stock: parseInt(product.stock),
            image_url: product.image ? product.image : null,
            image: product.image ? product.image : null,
            unit_of_measure: 'pcs',
            supplier: 'N/A',
            reorder_level: 5,
            updated_by: 'N/A',
            created_at: product.created_at,
            last_restock_date: product.last_restock_date,
            category_name: product.category_name,
            category: product.category || 'Other',
            sizes: []
          };
        }
      })
    );

    // Group products by name
    const groupedProducts = {};
    productsWithSizes.forEach(product => {
      if (!groupedProducts[product.name]) {
        groupedProducts[product.name] = {
          ...product,
          sizes: []
        };
      }
      
      // Add sizes from this product to the grouped product
      if (product.sizes && product.sizes.length > 0) {
        groupedProducts[product.name].sizes.push(...product.sizes);
      } else {
        // If no sizes, add a default "NONE" size
        groupedProducts[product.name].sizes.push({
          id: `default-${product.id}`,
          size: 'NONE',
          stock: product.stock,
          price: product.price
        });
      }
    });

    // Convert grouped products back to array
    const finalProducts = Object.values(groupedProducts);

    res.json(finalProducts);
  } catch (err) {
    console.error('Get Products Simple Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Create Product
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, original_price, stock, sizes, category_id, image } = req.body;
    
    console.log('🔍 Received product data:', { name, description, price, original_price, stock, sizes, category_id, image });

    // Enhanced validation
    if (!validateName(name)) {
      return res.status(400).json({ 
        error: 'Name is required and must be 2-50 characters long' 
      });
    }

    if (!validatePrice(price)) {
      return res.status(400).json({ 
        error: 'Valid selling price is required' 
      });
    }

    if (!validatePrice(original_price)) {
      return res.status(400).json({ 
        error: 'Valid cost price is required' 
      });
    }

    if (Number(price) <= Number(original_price)) {
      return res.status(400).json({ 
        error: 'Selling price must be higher than cost price' 
      });
    }

    if (!validateStock(stock)) {
      return res.status(400).json({ 
        error: 'Valid stock quantity is required' 
      });
    }

    if (image && !validateImageUrl(image)) {
      return res.status(400).json({ 
        error: 'Invalid image URL format' 
      });
    }

    // Check if category exists if provided
    if (category_id) {
      const [categories] = await pool.query('SELECT id FROM categories WHERE id = ?', [category_id]);
      if (categories.length === 0) {
        return res.status(400).json({ error: 'Category not found' });
      }
    }

    // Allow duplicate product names - they will be grouped by name in the frontend

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert product
      const [productResult] = await connection.query(
        `INSERT INTO products (name, description, price, original_price, stock, category_id, image, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          name.trim(),
          description?.trim() || null,
          parseFloat(price),
          parseFloat(original_price),
          parseInt(stock),
          category_id || null,
          image?.trim() || null
        ]
      );

      const productId = productResult.insertId;

      // If initial stock is provided, create initial stock transaction
      if (parseInt(stock) > 0) {
        console.log(`📦 Creating initial stock transaction for Product ID ${productId} with ${stock} units`);
        
        // Insert initial stock transaction
        await connection.query(
          `INSERT INTO stock_transactions (product_id, transaction_type, quantity, reference_no, source, note, created_by, created_at)
           VALUES (?, 'IN', ?, ?, 'initial_stock', 'Initial stock for new product', 1, NOW())`,
          [productId, parseInt(stock), `INIT-${productId}`]
        );

        // Initialize stock balance
        await connection.query(
          `INSERT INTO stock_balance (product_id, qty, updated_at)
           VALUES (?, ?, NOW())
           ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty), updated_at = NOW()`,
          [productId, parseInt(stock)]
        );

        console.log(`✅ Initial stock transaction created for Product ID ${productId}`);
      }

    // Store sizes in product_sizes table
    console.log('🔍 Processing sizes:', sizes);
    if (sizes && Array.isArray(sizes) && sizes.length > 0) {
      // Validate that total size stock does not exceed base stock
      const totalSizeStock = sizes.reduce((total, sizeItem) => {
        if (sizeItem.size && sizeItem.size.trim() !== '') {
          return total + (parseInt(sizeItem.stock) || 0);
        }
        return total;
      }, 0);

      if (totalSizeStock > parseInt(stock)) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ 
          error: `Total size stock (${totalSizeStock}) cannot exceed base stock (${stock}). Please adjust the size quantities.` 
        });
      }

      for (const sizeItem of sizes) {
        console.log('🔍 Processing size item:', sizeItem);
        if (sizeItem.size && sizeItem.size.trim() !== '') {
          await connection.query(
            `INSERT INTO product_sizes (product_id, size, stock, price, is_active) 
             VALUES (?, ?, ?, ?, TRUE)`,
            [
              productId,
              sizeItem.size.trim(),
              parseInt(sizeItem.stock) || parseInt(stock), // Use size-specific stock or fallback to base stock
              parseFloat(sizeItem.price) || parseFloat(price) // Use size-specific price or fallback to base price
            ]
          );
          console.log(`✅ Size ${sizeItem.size} stored for product ${productId}`);
        }
      }
      console.log(`Product ${productId} created with ${sizes.length} sizes stored in product_sizes table`);
    } else {
      console.log('🔍 No sizes to store for product', productId);
    }

      await connection.commit();
      connection.release();

      // Emit refresh signal for new product
      const io = req.app.get('io');
      if (io) {
        emitAdminDataRefresh(io, 'products', { action: 'created', productId });
        emitDataRefresh(io, 'products', { action: 'created', productId });
      }

      res.status(201).json({ 
        message: 'Product created successfully', 
        productId: productId 
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Create Product Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Get All Products with pagination and filtering
export const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search, minPrice, maxPrice, inStock } = req.query;
    
    // Validate pagination
    const { page: validPage, limit: validLimit } = validatePagination(page, limit);
    const offset = (validPage - 1) * validLimit;

    // Build query conditions
    let whereConditions = [];
    let queryParams = [];

    if (category) {
      whereConditions.push('UPPER(c.name) = UPPER(?)');
      queryParams.push(category.trim());
    }

    if (search) {
      whereConditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (minPrice) {
      whereConditions.push('p.price >= ?');
      queryParams.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      whereConditions.push('p.price <= ?');
      queryParams.push(parseFloat(maxPrice));
    }

    if (inStock === 'true') {
      whereConditions.push('p.stock > 0');
    }

    // Always exclude soft-deleted products
    whereConditions.push('p.is_active = 1');

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereClause}`,
      queryParams
    );
    const totalProducts = countResult[0].total;

    // Get products with pagination
    const [products] = await pool.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, validLimit, offset]
    );

    // Get sizes for each product
    const productsWithSizes = await Promise.all(
      products.map(async (product) => {
        try {
          const [sizes] = await pool.query(
            `SELECT id, size, stock, price, is_active 
             FROM product_sizes 
             WHERE product_id = ? AND is_active = 1 
             ORDER BY 
               CASE size 
                 WHEN 'NONE' THEN 0
                 WHEN 'XS' THEN 1 
                 WHEN 'S' THEN 2 
                 WHEN 'M' THEN 3 
                 WHEN 'L' THEN 4 
                 WHEN 'XL' THEN 5 
                 WHEN 'XXL' THEN 6 
                 ELSE 7 
               END`,
            [product.id]
          );
          
          return {
            ...product,
            sizes: sizes.map(size => ({
              id: size.id,
              size: size.size,
              stock: parseInt(size.stock),
              price: parseFloat(size.price)
            }))
          };
        } catch (error) {
          console.error(`Error fetching sizes for product ${product.id}:`, error);
          return {
      ...product,
            sizes: []
          };
        }
      })
    );

    res.json({
      products: productsWithSizes,
      pagination: {
        currentPage: validPage,
        totalPages: Math.ceil(totalProducts / validLimit),
        totalProducts,
        hasNextPage: validPage < Math.ceil(totalProducts / validLimit),
        hasPrevPage: validPage > 1
      }
    });
  } catch (err) {
    console.error('Get Products Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Get Product by ID
export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const validatedId = validateId(id);
    
    const [rows] = await pool.query(`
      SELECT p.*, c.name AS category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `, [validatedId]);

    if (rows.length === 0) {
      throw new NotFoundError('Product');
    }

    const product = rows[0];
    
    // Try to get product sizes if the table exists, otherwise set empty array
    try {
      const [sizes] = await pool.query(
        `SELECT * FROM product_sizes 
         WHERE product_id = ? AND is_active = 1 
         ORDER BY 
           CASE size 
             WHEN 'NONE' THEN 0
             WHEN 'XS' THEN 1 
             WHEN 'S' THEN 2 
             WHEN 'M' THEN 3 
             WHEN 'L' THEN 4 
             WHEN 'XL' THEN 5 
             WHEN 'XXL' THEN 6 
             ELSE 7 
           END`,
        [validatedId]
      );
      product.sizes = sizes;
    } catch (sizeError) {
      // If product_sizes table doesn't exist, just set empty array
      logger.debug('Product sizes table not available, setting empty array');
      product.sizes = [];
    }

    logger.info('Product retrieved successfully', { productId: validatedId });
    res.json(product);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    logger.error('Get Product Error', error, { productId: id });
    throw new AppError('Failed to retrieve product');
  }
});

// ✅ Get Product by Name
export const getProductByName = async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const [rows] = await pool.query(`
      SELECT p.*, c.name AS category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.name = ?
    `, [name.trim()]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = rows[0];
    
    // Try to get product sizes if the table exists, otherwise set empty array
    try {
      const [sizes] = await pool.query(
        `SELECT id, size, stock, price, is_active 
         FROM product_sizes 
         WHERE product_id = ? AND is_active = 1 
         ORDER BY 
           CASE size 
             WHEN 'NONE' THEN 0
             WHEN 'XS' THEN 1 
             WHEN 'S' THEN 2 
             WHEN 'M' THEN 3 
             WHEN 'L' THEN 4 
             WHEN 'XL' THEN 5 
             WHEN 'XXL' THEN 6 
             ELSE 7 
           END`,
        [product.id]
      );
      product.sizes = sizes.map(size => ({
        id: size.id,
        size: size.size,
        stock: parseInt(size.stock),
        price: parseFloat(size.price)
      }));
    } catch (sizeError) {
      // If product_sizes table doesn't exist, just set empty array
      console.log('Product sizes table not available, setting empty array');
      product.sizes = [];
    }

    res.json(product);
  } catch (error) {
    console.error('Get Product by Name Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Update product (admin only)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, original_price, stock, sizes, category_id, image } = req.body;

    if (!validateId(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Check if product exists
    const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate input fields
    if (name && !validateName(name)) {
      return res.status(400).json({ 
        error: 'Name must be 2-50 characters long' 
      });
    }

    if (price !== undefined && !validatePrice(price)) {
      return res.status(400).json({ 
        error: 'Valid selling price is required' 
      });
    }

    if (original_price !== undefined && !validatePrice(original_price)) {
      return res.status(400).json({ 
        error: 'Valid cost price is required' 
      });
    }

    if (price !== undefined && original_price !== undefined && Number(price) <= Number(original_price)) {
      return res.status(400).json({ 
        error: 'Selling price must be higher than cost price' 
      });
    }

    if (stock !== undefined && !validateStock(stock)) {
      return res.status(400).json({ 
        error: 'Valid stock quantity is required' 
      });
    }

    if (image && !validateImageUrl(image)) {
      return res.status(400).json({ 
        error: 'Invalid image URL format' 
      });
    }

    // Check if category exists if provided
    if (category_id) {
      const [categories] = await pool.query('SELECT id FROM categories WHERE id = ?', [category_id]);
      if (categories.length === 0) {
        return res.status(400).json({ error: 'Category not found' });
      }
    }

    // Allow duplicate product names - they will be grouped by name in the frontend

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name.trim());
      }

      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description?.trim() || null);
      }

      if (price !== undefined) {
        updateFields.push('price = ?');
        updateValues.push(parseFloat(price));
      }

      if (original_price !== undefined) {
        updateFields.push('original_price = ?');
        updateValues.push(parseFloat(original_price));
      }

      if (stock !== undefined) {
        updateFields.push('stock = ?');
        updateValues.push(parseInt(stock));
      }

      if (category_id !== undefined) {
        updateFields.push('category_id = ?');
        updateValues.push(category_id || null);
      }

      if (image !== undefined) {
        updateFields.push('image = ?');
        updateValues.push(image?.trim() || null);
      }

      updateValues.push(id);

      // Update product
      if (updateFields.length > 0) {
        await connection.query(
          `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // Update product sizes if provided
      if (sizes && Array.isArray(sizes)) {
        // Validate that total size stock does not exceed base stock
        const totalSizeStock = sizes.reduce((total, sizeItem) => {
          if (sizeItem.size && sizeItem.size.trim() !== '') {
            return total + (parseInt(sizeItem.stock) || 0);
          }
          return total;
        }, 0);

        if (totalSizeStock > parseInt(stock)) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ 
            error: `Total size stock (${totalSizeStock}) cannot exceed base stock (${stock}). Please adjust the size quantities.` 
          });
        }

        // Delete existing sizes
        await connection.query('DELETE FROM product_sizes WHERE product_id = ?', [id]);

        // Insert new sizes
        for (const sizeData of sizes) {
          if (!validateSize(sizeData.size)) {
            throw new Error(`Invalid size: ${sizeData.size}. Valid sizes are: NONE, XS, S, M, L, XL, XXL`);
          }

          await connection.query(
            `INSERT INTO product_sizes (product_id, size, stock, price, is_active) VALUES (?, ?, ?, ?, TRUE)`,
            [id, sizeData.size.toUpperCase(), parseInt(sizeData.stock) || parseInt(stock), parseFloat(sizeData.price) || parseFloat(price), 1]
          );
        }
      }

      await connection.commit();
      connection.release();

      // Emit refresh signal for updated product
      const io = req.app.get('io');
      if (io) {
        emitAdminDataRefresh(io, 'products', { action: 'updated', productId: id });
        emitDataRefresh(io, 'products', { action: 'updated', productId: id });
      }

      res.json({ message: 'Product updated successfully' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ✅ Delete Product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateId(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Check if product exists
    const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if product is in any active cart
    const [cartItems] = await pool.query('SELECT id FROM cart_items WHERE product_id = ?', [id]);
    if (cartItems.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete product that is in active carts' 
      });
    }

    // Note: We allow deletion even if product has order history
    // Order history will be preserved as order_items contains product_name, price, etc.

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Soft delete product by setting is_active to false
      const [result] = await connection.query(
        'UPDATE products SET is_active = 0 WHERE id = ?', 
        [id]
      );

      if (result.affectedRows === 0) {
        throw new Error('Product not found');
      }

      await connection.commit();
      connection.release();

      // Emit refresh signal for deleted product
      const io = req.app.get('io');
      if (io) {
        emitAdminDataRefresh(io, 'products', { action: 'deleted', productId: id });
        emitDataRefresh(io, 'products', { action: 'deleted', productId: id });
      }

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Delete Product Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// ✅ Get Low Stock Products (for Admin Alerts)
export const getLowStockProducts = async (req, res) => {
  try {
    // First get products with low base stock
    const [baseStockProducts] = await pool.query(`
      SELECT p.*, c.name AS category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.stock <= ? 
      ORDER BY p.stock ASC
    `, [LOW_STOCK_THRESHOLD]);

    // Get all products with their sizes to check for size-specific low stock
    const [allProducts] = await pool.query(`
      SELECT p.*, c.name AS category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = 1
      ORDER BY p.stock ASC
    `);

    // Get product sizes for all products
    const productsWithSizes = await Promise.all(
      allProducts.map(async (product) => {
        const [sizes] = await pool.query(
          'SELECT * FROM product_sizes WHERE product_id = ? AND is_active = 1',
          [product.id]
        );
        return {
          ...product,
          sizes: sizes
        };
      })
    );

    // Filter for products with low stock (either base stock or any size stock)
    const lowStockProducts = productsWithSizes.filter(product => {
      // Check base stock
      if (Number(product.stock) <= LOW_STOCK_THRESHOLD) {
        return true;
      }
      
      // Check if any size has low stock
      if (product.sizes && product.sizes.length > 0) {
        return product.sizes.some(size => Number(size.stock) <= LOW_STOCK_THRESHOLD);
      }
      
      return false;
    });

    res.json({
      products: lowStockProducts,
      threshold: LOW_STOCK_THRESHOLD,
      count: lowStockProducts.length
    });
  } catch (error) {
    console.error('Low Stock Check Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Get Product Statistics
export const getProductStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as totalProducts,
        COUNT(CASE WHEN stock = 0 THEN 1 END) as outOfStock,
        COUNT(CASE WHEN stock <= ? THEN 1 END) as lowStock,
        SUM(stock) as totalStock,
        AVG(price) as averagePrice,
        MIN(price) as minPrice,
        MAX(price) as maxPrice
      FROM products
    `, [LOW_STOCK_THRESHOLD]);

    res.json(stats[0]);
  } catch (error) {
    console.error('Get Product Stats Error:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Get inventory summary
export const getInventorySummary = async (req, res) => {
  try {
    const [summary] = await pool.query(`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock) as total_stock,
        SUM(CASE WHEN stock <= ? THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        SUM(stock * price) as total_inventory_value
      FROM products
    `, [LOW_STOCK_THRESHOLD]);

    const [categoryStats] = await pool.query(`
      SELECT 
        c.name as category,
        COUNT(p.id) as product_count,
        SUM(p.stock) as total_stock,
        AVG(p.price) as avg_price
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id, c.name
      ORDER BY product_count DESC
    `);

    res.json({
      summary: summary[0],
      categoryStats,
      lowStockThreshold: LOW_STOCK_THRESHOLD
    });
  } catch (err) {
    console.error('Get inventory summary error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Update product stock
export const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, reason, movement_type } = req.body;

    if (!stock || !reason || !movement_type) {
      return res.status(400).json({ 
        error: 'Stock, reason, and movement type are required' 
      });
    }

    if (!Object.values(STOCK_MOVEMENT_TYPES).includes(movement_type)) {
      return res.status(400).json({ error: 'Invalid movement type' });
    }

    // Get current stock
    const [currentProduct] = await pool.query(
      'SELECT stock FROM products WHERE id = ?',
      [id]
    );

    if (currentProduct.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const currentStock = currentProduct[0].stock;
    const newStock = Math.max(0, currentStock + stock); // Prevent negative stock

    // Update product stock
    await pool.query(
      'UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?',
      [newStock, id]
    );

    // Log stock movement
    await pool.query(`
      INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [id, movement_type, stock, currentStock, newStock, reason]);

    res.json({ 
      message: 'Stock updated successfully',
      previousStock: currentStock,
      newStock: newStock,
      change: stock
    });
  } catch (err) {
    console.error('Update product stock error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ✅ Get stock movement history
export const getStockMovementHistory = async (req, res) => {
  try {
    const { product_id, movement_type, start_date, end_date, page = 1, limit = 20 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (product_id) {
      whereClause += ' AND sm.product_id = ?';
      params.push(product_id);
    }
    
    if (movement_type) {
      whereClause += ' AND sm.movement_type = ?';
      params.push(movement_type);
    }
    
    if (start_date) {
      whereClause += ' AND DATE(sm.created_at) >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND DATE(sm.created_at) <= ?';
      params.push(end_date);
    }

    const offset = (page - 1) * limit;
    
    const [movements] = await pool.query(`
      SELECT 
        sm.id,
        sm.movement_type,
        sm.quantity,
        sm.previous_stock,
        sm.new_stock,
        sm.reason,
        sm.created_at,
        p.name as product_name,
        p.image as product_image
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      ${whereClause}
      ORDER BY sm.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [total] = await pool.query(`
      SELECT COUNT(*) as total
      FROM stock_movements sm
      ${whereClause}
    `, params);

    res.json({
      movements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0].total,
        totalPages: Math.ceil(total[0].total / limit)
      }
    });
  } catch (err) {
    console.error('Get stock movement history error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
