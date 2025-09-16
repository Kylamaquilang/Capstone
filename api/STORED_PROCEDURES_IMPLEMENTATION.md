# Stored Procedures Implementation

## Overview
This document outlines the implementation of stored procedures in the ESSEN Store system. The system has been converted from direct SQL queries to stored procedures for critical operations to improve performance, security, and maintainability.

## Implemented Stored Procedures

### 1. User Authentication (`sp_authenticate_user`)
**Purpose**: Authenticate users by student ID or email
**Parameters**:
- `p_identifier` (VARCHAR): Student ID or email
- `p_identifier_type` (VARCHAR): 'student_id' or 'email'

**Usage**:
```sql
CALL sp_authenticate_user('ADMIN001', 'student_id');
```

### 2. User Registration (`sp_register_user`)
**Purpose**: Register new users with validation
**Parameters**:
- `p_student_id` (VARCHAR): Student ID
- `p_email` (VARCHAR): Email address
- `p_name` (VARCHAR): Full name
- `p_password` (VARCHAR): Hashed password
- `p_role` (VARCHAR): User role ('student' or 'admin')
- `p_contact_number` (VARCHAR): Contact number
- `p_user_id` (OUT INT): Generated user ID
- `p_success` (OUT BOOLEAN): Success status
- `p_message` (OUT VARCHAR): Result message

**Usage**:
```sql
CALL sp_register_user('STU001', 'student@example.com', 'John Doe', 'hashedpass', 'student', '1234567890', @user_id, @success, @message);
SELECT @user_id, @success, @message;
```

### 3. Product Creation (`sp_create_product`)
**Purpose**: Create new products with duplicate name checking
**Parameters**:
- `p_name` (VARCHAR): Product name
- `p_description` (TEXT): Product description
- `p_price` (DECIMAL): Product price
- `p_stock` (INT): Initial stock
- `p_category_id` (INT): Category ID
- `p_image` (VARCHAR): Image URL
- `p_product_id` (OUT INT): Generated product ID
- `p_success` (OUT BOOLEAN): Success status
- `p_message` (OUT VARCHAR): Result message

**Usage**:
```sql
CALL sp_create_product('New Product', 'Description', 99.99, 10, 1, 'image.jpg', @product_id, @success, @message);
SELECT @product_id, @success, @message;
```

### 4. Order Processing (`sp_process_order`)
**Purpose**: Process complete orders with inventory management
**Parameters**:
- `p_user_id` (INT): User ID
- `p_total_amount` (DECIMAL): Total order amount
- `p_payment_method` (VARCHAR): Payment method
- `p_pay_at_counter` (BOOLEAN): Pay at counter flag
- `p_cart_items` (JSON): Cart items as JSON array
- `p_order_id` (OUT INT): Generated order ID
- `p_success` (OUT BOOLEAN): Success status
- `p_message` (OUT VARCHAR): Result message

**Usage**:
```sql
CALL sp_process_order(1, 500.00, 'cash', false, '[{"product_id":1,"quantity":2,"price":250.00,"size_id":null}]', @order_id, @success, @message);
SELECT @order_id, @success, @message;
```

### 5. Order Status Update (`sp_update_order_status`)
**Purpose**: Update order status with logging and notifications
**Parameters**:
- `p_order_id` (INT): Order ID
- `p_new_status` (VARCHAR): New status
- `p_notes` (TEXT): Status change notes
- `p_admin_id` (INT): Admin user ID
- `p_success` (OUT BOOLEAN): Success status
- `p_message` (OUT VARCHAR): Result message

**Usage**:
```sql
CALL sp_update_order_status(1, 'processing', 'Order being prepared', 1, @success, @message);
SELECT @success, @message;
```

### 6. Inventory Management (`sp_update_inventory`)
**Purpose**: Update product inventory with movement logging
**Parameters**:
- `p_product_id` (INT): Product ID
- `p_size_id` (INT): Size ID (optional)
- `p_quantity_change` (INT): Quantity change (+/-)
- `p_movement_type` (VARCHAR): Movement type
- `p_reason` (VARCHAR): Reason for change
- `p_order_id` (INT): Related order ID (optional)
- `p_success` (OUT BOOLEAN): Success status
- `p_message` (OUT VARCHAR): Result message

**Usage**:
```sql
CALL sp_update_inventory(1, null, 5, 'purchase', 'Stock replenishment', null, @success, @message);
SELECT @success, @message;
```

### 7. Sales Analytics (`sp_get_sales_analytics`)
**Purpose**: Generate sales analytics data
**Parameters**:
- `p_start_date` (DATE): Start date (optional)
- `p_end_date` (DATE): End date (optional)
- `p_group_by` (VARCHAR): Grouping ('day', 'month', 'year')

**Usage**:
```sql
CALL sp_get_sales_analytics('2024-01-01', '2024-12-31', 'month');
```

## Benefits of Stored Procedures

### 1. Performance
- **Reduced Network Traffic**: Multiple SQL statements executed in one call
- **Pre-compiled Execution**: Faster execution than dynamic SQL
- **Optimized Query Plans**: Database optimizer can better optimize stored procedures

### 2. Security
- **SQL Injection Prevention**: Parameters are properly escaped
- **Access Control**: Database-level permissions for procedures
- **Data Validation**: Business logic enforced at database level

### 3. Maintainability
- **Centralized Logic**: Business rules in one place
- **Version Control**: Procedures can be versioned and tracked
- **Consistency**: Same logic across all applications

### 4. Transaction Management
- **Atomic Operations**: Complex operations wrapped in transactions
- **Rollback Capability**: Automatic rollback on errors
- **Data Integrity**: Ensures data consistency

## Testing

A test script has been created at `api/src/scripts/test_stored_procedures.js` to verify all stored procedures work correctly.

To run the tests:
```bash
cd api
node src/scripts/test_stored_procedures.js
```

## Migration Notes

### Before (Direct SQL)
```javascript
const [users] = await pool.query(
  `SELECT * FROM users WHERE ${identifierField} = ?`,
  [identifier]
);
```

### After (Stored Procedures)
```javascript
const [users] = await pool.query(
  'CALL sp_authenticate_user(?, ?)',
  [identifier, identifierField]
);
```

## Database Setup

The stored procedures are automatically created when running the database setup script:
```bash
cd api
node src/scripts/setup_database.js
```

## Error Handling

All stored procedures include comprehensive error handling:
- **Exception Handlers**: Catch and handle SQL exceptions
- **Transaction Rollback**: Automatic rollback on errors
- **Meaningful Messages**: Clear error messages returned to application
- **Status Indicators**: Success/failure status for each operation

## Future Enhancements

1. **Additional Procedures**: More complex business logic can be moved to stored procedures
2. **Performance Monitoring**: Add logging for procedure execution times
3. **Caching**: Implement result caching for frequently used procedures
4. **Batch Operations**: Create procedures for bulk operations

## Conclusion

The implementation of stored procedures significantly improves the system's:
- **Performance** through optimized database operations
- **Security** through parameterized queries and access control
- **Maintainability** through centralized business logic
- **Reliability** through transaction management and error handling

The system now follows database best practices and is more scalable and maintainable.
