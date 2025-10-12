-- Create stock_movements table
-- Run this script to add the stock movements table to existing database

USE capstone;

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    movement_type ENUM('stock_in', 'stock_out') NOT NULL,
    quantity INT NOT NULL,
    reason VARCHAR(100) NOT NULL,
    supplier VARCHAR(200),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    CONSTRAINT chk_movement_quantity CHECK (quantity > 0),
    INDEX idx_stock_movements_product (product_id),
    INDEX idx_stock_movements_user (user_id),
    INDEX idx_stock_movements_type (movement_type),
    INDEX idx_stock_movements_date (created_at)
);

-- Show the table structure
DESCRIBE stock_movements;

-- Show any existing data
SELECT COUNT(*) as total_movements FROM stock_movements;




