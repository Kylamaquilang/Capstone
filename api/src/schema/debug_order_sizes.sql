-- =====================================================
-- Debug Query: Check Order Items Size Data
-- =====================================================
-- Run this to see what's actually stored in order_items
-- =====================================================

USE capstone;

-- 1. Check all order_items with their size data
SELECT 
    oi.id,
    o.order_number,
    o.status,
    oi.product_name,
    oi.size AS size_in_order_items,
    oi.size_id,
    ps.size AS size_in_product_sizes_table,
    oi.quantity,
    o.created_at
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
LEFT JOIN product_sizes ps ON oi.size_id = ps.id
WHERE o.status IN ('claimed', 'completed')
ORDER BY o.created_at DESC
LIMIT 20;

-- 2. Count how many orders have size vs no size
SELECT 
    'Has Size' as category,
    COUNT(*) as count
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status IN ('claimed', 'completed')
  AND oi.size IS NOT NULL 
  AND oi.size != ''
UNION ALL
SELECT 
    'No Size' as category,
    COUNT(*) as count
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status IN ('claimed', 'completed')
  AND (oi.size IS NULL OR oi.size = '');

-- 3. Check if there are any orders with size_id but no size name
SELECT 
    oi.id,
    oi.product_name,
    oi.size_id,
    oi.size,
    ps.size as available_size
FROM order_items oi
LEFT JOIN product_sizes ps ON oi.size_id = ps.id
WHERE oi.size_id IS NOT NULL 
  AND (oi.size IS NULL OR oi.size = '')
LIMIT 10;

