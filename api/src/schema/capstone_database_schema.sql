

-- Create database
CREATE DATABASE IF NOT EXISTS capstone 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE capstone;


CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') DEFAULT 'student',

    first_name VARCHAR(50),
    last_name VARCHAR(50),
    middle_name VARCHAR(50),
    suffix VARCHAR(10),
    degree ENUM('BEED', 'BSED', 'BSIT', 'BSHM'),
    year_level ENUM('1st Year', '2nd Year', '3rd Year', '4th Year'),
    section VARCHAR(20),
    status ENUM('regular', 'irregular'),

    contact_number VARCHAR(20),
    address TEXT,

    profile_image VARCHAR(255),

    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT FALSE,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    

    CONSTRAINT chk_student_id CHECK (student_id IS NULL OR LENGTH(student_id) >= 4),
    CONSTRAINT chk_email CHECK (email IS NULL OR email LIKE '%@%.%'),
    CONSTRAINT chk_name CHECK (LENGTH(name) >= 2)
);


CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    

    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
    

    CONSTRAINT chk_category_name CHECK (LENGTH(name) >= 2),
    -- Allow same name for subcategories under different parents
    UNIQUE KEY unique_category_parent (name, parent_id)
);


CREATE TABLE products (
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    

    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    

    CONSTRAINT chk_product_name CHECK (LENGTH(name) >= 2),
    CONSTRAINT chk_price CHECK (price > 0),
    CONSTRAINT chk_stock CHECK (stock >= 0),
    CONSTRAINT chk_reorder_point CHECK (reorder_point >= 0)
);

CREATE TABLE product_sizes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    size VARCHAR(20) NOT NULL,
    stock INT DEFAULT 0,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    

    CONSTRAINT chk_size_stock CHECK (stock >= 0),
    CONSTRAINT chk_size_price CHECK (price IS NULL OR price > 0),
    UNIQUE KEY unique_product_size (product_id, size)
);


CREATE TABLE cart_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    size_id INT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (size_id) REFERENCES product_sizes(id) ON DELETE CASCADE,

    CONSTRAINT chk_cart_quantity CHECK (quantity > 0),
    UNIQUE KEY unique_user_product_size (user_id, product_id, size_id)
);


CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    

    status ENUM('pending', 'processing', 'ready_for_pickup', 'delivered', 'completed', 'cancelled', 'refunded') DEFAULT 'pending',

    payment_method ENUM('cash', 'gcash', 'card') DEFAULT 'cash',
    payment_status ENUM('unpaid', 'pending', 'paid', 'cancelled', 'refunded') DEFAULT 'unpaid',
    payment_intent_id VARCHAR(255),
    

    pay_at_counter BOOLEAN DEFAULT FALSE,
    

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,

    CONSTRAINT chk_total_amount CHECK (total_amount > 0),
    CONSTRAINT chk_order_number CHECK (LENGTH(order_number) >= 3)
);


CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NULL,
    size_id INT NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    size VARCHAR(20),
    color VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (size_id) REFERENCES product_sizes(id) ON DELETE SET NULL,

    CONSTRAINT chk_order_item_quantity CHECK (quantity > 0),
    CONSTRAINT chk_order_item_unit_price CHECK (unit_price > 0),
    CONSTRAINT chk_order_item_total_price CHECK (total_price > 0)
);


CREATE TABLE order_status_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    notes TEXT,
    admin_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE payment_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    transaction_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'gcash', 'card') NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
    gateway_response JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,

    CONSTRAINT chk_payment_amount CHECK (amount > 0)
);

CREATE TABLE inventory_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    size_id INT NULL,
    movement_type ENUM('purchase', 'sale', 'adjustment', 'return', 'transfer') NOT NULL,
    quantity_change INT NOT NULL,
    previous_stock INT,
    new_stock INT,
    reason VARCHAR(255),
    order_id INT NULL,
    admin_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (size_id) REFERENCES product_sizes(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
    

    CONSTRAINT chk_quantity_change CHECK (quantity_change != 0)
);

CREATE TABLE stock_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    movement_type VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    previous_stock INT,
    new_stock INT,
    reason VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    movement_type ENUM('sale', 'reversal', 'refund') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'gcash', 'card') NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,

    CONSTRAINT chk_sales_amount CHECK (amount > 0)
);

CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('system', 'order', 'admin_order', 'delivered_confirmation', 'payment') DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    related_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT chk_notification_title CHECK (LENGTH(title) >= 1),
    CONSTRAINT chk_notification_message CHECK (LENGTH(message) >= 1)
);


CREATE TABLE password_reset_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    

    CONSTRAINT chk_reset_code CHECK (LENGTH(code) >= 4)
);

CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);


CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_name ON products(name);

CREATE INDEX idx_product_sizes_product ON product_sizes(product_id);
CREATE INDEX idx_product_sizes_stock ON product_sizes(stock);


CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);


CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);


CREATE INDEX idx_order_status_logs_order ON order_status_logs(order_id);
CREATE INDEX idx_order_status_logs_created_at ON order_status_logs(created_at);


CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);


CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);


CREATE INDEX idx_sales_logs_order ON sales_logs(order_id);
CREATE INDEX idx_sales_logs_type ON sales_logs(movement_type);
CREATE INDEX idx_sales_logs_created_at ON sales_logs(created_at);


CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_password_reset_codes_user ON password_reset_codes(user_id);
CREATE INDEX idx_password_reset_codes_expires ON password_reset_codes(expires_at);


DELIMITER //
CREATE PROCEDURE GenerateOrderNumber(OUT order_number VARCHAR(50))
BEGIN
    DECLARE counter INT DEFAULT 1;
    DECLARE new_order_number VARCHAR(50);
    
    REPEAT
        SET new_order_number = CONCAT('ORD', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(counter, 4, '0'));
        SET counter = counter + 1;
    UNTIL NOT EXISTS (SELECT 1 FROM orders WHERE order_number = new_order_number) END REPEAT;
    
    SET order_number = new_order_number;
END //
DELIMITER ;


DELIMITER //
CREATE TRIGGER tr_orders_before_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        CALL GenerateOrderNumber(@order_num);
        SET NEW.order_number = @order_num;
    END IF;
END //
DELIMITER ;
DELIMITER //
CREATE TRIGGER tr_inventory_movements_after_insert
AFTER INSERT ON inventory_movements
FOR EACH ROW
BEGIN
    IF NEW.size_id IS NOT NULL THEN

        UPDATE product_sizes 
        SET stock = stock + NEW.quantity_change 
        WHERE id = NEW.size_id;
    ELSE

        UPDATE products 
        SET stock = stock + NEW.quantity_change 
        WHERE id = NEW.product_id;
    END IF;
END //
DELIMITER ;

INSERT INTO users (student_id, name, email, password, role, is_active, must_change_password) VALUES
(NULL, 'System Administrator', 'acounting.office.cpc@gmail.com', '$2b$10$gYrNT55Azd2/r/7yAnR2oucZGIpe.On7sY7pzih6A0tLGLBJT6Ota', 'admin', TRUE, FALSE);

CREATE VIEW v_order_summary AS
SELECT 
    o.id,
    o.order_number,
    o.total_amount,
    o.status,
    o.payment_method,
    o.payment_status,
    o.created_at,
    u.name as customer_name,
    u.student_id,
    u.email as customer_email,
    COUNT(oi.id) as item_count
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;

CREATE VIEW v_product_inventory AS
SELECT 
    p.id,
    p.name,
    p.price,
    p.stock as general_stock,
    p.category_id,
    c.name as category_name,
    COALESCE(SUM(ps.stock), 0) as size_specific_stock,
    (p.stock + COALESCE(SUM(ps.stock), 0)) as total_stock
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN product_sizes ps ON p.id = ps.product_id AND ps.is_active = TRUE
GROUP BY p.id;

CREATE VIEW v_sales_summary AS
SELECT 
    DATE(o.created_at) as sale_date,
    COUNT(*) as total_orders,
    SUM(o.total_amount) as total_revenue,
    AVG(o.total_amount) as avg_order_value,
    COUNT(CASE WHEN o.payment_method = 'cash' THEN 1 END) as cash_orders,
    COUNT(CASE WHEN o.payment_method = 'gcash' THEN 1 END) as gcash_orders,
    SUM(CASE WHEN o.payment_method = 'cash' THEN o.total_amount ELSE 0 END) as cash_revenue,
    SUM(CASE WHEN o.payment_method = 'gcash' THEN o.total_amount ELSE 0 END) as gcash_revenue
FROM orders o
WHERE o.status IN ('delivered', 'completed')
GROUP BY DATE(o.created_at);



SELECT 
    'Database Schema Created Successfully' as status,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'capstone';


SHOW TABLES;
