# Size Tracking for Reports - Implementation Guide

## Overview
This update adds size/variant tracking to the admin reports system, allowing you to see which specific sizes were restocked, deducted, or sold.

## What Was Changed

### 1. Database Changes
- **Migration File**: `add_size_to_stock_movements.sql`
- Added `size_id` column to `stock_movements` table
- Added foreign key to `product_sizes` table
- Added index for performance

### 2. Backend Changes (API)
- **Updated**: `api/src/controllers/stock-movement.controller.js`
  - Modified `createStockMovement` to accept and store size information
  - Updated `getRestockReport` to include size in query results
  - Updated `getSalesUsageReport` to include size in query results
  - Enhanced `getCurrentInventoryReport` to show sizes per row

### 3. Frontend Changes (Client)
- **Updated**: `client/src/app/admin/reports/page.js`
  - Added "Size" column to Restock Report table
  - Added "Size" column to Sales Report table (already had it)
  - Updated PDF generation to include size information
  - Updated print/download functions to include size data

- **Updated**: `client/src/app/admin/reports/inventory/page.js`
  - Added size display with badges for restock report
  - Added size display with badges for sales/usage report
  - Improved visual presentation of size information

## How to Apply the Changes

### Step 1: Run the Database Migration

**Option A: Using MySQL Workbench or phpMyAdmin**
1. Open your database management tool
2. Connect to your `capstone` database
3. Open the file: `api/migrations/add_size_to_stock_movements.sql`
4. Execute the entire script
5. Check the results - you should see a success message

**Option B: Using MySQL Command Line**
```bash
# Navigate to the migrations folder
cd api/migrations

# Run the migration
mysql -u your_username -p capstone < add_size_to_stock_movements.sql

# You'll be prompted for your password
```

**Option C: Using Node.js Script (if you prefer)**
```javascript
// Create a file: api/migrations/run_migration.js
import { pool } from '../src/database/db.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'add_size_to_stock_movements.sql'),
      'utf8'
    );
    
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
```

Then run: `node api/migrations/run_migration.js`

### Step 2: Restart the Backend Server

```bash
cd api
npm run dev  # or npm start for production
```

### Step 3: Restart the Frontend (if running)

```bash
cd client
npm run dev  # or npm start for production
```

### Step 4: Verify the Changes

1. **Test Restock with Size**:
   - Go to Admin → Products
   - Click on a product with sizes
   - Click "Restock"
   - Select a specific size
   - Add quantity and submit
   - Go to Admin → Reports → Restock Report
   - You should see the size in the report!

2. **Test Sales Report**:
   - Create an order with sized products
   - Mark order as "claimed" or "completed"
   - Go to Admin → Reports → Sales Report
   - You should see the size column populated

3. **Test Inventory Report**:
   - Go to Admin → Reports → Inventory Report
   - Products with sizes should show each size as a separate row

## Expected Results

### Restock Report - Before and After

**Before** (No size info):
```
Date       | Product      | Quantity | Stock Before | Stock After
-----------|--------------|----------|--------------|-------------
2025-01-24 | PE Uniform   | 10       | 20           | 30
```

**After** (With size info):
```
Date       | Product      | Size | Quantity | Stock Before | Stock After
-----------|--------------|------|----------|--------------|-------------
2025-01-24 | PE Uniform   | XL   | 10       | 20           | 30
2025-01-24 | PE Uniform   | M    | 5        | 15           | 20
```

### Sales Report
Now shows the exact size that was ordered:
```
Date       | Product Name | Size | Quantity | Unit Price | Total    | Payment
-----------|--------------|------|----------|------------|----------|----------
2025-01-24 | PE Uniform   | XL   | 2        | ₱500.00    | ₱1000.00 | GCash
2025-01-24 | ID Lace      | N/A  | 1        | ₱50.00     | ₱50.00   | Cash
```

### Inventory Report
Shows each size as a separate line item:
```
Product Name | Category | Size/Variant | Qty in Stock | Status
-------------|----------|--------------|--------------|----------
PE Uniform   | Uniform  | XS           | 5            | Low Stock
PE Uniform   | Uniform  | S            | 10           | In Stock
PE Uniform   | Uniform  | M            | 15           | In Stock
PE Uniform   | Uniform  | L            | 12           | In Stock
PE Uniform   | Uniform  | XL           | 8            | In Stock
ID Lace      | School   | N/A          | 50           | In Stock
```

## Troubleshooting

### Issue: "Table doesn't exist" error
**Solution**: Make sure you've run the migration SQL script on your database.

### Issue: Sizes showing as "N/A" in old records
**Explanation**: This is expected! Old stock movements that were created before this update won't have size information. Only new restock/deduct operations will have size data.

### Issue: Size not showing in reports
**Checklist**:
1. Did you run the database migration?
2. Did you restart the backend server?
3. Did you clear your browser cache?
4. When restocking, did you select a specific size (not "All sizes")?

### Issue: Foreign key constraint error
**Solution**: This might happen if you have existing data with invalid references. To fix:
```sql
-- Check for orphaned records
SELECT * FROM stock_movements WHERE size_id IS NOT NULL AND size_id NOT IN (SELECT id FROM product_sizes);

-- If found, set them to NULL
UPDATE stock_movements SET size_id = NULL WHERE size_id NOT IN (SELECT id FROM product_sizes);
```

## Backwards Compatibility

✅ **Fully backwards compatible!**
- Existing stock movements without size information will continue to work
- They will just show "N/A" in the size column
- Products without sizes continue to work normally
- No data will be lost

## Testing Checklist

- [ ] Database migration runs without errors
- [ ] Backend server starts successfully
- [ ] Can restock a product with sizes
- [ ] Selected size appears in Restock Report
- [ ] Can restock without selecting a size (base stock)
- [ ] Sales report shows sizes for completed orders
- [ ] Inventory report displays each size separately
- [ ] PDF download includes size information
- [ ] Print preview shows size column

## Need Help?

If you encounter any issues:
1. Check the backend console logs for errors
2. Check the browser console for frontend errors
3. Verify the migration ran successfully: 
   ```sql
   DESCRIBE stock_movements;
   -- Should show 'size_id' column
   ```
4. Test with a simple product that has multiple sizes

## Summary

This update enhances your reporting system to track product sizes/variants. Now you can:
- See which exact sizes were restocked
- Track which sizes are being sold the most
- Generate detailed inventory reports broken down by size
- Make better purchasing decisions based on size-specific data

All reports now provide more granular information to help you manage your inventory more effectively! 🎉


