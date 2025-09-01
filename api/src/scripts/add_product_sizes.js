import { pool } from '../database/db.js';

const sampleSizes = [
  { size: 'XS', stock: 10, price: null }, // Use product price
  { size: 'S', stock: 20, price: null },
  { size: 'M', stock: 25, price: null },
  { size: 'L', stock: 20, price: null },
  { size: 'XL', stock: 15, price: null },
  { size: 'XXL', stock: 10, price: null }
];

const addProductSizes = async () => {
  try {
    console.log('🔧 Adding product sizes...');

    // Get all products
    const [products] = await pool.query('SELECT id, name, category_id FROM products');
    
    for (const product of products) {
      console.log(`📦 Adding sizes for: ${product.name}`);
      
      // Check if product already has sizes
      const [existingSizes] = await pool.query(
        'SELECT COUNT(*) as count FROM product_sizes WHERE product_id = ?',
        [product.id]
      );
      
      if (existingSizes[0].count > 0) {
        console.log(`⚠️  Product ${product.name} already has sizes, skipping...`);
        continue;
      }

      // Add sizes for this product
      for (const sizeData of sampleSizes) {
        try {
          await pool.query(
            'INSERT INTO product_sizes (product_id, size, stock, price) VALUES (?, ?, ?, ?)',
            [product.id, sizeData.size, sizeData.stock, sizeData.price]
          );
          console.log(`✅ Added size ${sizeData.size} for ${product.name}`);
        } catch (error) {
          console.error(`❌ Error adding size ${sizeData.size} for ${product.name}:`, error.message);
        }
      }
    }

    console.log('🎉 Product sizes added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add product sizes:', error.message);
    process.exit(1);
  }
};

addProductSizes();








