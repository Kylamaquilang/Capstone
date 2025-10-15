# 🏗️ CPC ESSEN CAPSTONE PROJECT - SYSTEM ARCHITECTURE

## 📊 **ENTITY RELATIONSHIP DIAGRAM (ERD)**

```mermaid
erDiagram
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
```

## 🔄 **SYSTEM ARCHITECTURE FLOWCHART**

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        A[User Interface] --> B[Authentication]
        B --> C[Dashboard]
        C --> D[Product Catalog]
        C --> E[Shopping Cart]
        C --> F[User Profile]
        C --> G[Active Orders]
        
        subgraph "Admin Panel"
            H[Admin Dashboard]
            I[Product Management]
            J[Order Management]
            K[Inventory Management]
            L[User Management]
        end
    end

    subgraph "Backend (Node.js/Express)"
        M[API Gateway] --> N[Authentication Middleware]
        N --> O[Rate Limiting]
        O --> P[Security Headers]
        P --> Q[Request Sanitization]
        
        subgraph "API Routes"
            R[Auth Routes]
            S[Product Routes]
            T[Cart Routes]
            U[Order Routes]
            V[Payment Routes]
            W[Notification Routes]
            X[Stock Routes]
        end
        
        subgraph "Controllers"
            Y[Auth Controller]
            Z[Product Controller]
            AA[Cart Controller]
            BB[Order Controller]
            CC[Payment Controller]
            DD[Notification Controller]
            EE[Stock Controller]
        end
        
        subgraph "Services"
            FF[Email Service]
            GG[Socket Service]
            HH[File Upload Service]
            II[Validation Service]
        end
    end

    subgraph "Database (MySQL)"
        JJ[(Users Table)]
        KK[(Products Table)]
        LL[(Orders Table)]
        MM[(Cart Items Table)]
        NN[(Stock Tables)]
        OO[(Notifications Table)]
    end

    subgraph "External Services"
        PP[GCash Payment Gateway]
        QQ[Email Provider]
        RR[File Storage]
    end

    subgraph "Real-time Communication"
        SS[Socket.io Server]
        TT[WebSocket Connections]
    end

    %% Frontend to Backend connections
    A --> M
    H --> M
    
    %% Backend internal connections
    Q --> R
    Q --> S
    Q --> T
    Q --> U
    Q --> V
    Q --> W
    Q --> X
    
    R --> Y
    S --> Z
    T --> AA
    U --> BB
    V --> CC
    W --> DD
    X --> EE
    
    %% Controller to Service connections
    Y --> FF
    BB --> GG
    Z --> HH
    Y --> II
    Z --> II
    BB --> II
    
    %% Controller to Database connections
    Y --> JJ
    Z --> KK
    BB --> LL
    AA --> MM
    EE --> NN
    DD --> OO
    
    %% External service connections
    CC --> PP
    FF --> QQ
    HH --> RR
    
    %% Real-time connections
    GG --> SS
    SS --> TT
    TT --> A
    TT --> H
```

## 🛒 **E-COMMERCE USER FLOW**

```mermaid
flowchart TD
    A[User Visits Site] --> B{Authenticated?}
    B -->|No| C[Login/Register]
    B -->|Yes| D[Browse Products]
    
    C --> E{Valid Credentials?}
    E -->|No| F[Show Error]
    E -->|Yes| G[Generate JWT Token]
    F --> C
    G --> D
    
    D --> H[View Product Details]
    H --> I{Add to Cart?}
    I -->|Yes| J[Add Item to Cart]
    I -->|No| D
    
    J --> K[Cart Updated]
    K --> L{Continue Shopping?}
    L -->|Yes| D
    L -->|No| M[Proceed to Checkout]
    
    M --> N[Review Order]
    N --> O[Select Payment Method]
    O --> P{Payment Type?}
    
    P -->|Cash| Q[Create Order - Cash]
    P -->|GCash| R[Create Order - GCash]
    
    Q --> S[Order Created]
    R --> S
    
    S --> T[Update Stock]
    T --> U[Send Notifications]
    U --> V[Order Confirmation]
    
    V --> W[Order Processing]
    W --> X[Ready for Pickup]
    X --> Y[Customer Claims Order]
    Y --> Z[Order Completed]
    
    %% Admin Flow
    W --> AA[Admin Updates Status]
    AA --> BB[Real-time Notification]
    BB --> CC[Customer Sees Update]
```

## 📦 **ORDER MANAGEMENT FLOW**

```mermaid
flowchart TD
    A[Order Placed] --> B[Order Status: Pending]
    B --> C[Admin Reviews Order]
    C --> D[Order Status: Processing]
    
    D --> E[Prepare Items]
    E --> F[Order Status: Ready for Pickup]
    F --> G[Notify Customer]
    
    G --> H{Customer Action}
    H -->|Claims Order| I[Order Status: Claimed]
    H -->|Cancels Order| J[Order Status: Cancelled]
    
    I --> K{Customer Confirms Receipt?}
    K -->|Yes| L[Order Status: Completed]
    K -->|No| M[Auto-confirm after 3 days]
    
    M --> L
    
    J --> N[Refund Process]
    L --> O[Order Archive]
    
    %% Payment Flow
    P[Payment Processing] --> Q{Payment Success?}
    Q -->|Yes| R[Payment Status: Paid]
    Q -->|No| S[Payment Status: Failed]
    
    R --> T[Order Confirmed]
    S --> U[Order Cancelled]
```

## 🏪 **INVENTORY MANAGEMENT FLOW**

```mermaid
flowchart TD
    A[Product Creation] --> B[Initial Stock Entry]
    B --> C[Stock Transaction: IN]
    C --> D[Update Stock Balance]
    
    E[Customer Order] --> F[Stock Check]
    F --> G{Sufficient Stock?}
    G -->|Yes| H[Reserve Stock]
    G -->|No| I[Low Stock Alert]
    
    H --> J[Order Processing]
    J --> K[Stock Transaction: OUT]
    K --> L[Update Stock Balance]
    
    M[Stock Adjustment] --> N[Stock Transaction: ADJUSTMENT]
    N --> O[Update Stock Balance]
    
    P[Restock] --> Q[Stock Transaction: IN]
    Q --> R[Update Stock Balance]
    R --> S[Update Product Stock]
    
    I --> T[Admin Notification]
    T --> U[Reorder Decision]
    U --> V[Place Restock Order]
    V --> P
    
    %% Monitoring
    W[Stock Monitoring] --> X{Stock Level Check}
    X -->|Low| Y[Generate Alert]
    X -->|Normal| Z[Continue Monitoring]
    Y --> T
```

## 🔐 **AUTHENTICATION & AUTHORIZATION FLOW**

```mermaid
flowchart TD
    A[User Login Request] --> B[Validate Credentials]
    B --> C{Valid?}
    C -->|No| D[Return Error]
    C -->|Yes| E[Generate JWT Token]
    
    E --> F[Store Token in Client]
    F --> G[Token Validation Middleware]
    
    G --> H{Token Valid?}
    H -->|No| I[Return 401 Unauthorized]
    H -->|Yes| J[Extract User Info]
    
    J --> K{Role Check}
    K -->|Admin| L[Admin Access]
    K -->|Student| M[Student Access]
    K -->|Staff| N[Staff Access]
    
    L --> O[Full System Access]
    M --> P[Limited Access]
    N --> Q[Staff Access]
    
    %% Token Refresh
    R[Token Expiry Check] --> S{Token Expired?}
    S -->|Yes| T[Request Refresh]
    S -->|No| U[Continue Session]
    T --> V{Refresh Valid?}
    V -->|Yes| W[New Token]
    V -->|No| X[Force Re-login]
```

## 📊 **REAL-TIME NOTIFICATION SYSTEM**

```mermaid
flowchart TD
    A[System Event] --> B[Event Detection]
    B --> C[Socket.io Emission]
    
    C --> D[User Room Join]
    C --> E[Admin Room Join]
    
    D --> F[User Notification]
    E --> G[Admin Notification]
    
    F --> H[Update User UI]
    G --> I[Update Admin UI]
    
    %% Notification Types
    J[Order Status Change] --> K[Order Update Notification]
    L[New Order] --> M[New Order Notification]
    N[Low Stock] --> O[Stock Alert Notification]
    P[Payment Update] --> Q[Payment Notification]
    
    K --> C
    M --> C
    O --> C
    Q --> C
    
    %% Email Notifications
    R[Email Service] --> S[Send Email Receipt]
    S --> T[Order Confirmation Email]
    
    U[Auto-confirm System] --> V[Cron Job Trigger]
    V --> W[Check Claimed Orders]
    W --> X{Age > 3 days?}
    X -->|Yes| Y[Auto-confirm Order]
    X -->|No| Z[Wait]
    Y --> AA[Send Receipt Email]
    AA --> BB[Update Order Status]
```

## 🛡️ **SECURITY & MONITORING FLOW**

```mermaid
flowchart TD
    A[Incoming Request] --> B[Rate Limiting Check]
    B --> C{Within Limits?}
    C -->|No| D[429 Too Many Requests]
    C -->|Yes| E[Security Headers]
    
    E --> F[Request Sanitization]
    F --> G[XSS Protection]
    G --> H[CSRF Token Check]
    H --> I{Valid Token?}
    I -->|No| J[403 Forbidden]
    I -->|Yes| K[Authentication Check]
    
    K --> L{Authenticated?}
    L -->|No| M[401 Unauthorized]
    L -->|Yes| N[Authorization Check]
    
    N --> O{Authorized?}
    O -->|No| P[403 Forbidden]
    O -->|Yes| Q[Process Request]
    
    Q --> R[Log Request]
    R --> S[Performance Monitoring]
    S --> T[Error Tracking]
    T --> U[Response]
    
    %% Monitoring
    V[System Health Check] --> W[Memory Usage]
    V --> X[Database Performance]
    V --> Y[API Response Times]
    V --> Z[Error Rates]
    
    W --> AA[Health Dashboard]
    X --> AA
    Y --> AA
    Z --> AA
```

## 📱 **MOBILE & RESPONSIVE DESIGN FLOW**

```mermaid
flowchart TD
    A[User Access] --> B{Device Type?}
    B -->|Desktop| C[Full Desktop Layout]
    B -->|Tablet| D[Tablet Layout]
    B -->|Mobile| E[Mobile Layout]
    
    C --> F[Full Navigation Menu]
    D --> G[Collapsible Menu]
    E --> H[Hamburger Menu]
    
    F --> I[Product Grid - 4 columns]
    G --> J[Product Grid - 2 columns]
    H --> K[Product Grid - 1 column]
    
    I --> L[Desktop Checkout Flow]
    J --> M[Tablet Checkout Flow]
    K --> N[Mobile Checkout Flow]
    
    L --> O[Multi-step Form]
    M --> P[Simplified Form]
    N --> Q[Single Page Form]
    
    %% Touch Interactions
    R[Touch Events] --> S[Swipe Gestures]
    S --> T[Product Carousel]
    T --> U[Image Zoom]
    
    %% Performance
    V[Image Optimization] --> W[WebP Format]
    W --> X[Lazy Loading]
    X --> Y[Responsive Images]
```

## 🔧 **SYSTEM INTEGRATION ARCHITECTURE**

```mermaid
graph TB
    subgraph "Client Layer"
        A[Next.js Frontend]
        B[React Components]
        C[State Management]
        D[Socket.io Client]
    end
    
    subgraph "API Gateway"
        E[Express.js Server]
        F[Middleware Stack]
        G[Route Handlers]
        H[Error Handling]
    end
    
    subgraph "Business Logic"
        I[Controllers]
        J[Services]
        K[Validation]
        L[Authentication]
    end
    
    subgraph "Data Layer"
        M[MySQL Database]
        N[Connection Pool]
        O[Query Builder]
        P[Transactions]
    end
    
    subgraph "External Services"
        Q[GCash API]
        R[Email Service]
        S[File Storage]
        T[Socket.io Server]
    end
    
    subgraph "Monitoring & Security"
        U[Rate Limiting]
        V[Security Headers]
        W[Error Tracking]
        X[Performance Monitoring]
    end
    
    %% Connections
    A --> E
    B --> C
    C --> D
    D --> T
    
    E --> F
    F --> G
    G --> H
    
    G --> I
    I --> J
    J --> K
    K --> L
    
    J --> M
    M --> N
    N --> O
    O --> P
    
    J --> Q
    J --> R
    J --> S
    T --> D
    
    F --> U
    F --> V
    H --> W
    E --> X
```

---

## 📋 **SYSTEM COMPONENTS SUMMARY**

### **Frontend Components:**
- **User Interface**: Dashboard, Product Catalog, Cart, Profile, Orders
- **Admin Panel**: Product Management, Order Management, Inventory, Users
- **Authentication**: Login, Register, Password Reset
- **Real-time Updates**: Socket.io integration for live notifications

### **Backend Components:**
- **API Routes**: Auth, Products, Cart, Orders, Payments, Notifications, Stock
- **Controllers**: Business logic for each module
- **Middleware**: Authentication, Authorization, Security, Validation
- **Services**: Email, Socket, File Upload, Validation

### **Database Schema:**
- **Core Tables**: Users, Products, Orders, Cart Items
- **Stock Management**: Stock Transactions, Stock Balance, Stock Items
- **Audit Trail**: Order Status Logs, Payment Transactions
- **Notifications**: User notifications system

### **External Integrations:**
- **Payment Gateway**: GCash integration
- **Email Service**: Order confirmations and receipts
- **Real-time Communication**: Socket.io for live updates
- **File Storage**: Product image uploads

### **Security Features:**
- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Comprehensive data validation
- **Security Headers**: XSS, CSRF protection

This comprehensive system architecture provides a robust, scalable, and secure e-commerce platform for the CPC Essen Capstone project! 🚀
