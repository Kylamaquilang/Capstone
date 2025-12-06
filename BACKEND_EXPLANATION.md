# 🔧 Backend Code Explanation

## Overview

The backend is built with **Express.js** (Node.js framework) and uses **MySQL** as the database. It follows a **MVC (Model-View-Controller)** architecture pattern with clear separation of concerns.

---

## 📁 Project Structure

```
api/
├── server.js                 # Main entry point
├── package.json             # Dependencies and scripts
├── src/
│   ├── controllers/         # Business logic (handles requests)
│   ├── routes/              # API route definitions
│   ├── middleware/          # Authentication & security
│   ├── database/            # Database connection
│   ├── utils/               # Helper functions
│   ├── schema/              # SQL database schemas
│   └── scripts/             # Utility scripts
└── uploads/                 # File uploads storage
```

---

## 🚀 Main Entry Point: `server.js`

### Purpose
This is the heart of the backend application. It sets up the Express server, configures middleware, registers routes, and initializes Socket.io for real-time communication.

### Key Components

#### 1. **Server Setup**
```javascript
const app = express();
const server = createServer(app);
```
- Creates an Express application
- Creates an HTTP server (needed for Socket.io)

#### 2. **CORS Configuration**
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL  // Railway production URL
];
```
- **CORS (Cross-Origin Resource Sharing)**: Allows the frontend to make requests from different origins
- Supports both local development and production (Railway)

#### 3. **Socket.io Setup**
```javascript
const io = new Server(server, {
  cors: { origin: allowedOrigins },
  transports: ['websocket', 'polling']
});
```
- **Socket.io**: Enables real-time bidirectional communication
- Used for:
  - Real-time notifications
  - Live order updates
  - Cart synchronization
  - Admin notifications

#### 4. **Middleware Stack**

**Security Middleware:**
- `helmet`: Sets security HTTP headers
- `cors`: Handles cross-origin requests
- `rateLimit`: Prevents abuse (different limits for auth, uploads, general API)
- `sanitizeRequest`: Cleans user input to prevent injection attacks
- `requestSizeLimit`: Limits request body size (10MB)

**Utility Middleware:**
- `compression`: Compresses responses (faster transfers)
- `morgan`: Logs HTTP requests (development only)
- `express.json()`: Parses JSON request bodies
- `express.urlencoded()`: Parses URL-encoded bodies

#### 5. **Route Registration**
```javascript
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
// ... etc
```
- All API routes are prefixed with `/api`
- Each feature has its own route file

#### 6. **Socket.io Authentication**
```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  // Verify JWT token
  jwt.verify(token, JWT_SECRET);
  socket.user = payload;
  next();
});
```
- Authenticates Socket.io connections using JWT tokens
- Attaches user info to socket for authorization

#### 7. **Scheduled Tasks**
```javascript
cron.schedule('0 2 * * *', async () => {
  await autoConfirmClaimedOrders(ioInstance);
}, { timezone: "Asia/Manila" });
```
- Uses `node-cron` for scheduled tasks
- Auto-confirms claimed orders daily at 2:00 AM

---

## 🗄️ Database Layer: `src/database/db.js`

### Purpose
Manages MySQL database connections using connection pooling.

### Key Features

#### 1. **Connection Pool**
```javascript
const pool = mysql.createPool(dbConfig);
```
- **Connection Pooling**: Reuses database connections (more efficient)
- Prevents connection exhaustion
- Handles connection failures gracefully

#### 2. **Environment Variable Support**
```javascript
host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost'
```
- Supports both Railway's standard vars (`MYSQLHOST`) and custom vars (`DB_HOST`)
- Falls back to localhost for development

#### 3. **Connection Management**
- `testConnection()`: Tests if database is reachable
- `initializeDatabase()`: Initializes connection on startup
- `closeDatabase()`: Gracefully closes all connections
- Error handling for connection failures

---

## 🛣️ Routes: `src/routes/`

### Purpose
Define API endpoints and connect them to controllers.

### Example: `auth.routes.js`
```javascript
router.post('/signin', signin);
router.post('/logout', logout);
router.put('/profile', verifyToken, updateProfile);
```

### Route Structure
- **Public Routes**: No authentication required (login, health check)
- **Protected Routes**: Require `verifyToken` middleware
- **Admin Routes**: Require both `verifyToken` and `isAdmin` middleware

### Available Route Files
- `auth.routes.js` - Authentication (login, logout, password reset)
- `product.routes.js` - Product management
- `cart.routes.js` - Shopping cart operations
- `order.routes.js` - Order processing
- `checkout.routes.js` - Checkout flow
- `category.routes.js` - Product categories
- `stock.routes.js` - Inventory management
- `notification.routes.js` - User notifications
- `payment.routes.js` - Payment processing
- `profile.routes.js` - User profile management
- `student.routes.js` - Student management
- `user-management.routes.js` - User administration

---

## 🎮 Controllers: `src/controllers/`

### Purpose
Contains business logic for handling requests. Each controller handles a specific domain.

### Example: `auth.controller.js`

#### **Sign In Function**
```javascript
export const signin = async (req, res) => {
  // 1. Validate input
  // 2. Find user in database
  // 3. Verify password
  // 4. Generate JWT token
  // 5. Return token and user data
}
```

**Process:**
1. Validates email/student_id and password
2. Queries database for user
3. Compares password hash using `bcrypt`
4. Generates JWT token with user info
5. Returns token and user data to frontend

#### **Password Reset Flow**
1. `requestPasswordReset`: Generates reset code, stores in DB, sends email
2. `verifyPasswordResetCode`: Validates the code
3. `resetPasswordWithToken`: Updates password with verified code

### Controller Pattern
```javascript
export const functionName = async (req, res) => {
  try {
    // 1. Validate input
    // 2. Query database
    // 3. Process business logic
    // 4. Return response
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 🔐 Middleware: `src/middleware/`

### 1. **Authentication Middleware** (`auth.middleware.js`)

#### `verifyToken`
```javascript
export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = decoded;  // Attach user info to request
  next();
}
```
- Extracts JWT token from `Authorization` header
- Verifies token signature
- Attaches user info to `req.user`
- Allows request to continue or returns 401

#### `isAdmin`
```javascript
export const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only.' });
  }
  next();
}
```
- Checks if user has admin role
- Returns 403 if not admin

### 2. **Security Middleware** (`security.middleware.js`)

- **Rate Limiting**: Prevents brute force attacks
  - Auth endpoints: 5 requests per 15 minutes
  - Upload endpoints: 10 requests per minute
  - General API: 100 requests per 15 minutes

- **Request Sanitization**: Cleans user input
- **Size Limits**: Prevents large file uploads
- **Security Headers**: Sets HTTP security headers

---

## 🛠️ Utilities: `src/utils/`

### 1. **Email Service** (`emailService.js`)
- Sends password reset emails
- Sends verification codes
- Uses Nodemailer with SMTP

### 2. **Cloudinary Service** (`cloudinaryService.js`)
- Handles image uploads to Cloudinary
- Generates optimized image URLs
- Manages file storage

### 3. **Validation** (`validation.js`)
- Email format validation
- Student ID format validation
- Password strength validation

### 4. **Error Handler** (`errorHandler.js`)
- Centralized error handling
- Formats error responses
- Logs errors for debugging

### 5. **Socket Helper** (`socket-helper.js`)
- Helper functions for Socket.io operations
- Notification broadcasting
- Room management

---

## 🔄 Request Flow Example

### Example: User Login

```
1. Frontend → POST /api/auth/signin
   { email: "user@example.com", password: "password123" }

2. Express receives request
   ↓
3. CORS middleware checks origin
   ↓
4. Rate limiting checks (auth rate limit)
   ↓
5. Body parser extracts JSON
   ↓
6. Route handler: auth.routes.js
   ↓
7. Controller: auth.controller.js → signin()
   ↓
8. Database query: Find user by email
   ↓
9. Password verification: bcrypt.compare()
   ↓
10. JWT generation: jwt.sign()
    ↓
11. Response: { token: "...", user: {...} }
    ↓
12. Frontend receives response
```

---

## 🔌 Socket.io Real-Time Features

### Connection Flow
1. Client connects with JWT token
2. Server verifies token
3. Client joins user-specific room: `user-{userId}`
4. Admin joins: `admin-room`

### Events

#### **User Events**
- `join-user-room`: User joins their notification room
- `cart-updated`: Cart changes broadcasted
- `order-status-updated`: Order status changes
- `new-notification`: New notification received

#### **Admin Events**
- `join-admin-room`: Admin joins admin room
- `admin-order-updated`: New order notifications
- `admin-notification`: Admin-specific notifications

---

## 📊 Database Schema

### Key Tables

1. **users**: User accounts (students, admins)
2. **products**: Product catalog
3. **product_sizes**: Product size variations
4. **categories**: Product categories
5. **cart_items**: Shopping cart items
6. **orders**: Order records
7. **order_items**: Items in each order
8. **order_status_logs**: Order status history
9. **payment_transactions**: Payment records
10. **stock_movements**: Inventory changes
11. **notifications**: User notifications
12. **password_reset_codes**: Password reset tokens

### Relationships
- Users → Orders (one-to-many)
- Products → Order Items (one-to-many)
- Orders → Order Items (one-to-many)
- Products → Stock Movements (one-to-many)

---

## 🔒 Security Features

1. **JWT Authentication**: Secure token-based auth
2. **Password Hashing**: bcrypt with 12 salt rounds
3. **Rate Limiting**: Prevents abuse
4. **Input Sanitization**: Prevents injection attacks
5. **CORS**: Controlled cross-origin access
6. **Helmet**: Security headers
7. **Request Size Limits**: Prevents DoS
8. **SQL Injection Prevention**: Parameterized queries

---

## 📝 Environment Variables

```env
# Server
PORT=3000
NODE_ENV=production

# Database
MYSQLHOST=localhost
MYSQLUSER=root
MYSQLPASSWORD=password
MYSQLDATABASE=capstone
MYSQLPORT=3306

# Security
JWT_SECRET=your_secret_key

# Frontend
FRONTEND_URL=https://your-frontend.up.railway.app

# Optional
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

## 🚦 API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": { ... }
}
```

### Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (no/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate entry)
- `500`: Internal Server Error

---

## 🔄 Scheduled Tasks

### Auto-Confirm Orders
- Runs daily at 2:00 AM (Asia/Manila timezone)
- Automatically confirms orders that were claimed but not confirmed
- Sends notifications to users

---

## 📦 Dependencies

### Core
- `express`: Web framework
- `mysql2`: MySQL driver
- `jsonwebtoken`: JWT authentication
- `bcryptjs`: Password hashing

### Real-time
- `socket.io`: WebSocket communication

### Utilities
- `dotenv`: Environment variables
- `cors`: CORS handling
- `helmet`: Security headers
- `express-rate-limit`: Rate limiting
- `compression`: Response compression
- `morgan`: HTTP logging
- `multer`: File uploads
- `nodemailer`: Email sending
- `node-cron`: Scheduled tasks

---

## 🎯 Key Design Patterns

1. **MVC Architecture**: Separation of routes, controllers, and models
2. **Middleware Pattern**: Reusable request processing functions
3. **Connection Pooling**: Efficient database connection management
4. **Error Handling**: Centralized error management
5. **Environment Configuration**: Environment-based settings
6. **JWT Authentication**: Stateless authentication
7. **RESTful API**: Standard HTTP methods and status codes

---

This backend provides a robust, secure, and scalable API for the e-commerce system with real-time capabilities, comprehensive security, and efficient database management.



