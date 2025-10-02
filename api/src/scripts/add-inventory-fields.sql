-- Add missing inventory fields to products table
-- Run this script to update existing database

USE capstone;

-- Add new columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS product_code VARCHAR(50) UNIQUE AFTER id,
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(20) DEFAULT 'pcs' AFTER brand,
ADD COLUMN IF NOT EXISTS supplier VARCHAR(200) AFTER unit_of_measure,
ADD COLUMN IF NOT EXISTS reorder_level INT DEFAULT 5 AFTER supplier,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100) AFTER reorder_level;

-- Add constraint for reorder_level
ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS chk_reorder_level CHECK (reorder_level >= 0);

-- Update existing products with default values
UPDATE products 
SET 
    product_code = CONCAT('PRD', LPAD(id, 3, '0')),
    unit_of_measure = 'pcs',
    reorder_level = 5
WHERE 
    product_code IS NULL 
    OR unit_of_measure IS NULL 
    OR reorder_level IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier);
CREATE INDEX IF NOT EXISTS idx_products_reorder_level ON products(reorder_level);

-- Show the updated table structure
DESCRIBE products;

