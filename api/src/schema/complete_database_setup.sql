-- =====================================================
-- CPC ESSEN CAPSTONE PROJECT - COMPLETE DATABASE SETUP
-- =====================================================
-- This file contains the COMPLETE database setup including:
-- - Main database schema (all tables)
-- - All migrations
-- - All stored procedures
-- - All views and triggers
-- 
-- For Railway Deployment: Run this entire file to set up your database
-- Last Updated: 2025-01-14
-- =====================================================

-- =====================================================
-- DATABASE CREATION
-- =====================================================
DROP DATABASE IF EXISTS capstone;
CREATE DATABASE capstone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE capstone;

-- =====================================================
-- PART 1: MAIN TABLES
-- =====================================================

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student', 'staff') NOT NULL DEFAULT 'student',
    student_id VARCHAR(50) UNIQUE,
    address TEXT,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    suffix VARCHAR(20),
    degree ENUM('BEED', 'BSED', 'BSIT', 'BSHM'),
    year_level ENUM('1st Year', '2nd Year', '3rd Year', '4th Year'),
    section VARCHAR(10),
    status ENUM('regular', 'irregular') DEFAULT 'regular',
    contact_number VARCHAR(20),
    profile_image VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_student_id (student_id),
    INDEX idx_role (role),
    INDEX idx_degree (degree),
    INDEX idx_status (status)
);

-- =====================================================
-- 2. CATEGORIES TABLE
-- =====================================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. PRODUCTS TABLE
-- =====================================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    stock INT DEFAULT 0,
    base_stock INT DEFAULT 0,
    category_id INT,
    image VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    reorder_point INT DEFAULT 10,
    max_stock INT,
    last_restock_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_category (category_id),
    INDEX idx_name (name),
    INDEX idx_price (price),
    INDEX idx_stock (stock),
    INDEX idx_is_active (is_active),
    INDEX idx_deleted_at (deleted_at)
);

-- =====================================================
-- 4. PRODUCT SIZES TABLE (for products with multiple sizes)
-- =====================================================
CREATE TABLE product_sizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    size VARCHAR(20) NOT NULL,
    stock INT DEFAULT 0,
    base_stock INT DEFAULT 0,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_size (product_id, size),
    INDEX idx_product_id (product_id),
    INDEX idx_size (size)
);

-- =====================================================
-- 5. STOCK MANAGEMENT TABLES
-- =====================================================

-- Stock Transactions (Main ledger)
CREATE TABLE stock_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    transaction_type ENUM('IN','OUT','ADJUSTMENT') NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    reference_no VARCHAR(100),
    batch_no VARCHAR(100),
    expiry_date DATE,
    source VARCHAR(100),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_product_id (product_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_created_at (created_at),
    INDEX idx_reference_no (reference_no)
);

-- Stock Balance (Cached summary for performance)
CREATE TABLE stock_balance (
    product_id INT PRIMARY KEY,
    qty INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Stock Items (Batch tracking for FIFO)
CREATE TABLE stock_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    batch_no VARCHAR(100),
    expiry_date DATE,
    initial_quantity INT NOT NULL,
    remaining_quantity INT NOT NULL,
    unit_cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_batch (product_id, batch_no),
    INDEX idx_expiry (expiry_date),
    INDEX idx_remaining_qty (remaining_quantity)
);

-- Stock Movements (Modern table for tracking stock changes)
CREATE TABLE stock_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    size_id INT NULL,
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
    FOREIGN KEY (size_id) REFERENCES product_sizes(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_movement_quantity CHECK (quantity > 0),
    INDEX idx_stock_movements_product (product_id),
    INDEX idx_stock_movements_size (size_id),
    INDEX idx_stock_movements_user (user_id),
    INDEX idx_stock_movements_type (movement_type),
    INDEX idx_stock_movements_date (created_at)
);

-- =====================================================
-- 6. CART MANAGEMENT
-- =====================================================
CREATE TABLE cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    size VARCHAR(20),
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product_size (user_id, product_id, size),
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id)
);

-- =====================================================
-- 7. ORDERS MANAGEMENT
-- =====================================================
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'processing', 'ready_for_pickup', 'claimed', 'completed', 'cancelled', 'refunded') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    pay_at_counter BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_order_number (order_number),
    INDEX idx_created_at (created_at),
    INDEX idx_orders_user_status (user_id, status),
    INDEX idx_orders_created_at (created_at)
);

-- Order Items
-- IMPORTANT: unit_price stores the price at the time of transaction (checkout time).
-- This price is captured when the order is created and will NOT change even if the product price is updated later.
-- This ensures historical sales records maintain accurate pricing information at the time of purchase.
-- When displaying orders, always use order_items.unit_price, NOT products.price or product_sizes.price.
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT,
    product_name VARCHAR(200) NOT NULL,
    size VARCHAR(20),
    size_id INT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL COMMENT 'Price at transaction time - do not reference current product price',
    unit_cost DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (size_id) REFERENCES product_sizes(id) ON DELETE SET NULL,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id),
    INDEX idx_size_id (size_id),
    INDEX idx_order_items_order_product (order_id, product_id)
);

-- Order Status Logs (Audit trail)
CREATE TABLE order_status_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    admin_id INT,
    notes TEXT,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_order_id (order_id),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 8. PAYMENT MANAGEMENT
-- =====================================================
CREATE TABLE payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    transaction_id VARCHAR(100) UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PHP',
    payment_method VARCHAR(50),
    status ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
    gateway_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_status (status)
);

-- =====================================================
-- 9. INVENTORY MOVEMENTS (Legacy - for backward compatibility)
-- =====================================================
CREATE TABLE inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    movement_type ENUM('stock_in', 'stock_out') NOT NULL,
    quantity INT NOT NULL,
    reason VARCHAR(255),
    supplier VARCHAR(255),
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_product_id (product_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 10. NOTIFICATIONS SYSTEM
-- =====================================================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_id INT,
    related_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_type (type),
    INDEX idx_notifications_user_read (user_id, is_read)
);

-- =====================================================
-- 11. PASSWORD RESET SYSTEM
-- =====================================================
CREATE TABLE password_reset_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_code (code),
    INDEX idx_expires_at (expires_at),
    INDEX idx_verified (verified)
);

-- =====================================================
-- 12. DEGREE SHIFTS TABLE (Migration)
-- =====================================================
CREATE TABLE IF NOT EXISTS degree_shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    previous_degree ENUM('BEED', 'BSED', 'BSIT', 'BSHM'),
    new_degree ENUM('BEED', 'BSED', 'BSIT', 'BSHM') NOT NULL,
    previous_year_level ENUM('1st Year', '2nd Year', '3rd Year', '4th Year'),
    new_year_level ENUM('1st Year', '2nd Year', '3rd Year', '4th Year'),
    previous_section VARCHAR(10),
    new_section VARCHAR(10),
    shift_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_by INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_shift_date (shift_date),
    INDEX idx_new_degree (new_degree)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 2: STORED PROCEDURES
-- =====================================================

-- Generate Order Number
DELIMITER //
CREATE PROCEDURE GenerateOrderNumber()
BEGIN
    DECLARE order_num VARCHAR(50);
    DECLARE counter INT DEFAULT 1;
    
    REPEAT
        SET order_num = CONCAT('ORD-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(counter, 4, '0'));
        SET counter = counter + 1;
    UNTIL NOT EXISTS (SELECT 1 FROM orders WHERE order_number = order_num) END REPEAT;
    
    SELECT order_num as order_number;
END //
DELIMITER ;

-- Stock In Procedure
DELIMITER //
CREATE PROCEDURE sp_stock_in(
    IN p_product_id INT,
    IN p_quantity INT,
    IN p_reference_no VARCHAR(100),
    IN p_batch_no VARCHAR(100),
    IN p_expiry_date DATE,
    IN p_source VARCHAR(100),
    IN p_note TEXT,
    IN p_user_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Insert transaction record
    INSERT INTO stock_transactions (
        product_id, transaction_type, quantity, reference_no, 
        batch_no, expiry_date, source, note, created_by
    ) VALUES (
        p_product_id, 'IN', p_quantity, p_reference_no,
        p_batch_no, p_expiry_date, p_source, p_note, p_user_id
    );
    
    -- Update stock balance
    INSERT INTO stock_balance (product_id, qty) 
    VALUES (p_product_id, p_quantity)
    ON DUPLICATE KEY UPDATE qty = qty + p_quantity;
    
    -- Update product stock
    UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;
    
    -- Insert/Update stock items for batch tracking
    IF p_batch_no IS NOT NULL THEN
        INSERT INTO stock_items (
            product_id, batch_no, expiry_date, initial_quantity, 
            remaining_quantity, unit_cost
        ) VALUES (
            p_product_id, p_batch_no, p_expiry_date, p_quantity, 
            p_quantity, 0
        ) ON DUPLICATE KEY UPDATE 
            initial_quantity = initial_quantity + p_quantity,
            remaining_quantity = remaining_quantity + p_quantity;
    END IF;
    
    COMMIT;
END //
DELIMITER ;

-- Stock Out Procedure
DELIMITER //
CREATE PROCEDURE sp_stock_out(
    IN p_product_id INT,
    IN p_quantity INT,
    IN p_reference_no VARCHAR(100),
    IN p_source VARCHAR(100),
    IN p_note TEXT,
    IN p_user_id INT
)
BEGIN
    DECLARE v_remaining_qty INT DEFAULT p_quantity;
    DECLARE v_batch_qty INT;
    DECLARE v_batch_no VARCHAR(100);
    DECLARE done INT DEFAULT FALSE;
    DECLARE batch_cursor CURSOR FOR
        SELECT batch_no, remaining_quantity
        FROM stock_items
        WHERE product_id = p_product_id AND remaining_quantity > 0
        ORDER BY created_at ASC, expiry_date ASC;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Check if sufficient stock available
    SELECT COALESCE(sb.qty, p.stock, 0) INTO @total_available
    FROM products p
    LEFT JOIN stock_balance sb ON p.id = sb.product_id
    WHERE p.id = p_product_id;
    
    IF @total_available < p_quantity THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock available';
    END IF;
    
    -- Insert main transaction record
    INSERT INTO stock_transactions (
        product_id, transaction_type, quantity, reference_no, 
        source, note, created_by
    ) VALUES (
        p_product_id, 'OUT', p_quantity, p_reference_no,
        p_source, p_note, p_user_id
    );
    
    -- Update stock balance
    UPDATE stock_balance SET qty = qty - p_quantity WHERE product_id = p_product_id;
    
    -- Update product stock
    UPDATE products SET stock = stock - p_quantity WHERE id = p_product_id;
    
    -- FIFO batch allocation
    OPEN batch_cursor;
    batch_loop: LOOP
        FETCH batch_cursor INTO v_batch_no, v_batch_qty;
        IF done THEN
            LEAVE batch_loop;
        END IF;
        
        IF v_remaining_qty <= 0 THEN
            LEAVE batch_loop;
        END IF;
        
        IF v_batch_qty >= v_remaining_qty THEN
            -- This batch can fulfill the remaining quantity
            UPDATE stock_items 
            SET remaining_quantity = remaining_quantity - v_remaining_qty
            WHERE product_id = p_product_id AND batch_no = v_batch_no;
            SET v_remaining_qty = 0;
        ELSE
            -- Use entire batch
            UPDATE stock_items 
            SET remaining_quantity = 0
            WHERE product_id = p_product_id AND batch_no = v_batch_no;
            SET v_remaining_qty = v_remaining_qty - v_batch_qty;
        END IF;
    END LOOP;
    CLOSE batch_cursor;
    
    COMMIT;
END //
DELIMITER ;

-- Stock Adjustment Procedure
DELIMITER //
CREATE PROCEDURE sp_stock_adjustment(
    IN p_product_id INT,
    IN p_physical_count INT,
    IN p_reason VARCHAR(100),
    IN p_note TEXT,
    IN p_user_id INT
)
BEGIN
    DECLARE v_current_stock INT;
    DECLARE v_adjustment_qty INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Get current stock
    SELECT COALESCE(sb.qty, p.stock, 0) INTO v_current_stock
    FROM products p
    LEFT JOIN stock_balance sb ON p.id = sb.product_id
    WHERE p.id = p_product_id;
    
    -- Calculate adjustment quantity
    SET v_adjustment_qty = p_physical_count - v_current_stock;
    
    -- Insert adjustment transaction
    INSERT INTO stock_transactions (
        product_id, transaction_type, quantity, reference_no, 
        source, note, created_by
    ) VALUES (
        p_product_id, 'ADJUSTMENT', ABS(v_adjustment_qty), 
        CONCAT('ADJ-', DATE_FORMAT(NOW(), '%Y%m%d-%H%i%s')),
        'adjustment', CONCAT(p_reason, ': ', p_note), p_user_id
    );
    
    -- Update stock balance
    INSERT INTO stock_balance (product_id, qty) 
    VALUES (p_product_id, p_physical_count)
    ON DUPLICATE KEY UPDATE qty = p_physical_count;
    
    -- Update product stock
    UPDATE products SET stock = p_physical_count WHERE id = p_product_id;
    
    COMMIT;
END //
DELIMITER ;

-- =====================================================
-- PART 3: ADDITIONAL STORED PROCEDURES
-- =====================================================

USE capstone;

-- Drop existing procedures if they exist
DROP PROCEDURE IF EXISTS sp_user_login;
DROP PROCEDURE IF EXISTS sp_create_user_by_admin;
DROP PROCEDURE IF EXISTS sp_get_user_by_id;
DROP PROCEDURE IF EXISTS sp_get_user_by_email;
DROP PROCEDURE IF EXISTS sp_update_user_profile;
DROP PROCEDURE IF EXISTS sp_update_user_password;
DROP PROCEDURE IF EXISTS sp_update_user_status;
DROP PROCEDURE IF EXISTS sp_create_order;
DROP PROCEDURE IF EXISTS sp_get_user_orders;
DROP PROCEDURE IF EXISTS sp_get_order_details;
DROP PROCEDURE IF EXISTS sp_update_order_status;
DROP PROCEDURE IF EXISTS sp_update_order_payment;
DROP PROCEDURE IF EXISTS sp_cancel_order;
DROP PROCEDURE IF EXISTS sp_get_all_products;
DROP PROCEDURE IF EXISTS sp_get_product_by_id;
DROP PROCEDURE IF EXISTS sp_create_product;
DROP PROCEDURE IF EXISTS sp_update_product;
DROP PROCEDURE IF EXISTS sp_delete_product;
DROP PROCEDURE IF EXISTS sp_get_cart_items;
DROP PROCEDURE IF EXISTS sp_add_to_cart;
DROP PROCEDURE IF EXISTS sp_update_cart_item;
DROP PROCEDURE IF EXISTS sp_remove_from_cart;
DROP PROCEDURE IF EXISTS sp_clear_cart;
DROP PROCEDURE IF EXISTS sp_get_inventory_stock;
DROP PROCEDURE IF EXISTS sp_update_stock;
DROP PROCEDURE IF EXISTS sp_get_sales_performance;
DROP PROCEDURE IF EXISTS sp_get_all_users;
DROP PROCEDURE IF EXISTS sp_create_notification;
DROP PROCEDURE IF EXISTS sp_get_user_notifications;
DROP PROCEDURE IF EXISTS sp_mark_notifications_read;

DELIMITER $$

-- =====================================================
-- USER AUTHENTICATION PROCEDURES
-- =====================================================
-- NOTE: Users cannot register themselves. Only admins can create users.
-- Users can only log in after being added by an admin.

-- Login procedure
CREATE PROCEDURE sp_user_login(
    IN p_email VARCHAR(255)
)
BEGIN
    SELECT 
        id, name, email, password, role, student_id, address,
        first_name, last_name, middle_name, suffix, degree,
        year_level, section, status, contact_number, profile_image,
        is_active, must_change_password, created_at, updated_at
    FROM users
    WHERE email = p_email AND is_active = TRUE
    LIMIT 1;
END$$

-- Create new user (ADMIN ONLY - No self-registration)
CREATE PROCEDURE sp_create_user_by_admin(
    IN p_name VARCHAR(255),
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255),
    IN p_role VARCHAR(20),
    IN p_student_id VARCHAR(50),
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_middle_name VARCHAR(100),
    IN p_suffix VARCHAR(20),
    IN p_degree VARCHAR(10),
    IN p_year_level VARCHAR(20),
    IN p_section VARCHAR(10),
    IN p_status VARCHAR(20),
    IN p_contact_number VARCHAR(20),
    IN p_must_change_password BOOLEAN
)
BEGIN
    INSERT INTO users (
        name, email, password, role, student_id, 
        first_name, last_name, middle_name, suffix, degree, 
        year_level, section, status, contact_number, 
        is_active, must_change_password
    ) VALUES (
        p_name, p_email, p_password, p_role, p_student_id,
        p_first_name, p_last_name, p_middle_name, p_suffix, p_degree,
        p_year_level, p_section, p_status, p_contact_number,
        TRUE, COALESCE(p_must_change_password, FALSE)
    );
    
    SELECT LAST_INSERT_ID() as user_id;
END$$

-- Get user by ID
CREATE PROCEDURE sp_get_user_by_id(
    IN p_user_id INT
)
BEGIN
    SELECT 
        id, name, email, role, student_id, address,
        first_name, last_name, middle_name, suffix, degree,
        year_level, section, status, contact_number, profile_image,
        is_active, must_change_password, created_at, updated_at
    FROM users
    WHERE id = p_user_id
    LIMIT 1;
END$$

-- Get user by email
CREATE PROCEDURE sp_get_user_by_email(
    IN p_email VARCHAR(255)
)
BEGIN
    SELECT 
        id, name, email, role, student_id, address,
        first_name, last_name, middle_name, suffix, degree,
        year_level, section, status, contact_number, profile_image,
        is_active, must_change_password, created_at, updated_at
    FROM users
    WHERE email = p_email
    LIMIT 1;
END$$

-- Update user profile
CREATE PROCEDURE sp_update_user_profile(
    IN p_user_id INT,
    IN p_name VARCHAR(255),
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_middle_name VARCHAR(100),
    IN p_suffix VARCHAR(20),
    IN p_contact_number VARCHAR(20),
    IN p_address TEXT,
    IN p_degree VARCHAR(10),
    IN p_year_level VARCHAR(20),
    IN p_section VARCHAR(10),
    IN p_status VARCHAR(20),
    IN p_profile_image VARCHAR(255)
)
BEGIN
    UPDATE users
    SET 
        name = COALESCE(p_name, name),
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        middle_name = COALESCE(p_middle_name, middle_name),
        suffix = COALESCE(p_suffix, suffix),
        contact_number = COALESCE(p_contact_number, contact_number),
        address = COALESCE(p_address, address),
        degree = COALESCE(p_degree, degree),
        year_level = COALESCE(p_year_level, year_level),
        section = COALESCE(p_section, section),
        status = COALESCE(p_status, status),
        profile_image = COALESCE(p_profile_image, profile_image),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

-- Update user password
CREATE PROCEDURE sp_update_user_password(
    IN p_user_id INT,
    IN p_new_password VARCHAR(255)
)
BEGIN
    UPDATE users
    SET 
        password = p_new_password,
        must_change_password = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

-- Update user status (activate/deactivate) - ADMIN ONLY
CREATE PROCEDURE sp_update_user_status(
    IN p_user_id INT,
    IN p_is_active BOOLEAN
)
BEGIN
    UPDATE users
    SET 
        is_active = p_is_active,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

-- =====================================================
-- PRODUCT PROCEDURES
-- =====================================================

-- Get all products
CREATE PROCEDURE sp_get_all_products()
BEGIN
    SELECT 
        p.id, p.name, p.description, p.price, p.original_price,
        p.stock, p.base_stock, p.category_id, p.image, p.is_active,
        p.reorder_point, p.max_stock, p.last_restock_date,
        p.created_at, p.updated_at,
        c.name as category_name,
        c.description as category_description
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = TRUE AND (p.deleted_at IS NULL)
    ORDER BY p.created_at DESC;
END$$

-- Get product by ID with sizes
CREATE PROCEDURE sp_get_product_by_id(
    IN p_product_id INT
)
BEGIN
    -- Get product details
    SELECT 
        p.id, p.name, p.description, p.price, p.original_price,
        p.stock, p.base_stock, p.category_id, p.image, p.is_active,
        p.reorder_point, p.max_stock, p.last_restock_date,
        p.created_at, p.updated_at,
        c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = p_product_id AND (p.deleted_at IS NULL)
    LIMIT 1;
    
    -- Get product sizes
    SELECT 
        id, product_id, size, stock, base_stock, price, is_active,
        created_at, updated_at
    FROM product_sizes
    WHERE product_id = p_product_id AND is_active = TRUE;
END$$

-- Create new product
CREATE PROCEDURE sp_create_product(
    IN p_name VARCHAR(200),
    IN p_description TEXT,
    IN p_price DECIMAL(10,2),
    IN p_original_price DECIMAL(10,2),
    IN p_stock INT,
    IN p_category_id INT,
    IN p_image VARCHAR(255),
    IN p_reorder_point INT,
    IN p_max_stock INT
)
BEGIN
    INSERT INTO products (
        name, description, price, original_price, stock, base_stock,
        category_id, image, reorder_point, max_stock, is_active
    ) VALUES (
        p_name, p_description, p_price, p_original_price, 
        p_stock, p_stock, p_category_id, p_image, 
        p_reorder_point, p_max_stock, TRUE
    );
    
    SELECT LAST_INSERT_ID() as product_id;
END$$

-- Update product
CREATE PROCEDURE sp_update_product(
    IN p_product_id INT,
    IN p_name VARCHAR(200),
    IN p_description TEXT,
    IN p_price DECIMAL(10,2),
    IN p_original_price DECIMAL(10,2),
    IN p_category_id INT,
    IN p_image VARCHAR(255),
    IN p_reorder_point INT,
    IN p_max_stock INT,
    IN p_is_active BOOLEAN
)
BEGIN
    UPDATE products
    SET 
        name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        price = COALESCE(p_price, price),
        original_price = COALESCE(p_original_price, original_price),
        category_id = COALESCE(p_category_id, category_id),
        image = COALESCE(p_image, image),
        reorder_point = COALESCE(p_reorder_point, reorder_point),
        max_stock = COALESCE(p_max_stock, max_stock),
        is_active = COALESCE(p_is_active, is_active),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_product_id;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

-- Delete product (soft delete)
CREATE PROCEDURE sp_delete_product(
    IN p_product_id INT
)
BEGIN
    UPDATE products
    SET is_active = FALSE, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_product_id;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

-- =====================================================
-- ORDER PROCEDURES
-- =====================================================

-- Create new order
CREATE PROCEDURE sp_create_order(
    IN p_user_id INT,
    IN p_total_amount DECIMAL(10,2),
    IN p_payment_method VARCHAR(50),
    IN p_payment_status VARCHAR(50),
    IN p_status VARCHAR(50),
    IN p_notes TEXT
)
BEGIN
    INSERT INTO orders (
        user_id, total_amount, payment_method, payment_status,
        status, notes, created_at
    ) VALUES (
        p_user_id, p_total_amount, p_payment_method, p_payment_status,
        p_status, p_notes, CURRENT_TIMESTAMP
    );
    
    SELECT LAST_INSERT_ID() as order_id;
END$$

-- Get user orders
CREATE PROCEDURE sp_get_user_orders(
    IN p_user_id INT
)
BEGIN
    SELECT 
        o.id, o.user_id, o.total_amount,
        o.payment_method, o.payment_status, o.status, o.notes,
        o.created_at, o.updated_at,
        u.name as user_name, u.email, u.student_id, u.degree,
        u.year_level, u.section
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.user_id = p_user_id
    ORDER BY o.created_at DESC;
END$$

-- Get order details with items
CREATE PROCEDURE sp_get_order_details(
    IN p_order_id INT
)
BEGIN
    -- Get order info
    SELECT 
        o.id, o.user_id, o.total_amount,
        o.payment_method, o.payment_status, o.status, o.notes,
        o.created_at, o.updated_at,
        u.name as user_name, u.email, u.student_id, u.contact_number,
        u.degree, u.year_level, u.section, u.address
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = p_order_id
    LIMIT 1;
    
    -- Get order items
    SELECT 
        oi.id, oi.order_id, oi.product_id, oi.size, oi.quantity,
        oi.unit_price, oi.unit_cost, oi.total_price,
        p.name as product_name, p.image as product_image, p.description
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = p_order_id;
END$$

-- Update order status
CREATE PROCEDURE sp_update_order_status(
    IN p_order_id INT,
    IN p_status VARCHAR(50),
    IN p_notes TEXT
)
BEGIN
    DECLARE v_old_status VARCHAR(50);
    DECLARE v_user_id INT;
    DECLARE v_total_amount DECIMAL(10,2);
    DECLARE v_payment_status VARCHAR(50);
    
    -- Get current order details
    SELECT status, user_id, total_amount, payment_status
    INTO v_old_status, v_user_id, v_total_amount, v_payment_status
    FROM orders
    WHERE id = p_order_id;
    
    -- Update order status
    UPDATE orders
    SET 
        status = p_status,
        notes = COALESCE(p_notes, notes),
        payment_status = CASE 
            WHEN p_status = 'claimed' THEN 'paid'
            ELSE payment_status
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_order_id;
    
    -- Return updated order info
    SELECT 
        id, user_id, status, payment_status, total_amount,
        v_old_status as old_status,
        (p_status = 'claimed' AND v_payment_status != 'paid') as payment_status_updated,
        (p_status = 'claimed') as sales_logged,
        (p_status = 'cancelled' OR p_status = 'refunded') as inventory_updated
    FROM orders
    WHERE id = p_order_id;
END$$

-- Update order payment method
CREATE PROCEDURE sp_update_order_payment(
    IN p_order_id INT,
    IN p_payment_method VARCHAR(50),
    IN p_payment_status VARCHAR(50)
)
BEGIN
    UPDATE orders
    SET 
        payment_method = p_payment_method,
        payment_status = COALESCE(p_payment_status, payment_status),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_order_id;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

-- Cancel order
CREATE PROCEDURE sp_cancel_order(
    IN p_order_id INT,
    IN p_user_id INT,
    IN p_cancellation_reason TEXT
)
BEGIN
    UPDATE orders
    SET 
        status = 'cancelled',
        notes = CONCAT(COALESCE(notes, ''), ' | Cancelled by user: ', p_cancellation_reason),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_order_id AND user_id = p_user_id;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

-- =====================================================
-- CART PROCEDURES
-- =====================================================

-- Get cart items for user
CREATE PROCEDURE sp_get_cart_items(
    IN p_user_id INT
)
BEGIN
    SELECT 
        c.id, c.user_id, c.product_id, c.size, c.quantity,
        c.created_at, c.updated_at,
        p.name as product_name, p.description, p.price, p.image,
        p.stock, p.is_active,
        p.stock as available_stock,
        p.price as item_price
    FROM cart_items c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = p_user_id AND p.is_active = TRUE AND (p.deleted_at IS NULL);
END$$

-- Add item to cart
CREATE PROCEDURE sp_add_to_cart(
    IN p_user_id INT,
    IN p_product_id INT,
    IN p_size_id INT,
    IN p_quantity INT
)
BEGIN
    DECLARE v_cart_id INT;
    DECLARE v_size_name VARCHAR(20);
    
    -- Get size name if size_id is provided
    IF p_size_id IS NOT NULL THEN
        SELECT size INTO v_size_name FROM product_sizes WHERE id = p_size_id LIMIT 1;
    END IF;
    
    -- Check if item already exists in cart
    SELECT id INTO v_cart_id
    FROM cart_items
    WHERE user_id = p_user_id 
      AND product_id = p_product_id 
      AND (size = v_size_name OR (size IS NULL AND v_size_name IS NULL))
    LIMIT 1;
    
    IF v_cart_id IS NOT NULL THEN
        -- Update existing cart item
        UPDATE cart_items
        SET quantity = quantity + p_quantity, updated_at = CURRENT_TIMESTAMP
        WHERE id = v_cart_id;
        
        SELECT v_cart_id as cart_id, 'updated' as action;
    ELSE
        -- Insert new cart item
        INSERT INTO cart_items (user_id, product_id, size, quantity, created_at)
        VALUES (p_user_id, p_product_id, v_size_name, p_quantity, CURRENT_TIMESTAMP);
        
        SELECT LAST_INSERT_ID() as cart_id, 'created' as action;
    END IF;
END$$

-- Update cart item quantity
CREATE PROCEDURE sp_update_cart_item(
    IN p_cart_id INT,
    IN p_user_id INT,
    IN p_quantity INT
)
BEGIN
    UPDATE cart_items
    SET quantity = p_quantity, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_cart_id AND user_id = p_user_id;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

-- Remove item from cart
CREATE PROCEDURE sp_remove_from_cart(
    IN p_cart_id INT,
    IN p_user_id INT
)
BEGIN
    DELETE FROM cart_items
    WHERE id = p_cart_id AND user_id = p_user_id;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

-- Clear entire cart
CREATE PROCEDURE sp_clear_cart(
    IN p_user_id INT
)
BEGIN
    DELETE FROM cart_items
    WHERE user_id = p_user_id;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

-- =====================================================
-- INVENTORY/STOCK PROCEDURES
-- =====================================================

-- Get current inventory stock
CREATE PROCEDURE sp_get_inventory_stock()
BEGIN
    SELECT 
        p.id, p.name, p.stock, p.base_stock, p.reorder_point,
        p.max_stock, p.last_restock_date, p.price,
        c.name as category_name,
        (p.stock <= p.reorder_point) as is_low_stock,
        (p.reorder_point - p.stock) as stock_deficit
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = TRUE AND (p.deleted_at IS NULL)
    ORDER BY p.stock ASC, p.name ASC;
    
    -- Get size-specific stock
    SELECT 
        ps.id, ps.product_id, ps.size, ps.stock, ps.base_stock,
        p.name as product_name, p.reorder_point
    FROM product_sizes ps
    JOIN products p ON ps.product_id = p.id
    WHERE ps.is_active = TRUE AND p.is_active = TRUE AND (p.deleted_at IS NULL)
    ORDER BY ps.stock ASC;
END$$

-- Update product stock
CREATE PROCEDURE sp_update_stock(
    IN p_product_id INT,
    IN p_size VARCHAR(20),
    IN p_quantity_change INT,
    IN p_movement_type VARCHAR(50),
    IN p_reference_no VARCHAR(100),
    IN p_notes TEXT
)
BEGIN
    DECLARE v_old_stock INT;
    DECLARE v_new_stock INT;
    
    IF p_size IS NULL THEN
        -- Update main product stock
        SELECT stock INTO v_old_stock FROM products WHERE id = p_product_id;
        SET v_new_stock = v_old_stock + p_quantity_change;
        
        UPDATE products
        SET stock = v_new_stock,
            last_restock_date = CASE WHEN p_movement_type = 'restock' THEN CURRENT_TIMESTAMP ELSE last_restock_date END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_product_id;
    ELSE
        -- Update size-specific stock
        SELECT stock INTO v_old_stock 
        FROM product_sizes 
        WHERE product_id = p_product_id AND size = p_size;
        
        SET v_new_stock = v_old_stock + p_quantity_change;
        
        UPDATE product_sizes
        SET stock = v_new_stock, updated_at = CURRENT_TIMESTAMP
        WHERE product_id = p_product_id AND size = p_size;
    END IF;
    
    -- Log stock movement
    INSERT INTO inventory_movements (
        product_id, movement_type, quantity,
        reason, notes, created_at
    ) VALUES (
        p_product_id, p_movement_type, p_quantity_change,
        p_reference_no, p_notes, CURRENT_TIMESTAMP
    );
    
    SELECT v_old_stock as old_stock, v_new_stock as new_stock, LAST_INSERT_ID() as movement_id;
END$$

-- =====================================================
-- SALES & REPORTING PROCEDURES
-- =====================================================

-- Get sales performance
CREATE PROCEDURE sp_get_sales_performance(
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_group_by VARCHAR(20)
)
BEGIN
    DECLARE v_group_clause VARCHAR(100);
    
    -- Determine grouping clause
    SET v_group_clause = CASE p_group_by
        WHEN 'month' THEN "DATE_FORMAT(o.created_at, '%Y-%m')"
        WHEN 'year' THEN "YEAR(o.created_at)"
        ELSE "DATE(o.created_at)"
    END;
    
    -- Sales data by period
    SET @sql = CONCAT('
        SELECT 
            ', v_group_clause, ' as period,
            COUNT(*) as orders,
            SUM(o.total_amount) as revenue,
            AVG(o.total_amount) as avg_order_value,
            COUNT(CASE WHEN LOWER(o.payment_method) = "gcash" THEN 1 END) as gcash_orders,
            COUNT(CASE WHEN LOWER(o.payment_method) = "cash" THEN 1 END) as cash_orders,
            SUM(CASE WHEN LOWER(o.payment_method) = "gcash" THEN o.total_amount ELSE 0 END) as gcash_revenue,
            SUM(CASE WHEN LOWER(o.payment_method) = "cash" THEN o.total_amount ELSE 0 END) as cash_revenue
        FROM orders o
        WHERE o.status = "claimed"
        ', IF(p_start_date IS NOT NULL, CONCAT(' AND DATE(o.created_at) >= "', p_start_date, '"'), ''), '
        ', IF(p_end_date IS NOT NULL, CONCAT(' AND DATE(o.created_at) <= "', p_end_date, '"'), ''), '
        GROUP BY ', v_group_clause, '
        ORDER BY period DESC
    ');
    
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

-- =====================================================
-- USER MANAGEMENT PROCEDURES
-- =====================================================

-- Get all users (admin)
CREATE PROCEDURE sp_get_all_users(
    IN p_role VARCHAR(20)
)
BEGIN
    IF p_role IS NULL THEN
        SELECT 
            id, name, email, role, student_id, first_name, last_name,
            degree, year_level, section, status, contact_number,
            profile_image, is_active, created_at, updated_at
        FROM users
        ORDER BY created_at DESC;
    ELSE
        SELECT 
            id, name, email, role, student_id, first_name, last_name,
            degree, year_level, section, status, contact_number,
            profile_image, is_active, created_at, updated_at
        FROM users
        WHERE role = p_role
        ORDER BY created_at DESC;
    END IF;
END$$

-- =====================================================
-- NOTIFICATION PROCEDURES
-- =====================================================

-- Create notification
CREATE PROCEDURE sp_create_notification(
    IN p_user_id INT,
    IN p_title VARCHAR(255),
    IN p_message TEXT,
    IN p_type VARCHAR(50),
    IN p_reference_type VARCHAR(50),
    IN p_reference_id INT
)
BEGIN
    INSERT INTO notifications (
        user_id, title, message, type, related_type, related_id,
        is_read, created_at
    ) VALUES (
        p_user_id, p_title, p_message, p_type, p_reference_type, p_reference_id,
        FALSE, CURRENT_TIMESTAMP
    );
    
    SELECT LAST_INSERT_ID() as notification_id;
END$$

-- Get user notifications
CREATE PROCEDURE sp_get_user_notifications(
    IN p_user_id INT,
    IN p_limit INT
)
BEGIN
    SELECT 
        id, user_id, title, message, type, related_type, related_id,
        is_read, created_at
    FROM notifications
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT p_limit;
END$$

-- Mark notifications as read
CREATE PROCEDURE sp_mark_notifications_read(
    IN p_user_id INT,
    IN p_notification_ids TEXT
)
BEGIN
    UPDATE notifications
    SET is_read = TRUE
    WHERE user_id = p_user_id 
      AND FIND_IN_SET(id, p_notification_ids) > 0;
    
    SELECT ROW_COUNT() as affected_rows;
END$$

DELIMITER ;

-- =====================================================
-- PART 4: TRIGGERS
-- =====================================================

-- Trigger to generate order number
DELIMITER //
CREATE TRIGGER tr_orders_before_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        CALL GenerateOrderNumber();
        SET NEW.order_number = (SELECT order_number FROM (SELECT order_number FROM orders ORDER BY id DESC LIMIT 1) AS temp);
    END IF;
END //
DELIMITER ;

-- Trigger to update stock balance when stock_items change
DELIMITER //
CREATE TRIGGER tr_stock_items_after_update
AFTER UPDATE ON stock_items
FOR EACH ROW
BEGIN
    UPDATE stock_balance 
    SET qty = (
        SELECT SUM(remaining_quantity) 
        FROM stock_items 
        WHERE product_id = NEW.product_id
    )
    WHERE product_id = NEW.product_id;
END //
DELIMITER ;

-- Trigger to log inventory movements
DELIMITER //
CREATE TRIGGER tr_inventory_movements_after_insert
AFTER INSERT ON inventory_movements
FOR EACH ROW
BEGIN
    -- Update product stock
    IF NEW.movement_type = 'stock_in' THEN
        UPDATE products SET stock = stock + NEW.quantity WHERE id = NEW.product_id;
    ELSE
        UPDATE products SET stock = stock - NEW.quantity WHERE id = NEW.product_id;
    END IF;
END //
DELIMITER ;

-- =====================================================
-- PART 5: VIEWS
-- =====================================================

-- Order Summary View
CREATE VIEW v_order_summary AS
SELECT 
    o.id,
    o.order_number,
    o.user_id,
    u.name as user_name,
    u.student_id,
    o.total_amount,
    o.status,
    o.payment_status,
    o.created_at,
    COUNT(oi.id) as item_count
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;

-- Product Inventory View
CREATE VIEW v_product_inventory AS
SELECT 
    p.id,
    p.name,
    p.category_id,
    c.name as category_name,
    COALESCE(sb.qty, p.stock, 0) as current_stock,
    p.reorder_point,
    p.max_stock,
    CASE 
        WHEN COALESCE(sb.qty, p.stock, 0) <= p.reorder_point THEN 'LOW'
        WHEN COALESCE(sb.qty, p.stock, 0) <= (p.reorder_point * 2) THEN 'MEDIUM'
        ELSE 'GOOD'
    END as stock_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN stock_balance sb ON p.id = sb.product_id
WHERE p.is_active = TRUE AND (p.deleted_at IS NULL);

-- Sales Summary View
CREATE VIEW v_sales_summary AS
SELECT 
    DATE(o.created_at) as sale_date,
    COUNT(*) as total_orders,
    SUM(o.total_amount) as total_revenue,
    AVG(o.total_amount) as average_order_value
FROM orders o
WHERE o.status IN ('completed', 'claimed')
GROUP BY DATE(o.created_at)
ORDER BY sale_date DESC;

-- Current Stock View
CREATE VIEW v_current_stock AS
SELECT 
    p.id,
    p.name,
    p.category_id,
    c.name as category_name,
    COALESCE(sb.qty, p.stock, 0) as current_stock,
    p.reorder_point,
    p.max_stock,
    CASE 
        WHEN COALESCE(sb.qty, p.stock, 0) = 0 THEN 'CRITICAL'
        WHEN COALESCE(sb.qty, p.stock, 0) <= p.reorder_point THEN 'LOW'
        ELSE 'GOOD'
    END as stock_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN stock_balance sb ON p.id = sb.product_id
WHERE p.is_active = TRUE AND (p.deleted_at IS NULL);

-- Low Stock Products View
CREATE VIEW v_low_stock_products AS
SELECT 
    p.id,
    p.name,
    c.name as category_name,
    COALESCE(sb.qty, p.stock, 0) as current_stock,
    p.reorder_point,
    CASE 
        WHEN COALESCE(sb.qty, p.stock, 0) = 0 THEN 'CRITICAL'
        WHEN COALESCE(sb.qty, p.stock, 0) <= p.reorder_point THEN 'LOW'
        ELSE 'GOOD'
    END as alert_level
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN stock_balance sb ON p.id = sb.product_id
WHERE p.is_active = TRUE 
  AND (p.deleted_at IS NULL)
  AND COALESCE(sb.qty, p.stock, 0) <= p.reorder_point;

-- Stock History View
CREATE VIEW v_stock_history AS
SELECT 
    st.id,
    st.product_id,
    p.name as product_name,
    st.transaction_type,
    st.quantity,
    st.reference_no,
    st.batch_no,
    st.expiry_date,
    st.source,
    st.note,
    st.created_at,
    u.name as created_by_name
FROM stock_transactions st
LEFT JOIN products p ON st.product_id = p.id
LEFT JOIN users u ON st.created_by = u.id
ORDER BY st.created_at DESC;

-- =====================================================
-- PART 6: ADDITIONAL INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional indexes for better performance
CREATE INDEX idx_stock_transactions_product_type ON stock_transactions(product_id, transaction_type);
CREATE INDEX idx_stock_transactions_created_at ON stock_transactions(created_at);
CREATE INDEX idx_cart_items_user_product ON cart_items(user_id, product_id);

-- =====================================================
-- PART 7: INITIAL DATA
-- =====================================================

-- Insert Default Admin Account
-- Email: acounting.office.cpc@gmail.com
-- Password: accountingoffice (hashed with bcrypt)
INSERT INTO users (
  name,
  email, 
  password, 
  role, 
  first_name, 
  last_name,
  created_at
) VALUES (
  'accounting office',
  'acounting.office.cpc@gmail.com',
  '$2b$10$q5TO2hXTQ/wm5qd6klvA6uJ/ZnY..BSd67XYfXIgIYI/zF9pKVa1m',  -- Password: accountingoffice
  'admin',
  'Accounting',
  'Office',
  NOW()
);

-- =====================================================
-- PART 8: GRANTS AND PERMISSIONS
-- =====================================================

-- Create application user (if needed)
-- CREATE USER 'capstone_user'@'localhost' IDENTIFIED BY 'capstone_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON capstone.* TO 'capstone_user'@'localhost';
-- FLUSH PRIVILEGES;

-- =====================================================
-- SCHEMA COMPLETION MESSAGE
-- =====================================================
SELECT 'CPC ESSEN DATABASE SCHEMA CREATED SUCCESSFULLY!' as message;
SELECT 'Tables created: users, categories, products, product_sizes, stock_transactions, stock_balance, stock_items, stock_movements, cart_items, orders, order_items, order_status_logs, payment_transactions, inventory_movements, notifications, password_reset_codes, degree_shifts' as tables;
SELECT 'Stored procedures: GenerateOrderNumber, sp_stock_in, sp_stock_out, sp_stock_adjustment, and all user/product/order/cart/notification procedures' as procedures;
SELECT 'Views: v_order_summary, v_product_inventory, v_sales_summary, v_current_stock, v_low_stock_products, v_stock_history' as views;
SELECT 'Migrations included: deleted_at column, size_id column, verified column, degree_shifts table' as migrations;
SELECT 'Default admin account created - Email: acounting.office.cpc@gmail.com' as admin_account;

