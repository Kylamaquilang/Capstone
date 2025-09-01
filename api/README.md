# Capstone Backend API

A robust and secure REST API built with Node.js, Express, and MySQL for the Capstone project.

## Features

- 🔐 **Authentication & Authorization**: JWT-based auth with role-based access control
- 🛡️ **Security**: Helmet, CORS, rate limiting, input validation
- 📊 **Database**: MySQL with connection pooling and transaction support
- 🔄 **Error Handling**: Centralized error handling with proper HTTP status codes
- 📝 **Logging**: Morgan logging for development
- 🚀 **Performance**: Compression middleware and optimized queries
- ✅ **Validation**: Comprehensive input validation for all endpoints

## Prerequisites

- Node.js (v16 or higher)
- MySQL/MariaDB
- npm or yarn

## Installation

1. Clone the repository
2. Navigate to the API directory:
   ```bash
   cd api
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

5. Configure your environment variables in `.env`:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000

   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password_here
   DB_NAME=capstone
   DB_PORT=3306

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
   JWT_EXPIRES_IN=24h
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/refresh-token` - Refresh JWT token
- `PUT /api/auth/profile` - Update user profile

### Products
- `GET /api/products` - Get all products (with pagination & filtering)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)
- `GET /api/products/low-stock` - Get low stock products (Admin only)
- `GET /api/products/stats` - Get product statistics (Admin only)

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove cart item
- `DELETE /api/cart` - Clear entire cart

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (Admin only)
- `PUT /api/categories/:id` - Update category (Admin only)
- `DELETE /api/categories/:id` - Delete category (Admin only)

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id` - Update order status (Admin only)

### Dashboard (Admin)
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/users` - Get all users
- `GET /api/dashboard/orders` - Get all orders

## Database Schema

The API works with the following main tables:
- `users` - User accounts and authentication
- `products` - Product information
- `product_sizes` - Product size variants with individual stock
- `categories` - Product categories
- `cart_items` - Shopping cart items
- `orders` - Customer orders
- `order_items` - Individual items in orders

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin and student role separation
- **Input Validation**: Comprehensive validation for all inputs
- **SQL Injection Prevention**: Parameterized queries
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet**: Security headers for Express

## Error Handling

The API includes comprehensive error handling:
- HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500)
- Detailed error messages
- Database error handling
- Validation error handling
- Centralized error middleware

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running in Production Mode
```bash
npm start
```

### Health Check
The API includes a health check endpoint at `/health` for monitoring.

## Contributing

1. Follow the existing code style
2. Add proper error handling
3. Include input validation
4. Test your endpoints
5. Update documentation

## License

This project is licensed under the ISC License.










