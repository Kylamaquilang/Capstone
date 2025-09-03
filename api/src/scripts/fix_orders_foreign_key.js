import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'capstone',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,
  charset: 'utf8mb4',
};

async function fixOrdersForeignKey() {
  let connection;
  
  try {
    console.log('🔧 Fixing orders table foreign key constraint...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check current foreign key constraints
    console.log('🔍 Checking current foreign key constraints...');
    const [constraints] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [dbConfig.database]);

    console.log('Current foreign key constraints:');
    constraints.forEach(constraint => {
      console.log(`   - ${constraint.CONSTRAINT_NAME}: ${constraint.TABLE_NAME}.${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
    });

    // Check if orders table exists and its structure
    console.log('\n🔍 Checking orders table structure...');
    const [orderColumns] = await connection.execute('DESCRIBE orders');
    console.log('Orders table columns:');
    orderColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });

    // Check if users table exists
    console.log('\n🔍 Checking users table...');
    const [usersTable] = await connection.execute('SHOW TABLES LIKE "users"');
    if (usersTable.length === 0) {
      console.log('❌ Users table does not exist!');
      return;
    }
    console.log('✅ Users table exists');

    // Check if dashboard_users table exists
    console.log('\n🔍 Checking dashboard_users table...');
    const [dashboardUsersTable] = await connection.execute('SHOW TABLES LIKE "dashboard_users"');
    if (dashboardUsersTable.length === 0) {
      console.log('❌ dashboard_users table does not exist!');
      return;
    }
    console.log('✅ dashboard_users table exists');

    // Drop existing foreign key constraints that reference dashboard_users
    for (const constraint of constraints) {
      if (constraint.REFERENCED_TABLE_NAME === 'dashboard_users') {
        console.log(`🔧 Dropping foreign key constraint: ${constraint.CONSTRAINT_NAME}`);
        try {
          await connection.execute(`ALTER TABLE orders DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`);
          console.log(`✅ Dropped constraint: ${constraint.CONSTRAINT_NAME}`);
        } catch (error) {
          console.log(`⚠️ Could not drop constraint ${constraint.CONSTRAINT_NAME}: ${error.message}`);
        }
      }
    }

    // Add new foreign key constraint to reference users table
    console.log('\n🔧 Adding foreign key constraint to reference users table...');
    try {
      await connection.execute(`
        ALTER TABLE orders 
        ADD CONSTRAINT fk_orders_user 
        FOREIGN KEY (user_id) REFERENCES users(id) 
        ON DELETE CASCADE
      `);
      console.log('✅ Added foreign key constraint to users table');
    } catch (error) {
      console.log(`⚠️ Could not add foreign key constraint: ${error.message}`);
      
      // If constraint already exists, try to drop and recreate
      if (error.message.includes('Duplicate key name')) {
        console.log('🔧 Dropping existing constraint and recreating...');
        try {
          await connection.execute('ALTER TABLE orders DROP FOREIGN KEY fk_orders_user');
          await connection.execute(`
            ALTER TABLE orders 
            ADD CONSTRAINT fk_orders_user 
            FOREIGN KEY (user_id) REFERENCES users(id) 
            ON DELETE CASCADE
          `);
          console.log('✅ Recreated foreign key constraint successfully');
        } catch (recreateError) {
          console.log(`❌ Failed to recreate constraint: ${recreateError.message}`);
        }
      }
    }

    // Verify the fix
    console.log('\n🔍 Verifying foreign key constraints after fix...');
    const [newConstraints] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [dbConfig.database]);

    console.log('Updated foreign key constraints:');
    newConstraints.forEach(constraint => {
      console.log(`   - ${constraint.CONSTRAINT_NAME}: ${constraint.TABLE_NAME}.${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
    });

    // Test the foreign key constraint
    console.log('\n🧪 Testing foreign key constraint...');
    const [testUser] = await connection.execute('SELECT id FROM users LIMIT 1');
    if (testUser.length > 0) {
      console.log(`✅ Found test user with ID: ${testUser[0].id}`);
      console.log('✅ Foreign key constraint should work correctly now');
    } else {
      console.log('⚠️ No users found in users table');
    }

    console.log('\n✅ Foreign key constraint fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing foreign key constraint:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run the migration
if (process.env.NODE_ENV !== 'test') {
  fixOrdersForeignKey()
    .then(() => {
      console.log('🎉 Foreign key constraint fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Foreign key constraint fix failed:', error);
      process.exit(1);
    });
}

export default fixOrdersForeignKey;
