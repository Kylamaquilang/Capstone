import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'capstone_db',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
};

async function createProductSizes() {
  let connection;
  
  try {
    console.log('🔧 Creating product_sizes table...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to capstone_db database');
    
    // Create product_sizes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_sizes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL,
        size VARCHAR(10) NOT NULL,
        stock INT DEFAULT 0,
        price DECIMAL(10,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_product_size (product_id, size)
      )
    `);
    console.log('✅ product_sizes table created');
    
    // Add sample product sizes for existing products
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const products = [1, 2, 3]; // PE Shirt, PE Pants, School Polo
    
    console.log('🔧 Adding sample product sizes...');
    
    for (const productId of products) {
      for (const size of sizes) {
        const stock = Math.floor(Math.random() * 20) + 5; // Random stock between 5-25
        const price = 450.00; // Default price
        
        try {
          await connection.execute(`
            INSERT INTO product_sizes (product_id, size, stock, price)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE stock = ?, price = ?
          `, [productId, size, stock, price, stock, price]);
        } catch (error) {
          // Ignore duplicate key errors
          console.log(`   - Size ${size} for product ${productId} already exists`);
        }
      }
    }
    
    console.log('✅ Sample product sizes added');
    
    // Show sample data
    console.log('\n📋 Sample product sizes:');
    const [sampleSizes] = await connection.execute(`
      SELECT ps.*, p.name as product_name 
      FROM product_sizes ps 
      JOIN products p ON ps.product_id = p.id 
      LIMIT 10
    `);
    
    sampleSizes.forEach(size => {
      console.log(`   - Product: ${size.product_name}, Size: ${size.size}, Stock: ${size.stock}, Price: ₱${size.price}`);
    });
    
    await connection.end();
    console.log('\n🎉 Product sizes setup completed successfully!');
    
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
