import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🚀 Starting database setup...');
    
    // Connect to MySQL server (without specifying database)
    connection = await mysql.createConnection({
      ...dbConfig,
      database: undefined // Don't specify database initially
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Create database
    console.log('🔧 Creating database capstone_db...');
    await connection.execute('CREATE DATABASE IF NOT EXISTS capstone_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✅ Database capstone_db created');
    
    // Close connection and reconnect to the new database
    await connection.end();
    
    const dbConnection = await mysql.createConnection({
      ...dbConfig,
      database: 'capstone_db'
    });
    
    console.log('✅ Connected to capstone_db database');
    
    // Create tables one by one
    console.log('🔧 Creating tables...');
    
    // Users table
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'student',
        phone VARCHAR(20),
        address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');
    
    // Categories table
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        image VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Categories table created');
    
    // Products table
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        stock INT DEFAULT 0,
        category_id INT,
        image VARCHAR(255),
        size VARCHAR(20),
        color VARCHAR(50),
        brand VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        reorder_point INT DEFAULT 5,
        max_stock INT,
        last_restock_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Products table created');
    
    // Cart table
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS cart (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_product (user_id, product_id)
      )
    `);
    console.log('✅ Cart table created');
    
    // Orders table
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50) DEFAULT 'cash',
        payment_status VARCHAR(50) DEFAULT 'pending',
        pay_at_counter BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Orders table created');
    
    // Order Items table
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name VARCHAR(200) NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        unit_cost DECIMAL(10,2) DEFAULT 0,
        total_price DECIMAL(10,2) NOT NULL,
        size VARCHAR(20),
        color VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Order Items table created');
    
    // Create indexes for better performance
    console.log('🔧 Creating indexes...');
    await dbConnection.execute('CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id)');
    await dbConnection.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await dbConnection.execute('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
    await dbConnection.execute('CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock)');
    await dbConnection.execute('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)');
    await dbConnection.execute('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    console.log('✅ Indexes created');
    
    console.log('✅ Database setup completed (using optimized SQL queries)');
    
    // Insert sample data
    console.log('🔧 Inserting sample data...');
    
    // Check if categories already exist
    const [existingCategories] = await dbConnection.execute('SELECT COUNT(*) as count FROM categories');
    if (existingCategories[0].count === 0) {
      await dbConnection.execute(`
        INSERT INTO categories (name, description) VALUES
        ('Uniforms', 'School uniforms and PE uniforms'),
        ('School Supplies', 'Notebooks, pens, and other school materials'),
        ('Accessories', 'Bags, shoes, and other accessories'),
        ('Electronics', 'Calculators and other electronic devices')
      `);
      console.log('✅ Sample categories inserted');
    }
    
    // Check if admin user already exists
    const [existingUsers] = await dbConnection.execute('SELECT COUNT(*) as count FROM users');
    if (existingUsers[0].count === 0) {
      await dbConnection.execute(`
        INSERT INTO users (student_id, name, email, password, role) VALUES
        ('ADMIN001', 'System Administrator', 'admin@cpc.edu.ph', '$2b$10$rQZ8K9N2mP3vX7yL1qA4eR5tU6iI8oP9aQ2bR3cS4dT5eU6fV7gW8hX9iJ0kL', 'admin')
      `);
      console.log('✅ Admin user created');
    }
    
    // Check if products already exist
    const [existingProducts] = await dbConnection.execute('SELECT COUNT(*) as count FROM products');
    if (existingProducts[0].count === 0) {
      await dbConnection.execute(`
        INSERT INTO products (name, description, price, stock, category_id, size, color) VALUES
        ('PE Shirt', 'Physical Education uniform shirt', 250.00, 50, 1, 'M', 'White'),
        ('PE Pants', 'Physical Education uniform pants', 300.00, 45, 1, 'M', 'Gray'),
        ('School Polo', 'Regular school uniform polo', 400.00, 60, 1, 'M', 'White'),
        ('Notebook', 'College ruled notebook', 25.00, 100, 2, NULL, 'Blue'),
        ('Ballpen', 'Blue ballpoint pen', 15.00, 200, 2, NULL, 'Blue')
      `);
      console.log('✅ Sample products inserted');
    }
    
    // Test the database
    const [tableCount] = await dbConnection.execute('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = "capstone_db"');
    console.log(`📋 Database contains ${tableCount[0].table_count} tables`);
    
    await dbConnection.end();
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('📝 You can now start your API server');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure MySQL server is running');
      console.log('   - On Windows: Start MySQL service');
      console.log('   - On macOS: brew services start mysql');
      console.log('   - On Linux: sudo systemctl start mysql');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Check your database credentials in .env file');
      console.log('   - DB_USER: MySQL username');
      console.log('   - DB_PASSWORD: MySQL password');
    }
    
    process.exit(1);
  }
}

// Run the setup
setupDatabase();
