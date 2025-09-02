import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  database: 'capstone_db',
  charset: 'utf8mb4',
};

async function createProductSizes() {
  let connection;
  
  try {
    console.log('🔧 Creating product_sizes table...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to capstone_db database');
    
    // Create product_sizes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_sizes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL,
        size VARCHAR(20) NOT NULL,
        stock INT DEFAULT 0,
        price DECIMAL(10,2),
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_product_size (product_id, size)
      )
    `);
    console.log('✅ product_sizes table created');
    
    // Get existing products
    const [products] = await connection.execute('SELECT id, name, size, stock, price FROM products');
    console.log(`📦 Found ${products.length} products to process`);
    
    // Insert size data for each product
    for (const product of products) {
      if (product.size) {
        // Product already has a size, create a size record
        await connection.execute(`
          INSERT INTO product_sizes (product_id, size, stock, price) 
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
          stock = VALUES(stock), 
          price = VALUES(price)
        `, [product.id, product.size, product.stock, product.price]);
        
        console.log(`✅ Added size ${product.size} for ${product.name}`);
      } else {
        // Product doesn't have a size, add default sizes
        const defaultSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        for (const size of defaultSizes) {
          await connection.execute(`
            INSERT INTO product_sizes (product_id, size, stock, price) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            stock = VALUES(stock), 
            price = VALUES(price)
          `, [product.id, size, Math.floor(product.stock / defaultSizes.length), product.price]);
        }
        console.log(`✅ Added default sizes for ${product.name}`);
      }
    }
    
    // Verify the data
    const [sizeCount] = await connection.execute('SELECT COUNT(*) as count FROM product_sizes');
    console.log(`📊 Total size records created: ${sizeCount[0].count}`);
    
    await connection.end();
    
    console.log('\n🎉 Product sizes setup completed successfully!');
    console.log('📝 Products now have proper size information');
    
  } catch (error) {
    console.error('❌ Error creating product sizes:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the setup
createProductSizes();
