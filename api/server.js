import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import productRoutes from './src/routes/product.routes.js';
import cartRoutes from './src/routes/cart.routes.js';
import checkoutRoutes from './src/routes/checkout.routes.js';
import orderRoutes from './src/routes/order.routes.js';
import categoryRoutes from './src/routes/category.routes.js';
import profileRoutes from './src/routes/profile.routes.js';
import studentRoutes from './src/routes/student.routes.js';
import userManagementRoutes from './src/routes/user-management.routes.js';
import paymentRoutes from './src/routes/payment.routes.js';
import notificationRoutes from './src/routes/notification.routes.js';
import stockMovementRoutes from './src/routes/stock-movement.routes.js';
import stockRoutes from './src/routes/stock.routes.js';

// Import error handling middleware
import { errorHandler, notFound } from './src/middleware/error.middleware.js';

dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Static uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration - Always allow localhost in development
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/users', userManagementRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stock-movements', stockMovementRoutes);
app.use('/api/stock', stockRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Socket.io authentication middleware
io.use((socket, next) => {
  // Get token from auth object, headers, or query
  const authToken = socket.handshake.auth?.token
                || socket.handshake.headers?.authorization
                || socket.handshake.query?.token;

  console.log('🔍 Socket auth - Token from handshake:', authToken ? 'Present' : 'Missing');
  console.log('🔍 Socket auth - Handshake auth:', socket.handshake.auth);
  console.log('🔍 Socket auth - Handshake headers:', socket.handshake.headers);

  if (!authToken) {
    console.log('❌ Socket auth - No token provided');
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    // Extract token from Bearer format if present
    const token = authToken.startsWith('Bearer ') 
      ? authToken.split(' ')[1] 
      : authToken;

    // Verify JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
    console.log('🔍 JWT_SECRET in server socket:', JWT_SECRET ? 'Set' : 'Not set');
    const payload = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to socket
    socket.user = payload;
    console.log('✅ Socket auth - Token verified for user:', payload.id);
    return next();
  } catch (err) {
    console.log('❌ Socket auth - Invalid token:', err.message);
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  console.log(`🔌 Socket transport: ${socket.conn.transport.name}`);
  console.log(`👤 Authenticated user: ${socket.user?.id || 'Unknown'}`);

  // Join user to their personal room for notifications
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  // Join admin to admin room for admin notifications
  socket.on('join-admin-room', () => {
    socket.join('admin-room');
    console.log(`👨‍💼 Admin joined admin room`);
  });

  // Handle cart updates
  socket.on('cart-updated', (data) => {
    socket.to(`user-${data.userId}`).emit('cart-updated', data);
  });

  // Handle order status updates
  socket.on('order-status-updated', (data) => {
    socket.to(`user-${data.userId}`).emit('order-status-updated', data);
    socket.to('admin-room').emit('admin-order-updated', data);
  });

  // Handle new notifications
  socket.on('new-notification', (data) => {
    socket.to(`user-${data.userId}`).emit('new-notification', data);
    if (data.type === 'admin_order') {
      socket.to('admin-room').emit('admin-notification', data);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

// Make io available to other modules
// Socket.io error handling
io.engine.on('connection_error', (err) => {
  console.error('🔌 Socket.io connection error:', err);
});

app.set('io', io);

server.listen(PORT, () => {
  console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.io server ready for real-time connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});