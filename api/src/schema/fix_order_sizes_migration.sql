-- =====================================================
-- Migration to Fix Existing Order Items Sizes
-- =====================================================
-- This migration updates all existing order_items that have size_id 
-- but no size name, by copying the size from product_sizes table
-- Run this ONCE to fix historical orders
-- =====================================================

USE capstone;

-- Update existing order_items with their size names
UPDATE order_items oi
JOIN product_sizes ps ON oi.size_id = ps.id
SET oi.size = ps.size
WHERE oi.size_id IS NOT NULL 
  AND (oi.size IS NULL OR oi.size = '');

-- Show results
SELECT 
  'Migration Complete' as status,
  COUNT(*) as fixed_items
FROM order_items
WHERE size_id IS NOT NULL AND size IS NOT NULL;

-- Sample check - show some updated items
SELECT 
  oi.id,
  oi.product_name,
  oi.size,
  oi.size_id,
  ps.size as size_from_table
FROM order_items oi
LEFT JOIN product_sizes ps ON oi.size_id = ps.id
WHERE oi.size_id IS NOT NULL
LIMIT 10;

