import { pool } from '../src/database/db.js';

async function addSizeColumn() {
  try {
    console.log('🔧 Adding size_id column to stock_movements table...\n');
    
    // Add size_id column
    try {
      await pool.query('ALTER TABLE stock_movements ADD COLUMN size_id INT NULL AFTER product_id');
      console.log('✅ Added size_id column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ size_id column already exists');
      } else {
        throw e;
      }
    }
    
    // Add foreign key
    try {
      await pool.query(`
        ALTER TABLE stock_movements 
        ADD CONSTRAINT fk_stock_movements_size_id 
        FOREIGN KEY (size_id) REFERENCES product_sizes(id) ON DELETE SET NULL
      `);
      console.log('✅ Added foreign key constraint');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('✅ Foreign key constraint already exists');
      } else {
        console.log('ℹ️  Foreign key:', e.message);
      }
    }
    
    // Add index
    try {
      await pool.query('ALTER TABLE stock_movements ADD INDEX idx_stock_movements_size (size_id)');
      console.log('✅ Added index on size_id');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('✅ Index already exists');
      } else {
        console.log('ℹ️  Index:', e.message);
      }
    }
    
    // Verify
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'stock_movements' 
      AND COLUMN_NAME = 'size_id'
    `);
    
    if (cols.length > 0) {
      console.log('\n🎉 SUCCESS! size_id column has been added to stock_movements table');
      console.log('📋 Column details:', cols[0]);
      console.log('\n✨ Size tracking is now ENABLED!');
      console.log('📝 You can now restock products with specific sizes and see them in reports');
    } else {
      console.log('\n❌ Column not found - migration may have failed');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addSizeColumn();





