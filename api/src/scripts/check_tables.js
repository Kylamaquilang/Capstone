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

async function checkTables() {
  let connection;
  
  try {
    console.log('🔍 Checking database tables...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to capstone_db database');
    
    // Get all tables
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'capstone_db'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Database tables:');
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    // Check specific tables that might be missing
    const importantTables = ['cart_items', 'product_sizes'];
    
    console.log('\n🔍 Checking important tables:');
    for (const tableName of importantTables) {
      const [exists] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'capstone_db' AND table_name = ?
      `, [tableName]);
      
      if (exists[0].count > 0) {
        console.log(`   ✅ ${tableName} - EXISTS`);
      } else {
        console.log(`   ❌ ${tableName} - MISSING`);
      }
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Run the check
checkTables();
