import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
console.log('🔍 JWT_SECRET in auth middleware:', JWT_SECRET ? 'Set' : 'Not set');

// Public routes that don't require authentication
const publicRoutes = [
  '/health',
  '/api/health',
  '/favicon.ico',
  '/api/auth/login',
  '/api/auth/register'
];

// Middleware: Verify JWT token
export const verifyToken = (req, res, next) => {
  console.log('🔍 verifyToken middleware called for:', req.method, req.url);
  
  // Skip auth for public routes
  const isPublicRoute = publicRoutes.some(route => 
    req.url === route || 
    req.path === route || 
    req.originalUrl === route ||
    req.url.startsWith(route) ||
    req.path.startsWith(route) ||
    req.originalUrl.startsWith(route)
  );
  
  if (isPublicRoute) {
    console.log('🔍 Skipping auth for public route:', req.url);
    return next();
  }

  const authHeader = req.headers['authorization'];

  console.log('🔍 Auth middleware - URL:', req.url);
  console.log('🔍 Auth middleware - Auth header:', authHeader ? 'Present' : 'Missing');
  console.log('🔍 Auth middleware - Full headers:', JSON.stringify(req.headers, null, 2));

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No token provided - Auth header:', authHeader);
    return res.status(403).json({ message: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    console.log('🔍 Attempting to verify token:', token.substring(0, 20) + '...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verified for user:', decoded.id);
    console.log('🔍 Setting req.user to:', decoded);
    req.user = decoded;
    console.log('🔍 req.user after setting:', req.user);
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    console.error('❌ Token that failed:', token.substring(0, 20) + '...');
    console.error('❌ JWT_SECRET used:', JWT_SECRET ? 'Set' : 'Not set');
    return res.status(401).json({ message: 'Unauthorized access.' });
  }
};

// Middleware: Admin-only access
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only.' });
  }
  next();
};

// Optional: Role-based access (flexible version)
export const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ message: `Access restricted to ${role}s only.` });
  }
  next();
};
