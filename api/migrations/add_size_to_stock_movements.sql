-- =====================================================
-- Migration: Add Size Tracking to Stock Movements
-- Date: 2025-01-24
-- Description: Adds size_id column to stock_movements table
--              to track which specific size variant was restocked/deducted
-- =====================================================

USE capstone;

-- Check if stock_movements table exists, if not create it
CREATE TABLE IF NOT EXISTS stock_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  movement_type ENUM('stock_in', 'stock_out', 'stock_adjustment') NOT NULL,
  quantity INT NOT NULL,
  reason VARCHAR(100) NOT NULL,
  supplier VARCHAR(200),
  notes TEXT,
  previous_stock INT,
  new_stock INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  CONSTRAINT chk_movement_quantity CHECK (quantity > 0),
  INDEX idx_stock_movements_product (product_id),
  INDEX idx_stock_movements_user (user_id),
  INDEX idx_stock_movements_type (movement_type),
  INDEX idx_stock_movements_date (created_at)
);

-- Add size_id column if it doesn't exist
SET @column_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'capstone' 
  AND TABLE_NAME = 'stock_movements' 
  AND COLUMN_NAME = 'size_id'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE stock_movements ADD COLUMN size_id INT NULL AFTER product_id',
  'SELECT "Column size_id already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint if it doesn't exist
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE TABLE_SCHEMA = 'capstone' 
  AND TABLE_NAME = 'stock_movements' 
  AND CONSTRAINT_NAME = 'fk_stock_movements_size_id'
);

SET @sql = IF(
  @fk_exists = 0 AND @column_exists = 0,
  'ALTER TABLE stock_movements ADD CONSTRAINT fk_stock_movements_size_id FOREIGN KEY (size_id) REFERENCES product_sizes(id) ON DELETE SET NULL',
  'SELECT "Foreign key already exists or column was not added" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for size_id if it doesn't exist  
SET @index_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = 'capstone' 
  AND TABLE_NAME = 'stock_movements' 
  AND INDEX_NAME = 'idx_stock_movements_size'
);

SET @sql = IF(
  @index_exists = 0 AND @column_exists = 0,
  'ALTER TABLE stock_movements ADD INDEX idx_stock_movements_size (size_id)',
  'SELECT "Index already exists or column was not added" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration completed successfully! Size tracking added to stock_movements table.' AS message;


