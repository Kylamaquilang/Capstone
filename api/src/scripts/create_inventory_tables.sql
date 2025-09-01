-- Create comprehensive inventory management and reporting tables

-- 1. Stock movements table for tracking inventory changes
CREATE TABLE IF NOT EXISTS stock_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  movement_type ENUM('purchase', 'sale', 'adjustment', 'return') NOT NULL,
  quantity INT NOT NULL,
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_date (product_id, created_at),
  INDEX idx_movement_type (movement_type),
  INDEX idx_created_at (created_at)
);

-- 2. Order status logs for tracking order changes
CREATE TABLE IF NOT EXISTS order_status_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  old_status VARCHAR(50) NOT NULL,
  new_status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_date (order_id, created_at),
  INDEX idx_status_change (old_status, new_status)
);

-- 3. Payment transactions table for payment tracking
CREATE TABLE IF NOT EXISTS payment_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  transaction_id VARCHAR(100) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL,
  gateway_response TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_payment (order_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- 4. Enhanced orders table with additional fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS estimated_delivery DATETIME NULL,
ADD COLUMN IF NOT EXISTS actual_delivery DATETIME NULL,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT NULL,
ADD COLUMN IF NOT EXISTS customer_notes TEXT NULL;

-- 5. Enhanced products table with inventory fields
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS reorder_point INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS max_stock INT NULL,
ADD COLUMN IF NOT EXISTS supplier_info TEXT NULL,
ADD COLUMN IF NOT EXISTS last_restock_date DATETIME NULL;

-- 6. Create inventory alerts table
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  alert_type ENUM('low_stock', 'out_of_stock', 'overstock') NOT NULL,
  current_stock INT NOT NULL,
  threshold INT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_alert (product_id, alert_type),
  INDEX idx_unresolved (is_resolved, created_at)
);

-- 7. Create sales analytics table for caching
CREATE TABLE IF NOT EXISTS sales_analytics_cache (
  id INT PRIMARY KEY AUTO_INCREMENT,
  period_type ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_orders INT NOT NULL,
  total_revenue DECIMAL(12,2) NOT NULL,
  avg_order_value DECIMAL(10,2) NOT NULL,
  total_customers INT NOT NULL,
  cache_data JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_period (period_type, period_start, period_end),
  INDEX idx_period (period_type, period_start, period_end)
);

-- 8. Create product performance table
CREATE TABLE IF NOT EXISTS product_performance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  units_sold INT NOT NULL DEFAULT 0,
  revenue DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  profit_margin DECIMAL(5,2) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_product_period (product_id, period_start, period_end),
  INDEX idx_period (period_start, period_end),
  INDEX idx_product (product_id)
);

-- 9. Insert sample data for testing (optional)
-- INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reason) 
-- VALUES (1, 'purchase', 100, 0, 100, 'Initial stock');

-- 10. Create views for common queries
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
  p.id,
  p.name,
  p.stock,
  p.reorder_point,
  c.name as category,
  p.image
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.stock <= p.reorder_point
ORDER BY p.stock ASC;

CREATE OR REPLACE VIEW order_summary AS
SELECT 
  o.id,
  o.user_id,
  u.name as customer_name,
  o.total_amount,
  o.status,
  o.payment_method,
  o.created_at,
  o.updated_at,
  COUNT(oi.id) as item_count
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.user_id, u.name, o.total_amount, o.status, o.payment_method, o.created_at, o.updated_at;

-- 11. Create indexes for better performance
CREATE INDEX idx_orders_status_date ON orders(status, created_at);
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- 12. Add triggers for automatic stock updates
DELIMITER //

CREATE TRIGGER IF NOT EXISTS after_order_status_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  -- If order is cancelled or refunded, restore stock
  IF NEW.status IN ('cancelled', 'refunded') AND OLD.status NOT IN ('cancelled', 'refunded') THEN
    UPDATE products p
    JOIN order_items oi ON p.id = oi.product_id
    SET p.stock = p.stock + oi.quantity
    WHERE oi.order_id = NEW.id;
  END IF;
  
  -- If order moves from cancelled/refunded to active status, reduce stock
  IF NEW.status NOT IN ('cancelled', 'refunded') AND OLD.status IN ('cancelled', 'refunded') THEN
    UPDATE products p
    JOIN order_items oi ON p.id = oi.product_id
    SET p.stock = GREATEST(0, p.stock - oi.quantity)
    WHERE oi.order_id = NEW.id;
  END IF;
END//

DELIMITER ;

-- 13. Create stored procedure for inventory summary
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetInventorySummary()
BEGIN
  SELECT 
    COUNT(*) as total_products,
    SUM(stock) as total_stock,
    SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
    SUM(CASE WHEN stock <= reorder_point THEN 1 ELSE 0 END) as low_stock,
    SUM(stock * price) as total_value
  FROM products;
END//

DELIMITER ;

-- 14. Create stored procedure for sales report
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetSalesReport(
  IN start_date DATE,
  IN end_date DATE
)
BEGIN
  SELECT 
    DATE(o.created_at) as sale_date,
    COUNT(o.id) as orders,
    SUM(o.total_amount) as revenue,
    AVG(o.total_amount) as avg_order_value
  FROM orders o
  WHERE o.status != 'cancelled'
    AND DATE(o.created_at) BETWEEN start_date AND end_date
  GROUP BY DATE(o.created_at)
  ORDER BY sale_date DESC;
END//

DELIMITER ;

-- Display success message
SELECT 'Inventory management tables created successfully!' as message;




