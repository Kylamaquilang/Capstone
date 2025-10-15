# 🎨 **VISUAL SYSTEM DIAGRAMS**

## 📊 **ENTITY RELATIONSHIP DIAGRAM (ERD)**

<function_calls>
<invoke name="create_diagram">
<parameter name="content">erDiagram
    USERS {
        int id PK
        varchar name
        varchar email UK
        varchar password
        enum role
        varchar student_id UK
        varchar phone
        text address
        boolean is_active
        boolean must_change_password
        timestamp created_at
        timestamp updated_at
    }

    CATEGORIES {
        int id PK
        varchar name UK
        text description
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    PRODUCTS {
        int id PK
        varchar name
        text description
        decimal price
        decimal original_price
        int stock
        int category_id FK
        varchar image
        varchar size
        varchar color
        varchar brand
        boolean is_active
        int reorder_point
        int max_stock
        datetime last_restock_date
        timestamp created_at
        timestamp updated_at
    }

    PRODUCT_SIZES {
        int id PK
        int product_id FK
        varchar size
        int stock
        decimal price
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    STOCK_TRANSACTIONS {
        int id PK
        int product_id FK
        enum transaction_type
        int quantity
        varchar reference_no
        varchar batch_no
        date expiry_date
        varchar source
        text note
        timestamp created_at
        int created_by FK
    }

    STOCK_BALANCE {
        int product_id PK,FK
        int qty
        timestamp updated_at
    }

    STOCK_ITEMS {
        int id PK
        int product_id FK
        varchar batch_no
        date expiry_date
        int initial_quantity
        int remaining_quantity
        decimal unit_cost
        timestamp created_at
    }

    CART_ITEMS {
        int id PK
        int user_id FK
        int product_id FK
        varchar size
        int quantity
        timestamp created_at
        timestamp updated_at
    }

    ORDERS {
        int id PK
        varchar order_number UK
        int user_id FK
        decimal total_amount
        enum status
        enum payment_status
        varchar payment_method
        text notes
        timestamp created_at
        timestamp updated_at
    }

    ORDER_ITEMS {
        int id PK
        int order_id FK
        int product_id FK
        varchar product_name
        varchar size
        int quantity
        decimal unit_price
        decimal total_price
        timestamp created_at
    }

    ORDER_STATUS_LOGS {
        int id PK
        int order_id FK
        varchar old_status
        varchar new_status
        int changed_by FK
        text reason
        timestamp created_at
    }

    PAYMENT_TRANSACTIONS {
        int id PK
        int order_id FK
        varchar transaction_id UK
        decimal amount
        varchar currency
        varchar payment_method
        enum status
        text gateway_response
        timestamp created_at
        timestamp updated_at
    }

    NOTIFICATIONS {
        int id PK
        int user_id FK
        varchar title
        text message
        enum type
        boolean read
        timestamp created_at
    }

    %% Relationships
    USERS ||--o{ CART_ITEMS : "has"
    USERS ||--o{ ORDERS : "places"
    USERS ||--o{ ORDER_STATUS_LOGS : "changes"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ STOCK_TRANSACTIONS : "creates"

    CATEGORIES ||--o{ PRODUCTS : "contains"

    PRODUCTS ||--o{ PRODUCT_SIZES : "has"
    PRODUCTS ||--o{ CART_ITEMS : "added_to"
    PRODUCTS ||--o{ ORDER_ITEMS : "ordered"
    PRODUCTS ||--o{ STOCK_TRANSACTIONS : "tracked_in"
    PRODUCTS ||--o{ STOCK_BALANCE : "has"
    PRODUCTS ||--o{ STOCK_ITEMS : "has"

    ORDERS ||--o{ ORDER_ITEMS : "contains"
    ORDERS ||--o{ ORDER_STATUS_LOGS : "has"
    ORDERS ||--o{ PAYMENT_TRANSACTIONS : "has"
