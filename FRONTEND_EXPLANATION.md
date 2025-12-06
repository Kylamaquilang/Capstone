# 🎨 Frontend Code Explanation

## Overview

The frontend is built with **Next.js 15** (React framework) using the **App Router** architecture. It's a modern, server-side rendered application with client-side interactivity, real-time updates via Socket.io, and a comprehensive state management system.

---

## 📁 Project Structure

```
client/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── layout.js        # Root layout
│   │   ├── page.js          # Home page
│   │   ├── auth/            # Authentication pages
│   │   ├── admin/           # Admin dashboard pages
│   │   ├── dashboard/       # User dashboard
│   │   └── ...
│   ├── components/          # Reusable React components
│   │   ├── admin/           # Admin-specific components
│   │   ├── common/          # Shared components
│   │   ├── notifications/   # Notification components
│   │   └── ...
│   ├── context/             # React Context providers
│   │   ├── auth-context.js  # Authentication state
│   │   ├── CartContext.js   # Shopping cart state
│   │   ├── SocketContext.js # Socket.io connection
│   │   └── NotificationContext.js
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Library configurations
│   │   ├── axios.js         # API client setup
│   │   └── sweetalert-config.js
│   ├── utils/               # Utility functions
│   └── styles/              # Global styles
├── public/                  # Static assets
└── package.json
```

---

## 🚀 Next.js App Router Architecture

### What is App Router?
Next.js 15 uses the **App Router** (not Pages Router), which provides:
- **Server Components** by default (faster, SEO-friendly)
- **Client Components** when needed (`'use client'` directive)
- **File-based routing** (folders = routes)
- **Layouts** for shared UI
- **Loading states** and **error boundaries**

### Key Files

#### `src/app/layout.js` - Root Layout
```javascript
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ServerStatusBanner />
        <SocketProvider>
          <AuthProvider>
            <CartProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </CartProvider>
          </AuthProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
```

**Purpose:**
- Wraps all pages with global providers
- Sets up authentication, cart, notifications, and Socket.io
- Provides shared layout structure
- Loads global CSS and fonts (Poppins)

**Provider Hierarchy:**
1. `SocketProvider` - Real-time connections (outermost)
2. `AuthProvider` - User authentication
3. `CartProvider` - Shopping cart state
4. `NotificationProvider` - Notifications (innermost)

---

## 🔌 API Client: `src/lib/axios.js`

### Purpose
Configures Axios (HTTP client) for all API requests with automatic authentication and error handling.

### Key Features

#### 1. **Base URL Configuration**
```javascript
let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
API_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});
```
- Uses environment variable for production
- Falls back to localhost for development
- Automatically adds `/api` prefix

#### 2. **Request Interceptor**
```javascript
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```
- **Automatic Token Injection**: Adds JWT token to every request
- Retrieves token from `localStorage`
- No need to manually add token in components

#### 3. **Response Interceptor**
```javascript
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Auto-logout on unauthorized
      localStorage.removeItem('token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);
```
- **Automatic Error Handling**: Handles 401 (unauthorized) errors
- Auto-redirects to login on token expiration
- Skips auto-logout for login page (expected errors)

---

## 🔐 Authentication: `src/context/auth-context.js`

### Purpose
Manages user authentication state across the entire application using React Context.

### Key Features

#### 1. **State Management**
```javascript
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
```
- `user`: Current user object (null if not logged in)
- `loading`: Initial auth check status

#### 2. **Token Validation on Load**
```javascript
useEffect(() => {
  const token = localStorage.getItem('token');
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp > currentTime) {
      setUser(payload);
    }
  }
  setLoading(false);
}, []);
```
- Checks for existing token on app load
- Decodes JWT to extract user info
- Validates token expiration
- Sets user if token is valid

#### 3. **Login Function**
```javascript
const login = (userData, token) => {
  setUser(userData);
  localStorage.setItem('token', token);
  // Trigger socket reconnection
  window.dispatchEvent(new CustomEvent('socket-reconnect'));
};
```
- Stores user data and token
- Triggers Socket.io reconnection

#### 4. **Logout Function**
```javascript
const logout = () => {
  setUser(null);
  localStorage.removeItem('token');
  router.push('/auth/login');
};
```
- Clears user state and token
- Redirects to login page

#### 5. **Context Value**
```javascript
{
  user,              // User object
  login,             // Login function
  logout,            // Logout function
  loading,           // Loading state
  isAuthenticated: !!user,  // Boolean check
  isStudent: user?.role === 'student',
  isAdmin: user?.role === 'admin'
}
```

### Usage in Components
```javascript
import { useAuth } from '@/context/auth-context';

function MyComponent() {
  const { user, isAdmin, logout } = useAuth();
  
  if (!user) return <div>Please login</div>;
  
  return <div>Welcome, {user.name}!</div>;
}
```

---

## 🛒 Shopping Cart: `src/context/CartContext.js`

### Purpose
Manages shopping cart state with persistence and synchronization.

### Features
- **Cart Items**: Array of products with quantities
- **Add to Cart**: Adds/updates items
- **Remove from Cart**: Removes items
- **Update Quantity**: Changes item quantities
- **Clear Cart**: Empties cart
- **Persistence**: Saves to localStorage
- **Real-time Sync**: Updates via Socket.io

### Usage
```javascript
const { cartItems, addToCart, removeFromCart, clearCart } = useCart();
```

---

## 🔔 Notifications: `src/context/NotificationContext.js`

### Purpose
Manages user notifications with real-time updates.

### Features
- **Notification List**: Array of notifications
- **Unread Count**: Count of unread notifications
- **Mark as Read**: Marks notifications as read
- **Real-time Updates**: Receives new notifications via Socket.io
- **Persistence**: Saves to database

---

## 🔌 Real-Time: `src/context/SocketContext.js`

### Purpose
Manages Socket.io connection for real-time features.

### Key Features

#### 1. **Connection Setup**
```javascript
const socketInstance = io(socketUrl, {
  auth: { token: `Bearer ${token}` },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5
});
```
- Connects with JWT token for authentication
- Supports both WebSocket and polling fallback
- Auto-reconnects on disconnect

#### 2. **Room Management**
```javascript
socket.emit('join-user-room', userId);
socket.emit('join-admin-room');
```
- Users join personal rooms: `user-{userId}`
- Admins join: `admin-room`
- Enables targeted notifications

#### 3. **Event Listeners**
- `connect`: Connection established
- `disconnect`: Connection lost
- `connect_error`: Connection failed
- `new-notification`: New notification received
- `order-status-updated`: Order status changed
- `cart-updated`: Cart synchronized

#### 4. **Reconnection Logic**
- Automatically reconnects on token refresh
- Clears invalid tokens
- Redirects to login on auth errors

---

## 📄 Pages: `src/app/`

### Routing Structure

Next.js App Router uses **folder-based routing**:

```
app/
├── page.js                    → / (home)
├── auth/
│   ├── login/page.js          → /auth/login
│   └── reset-password/page.js → /auth/reset-password
├── dashboard/page.js           → /dashboard
├── admin/
│   ├── products/page.js        → /admin/products
│   ├── orders/page.js          → /admin/orders
│   └── ...
└── products/
    └── [name]/page.js          → /products/:name (dynamic)
```

### Page Types

#### 1. **Server Components** (Default)
- Rendered on server
- No `'use client'` directive
- Can't use hooks or browser APIs
- Faster, SEO-friendly

#### 2. **Client Components**
- Must have `'use client'` at top
- Can use hooks, state, effects
- Interactive components

### Example: Login Page
```javascript
'use client';  // Client component

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import API from '@/lib/axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data } = await API.post('/auth/signin', { email, password });
    login(data.user, data.token);
    router.push('/dashboard');
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

---

## 🧩 Components: `src/components/`

### Component Organization

#### **Common Components** (`components/common/`)
- `nav-bar.js`: Navigation bar
- `footer.js`: Footer
- `LoadingSpinner.js`: Loading indicator
- `Modal.js`: Reusable modal
- `ProtectedRoute.js`: Route protection
- `ServerStatusBanner.js`: Server connection status

#### **Admin Components** (`components/admin/`)
- `AddCategoryModal.js`: Add product category
- `DeductModal.js`: Stock deduction
- `RestockModal.js`: Stock restocking
- `AdjustModal.js`: Stock adjustment

#### **Product Components** (`components/product/`)
- `EditProductModal.js`: Edit product
- `ImageUpload.js`: Image upload widget

### Component Pattern
```javascript
'use client';

import { useState, useEffect } from 'react';
import API from '@/lib/axios';

export default function MyComponent({ prop1, prop2 }) {
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // Fetch data
    const fetchData = async () => {
      const { data } = await API.get('/endpoint');
      setState(data);
    };
    fetchData();
  }, []);
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

---

## 🎣 Custom Hooks: `src/hooks/`

### Purpose
Reusable logic extracted into hooks.

### Available Hooks

#### 1. **`useLogin.js`**
- Handles login form logic
- Manages form state
- Handles errors
- Redirects on success

#### 2. **`useFormValidation.js`**
- Form validation logic
- Error messages
- Field validation rules

#### 3. **`useLoading.js`**
- Loading state management
- Loading indicators

#### 4. **`useAutoRefresh.js`**
- Auto-refresh data at intervals
- Useful for dashboards

### Hook Pattern
```javascript
import { useState, useEffect } from 'react';

export default function useCustomHook() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Hook logic
  }, []);
  
  return { data, /* other values */ };
}
```

---

## 🛡️ Route Protection: `components/common/ProtectedRoute.js`

### Purpose
Protects routes that require authentication.

### Implementation
```javascript
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (!loading && requireAdmin && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, loading, requireAdmin, isAdmin]);
  
  if (loading) return <LoadingSpinner />;
  if (!user) return null;
  if (requireAdmin && !isAdmin) return null;
  
  return children;
}
```

### Usage
```javascript
<ProtectedRoute requireAdmin={true}>
  <AdminDashboard />
</ProtectedRoute>
```

---

## 🎨 Styling

### Tailwind CSS
- Utility-first CSS framework
- Classes like `bg-blue-500`, `text-center`, `flex`
- Responsive: `md:`, `lg:`, `xl:` prefixes

### Global Styles
- `src/app/globals.css`: Global CSS
- `src/styles/sweetalert-custom.css`: SweetAlert2 customization

### Fonts
- **Poppins**: Google Font loaded in layout
- Applied to entire app via `className={poppins.className}`

---

## 🔄 Data Flow

### Example: Fetching Products

```
1. Component mounts
   ↓
2. useEffect triggers
   ↓
3. API.get('/products') called
   ↓
4. Axios interceptor adds token
   ↓
5. Request sent to backend
   ↓
6. Backend processes request
   ↓
7. Response received
   ↓
8. Component state updated
   ↓
9. UI re-renders with data
```

### Example: Real-Time Notification

```
1. Backend emits 'new-notification'
   ↓
2. Socket.io receives event
   ↓
3. NotificationContext updates state
   ↓
4. Components using notifications re-render
   ↓
5. Notification bell shows badge
   ↓
6. Notification dropdown updates
```

---

## 🎯 Key Features

### 1. **Server-Side Rendering (SSR)**
- Pages rendered on server
- Better SEO
- Faster initial load

### 2. **Client-Side Interactivity**
- React hooks for state
- Real-time updates
- Smooth user experience

### 3. **State Management**
- React Context for global state
- Local state for component-specific data
- localStorage for persistence

### 4. **Real-Time Updates**
- Socket.io for live updates
- Notifications
- Order status changes
- Cart synchronization

### 5. **Authentication Flow**
- JWT tokens stored in localStorage
- Automatic token injection
- Auto-logout on expiration
- Protected routes

### 6. **Error Handling**
- Axios interceptors for API errors
- Error boundaries for React errors
- User-friendly error messages

---

## 📦 Dependencies

### Core
- `next`: Next.js framework
- `react`: React library
- `react-dom`: React DOM

### UI
- `@heroicons/react`: Icon library
- `tailwindcss`: CSS framework
- `sweetalert2`: Alert dialogs

### HTTP & Real-Time
- `axios`: HTTP client
- `socket.io-client`: WebSocket client

### Utilities
- `chart.js`: Charts (reports)
- `jspdf`: PDF generation
- `docx`: Word document generation

---

## 🎨 UI/UX Features

### 1. **Responsive Design**
- Mobile-first approach
- Tailwind responsive classes
- Works on all screen sizes

### 2. **Loading States**
- Spinners during data fetching
- Skeleton loaders
- Optimistic UI updates

### 3. **Error Handling**
- User-friendly error messages
- Retry mechanisms
- Fallback UI

### 4. **Notifications**
- Toast notifications
- In-app notification system
- Real-time updates

### 5. **Form Validation**
- Client-side validation
- Error messages
- Success feedback

---

## 🔒 Security Features

### 1. **Token Management**
- Secure token storage (localStorage)
- Automatic token refresh
- Token expiration handling

### 2. **Route Protection**
- Protected routes require auth
- Admin-only routes
- Automatic redirects

### 3. **Input Validation**
- Client-side validation
- Server-side validation (backend)
- XSS prevention

### 4. **CORS**
- Configured on backend
- Only allowed origins can access

---

## 🚀 Performance Optimizations

### 1. **Server Components**
- Reduced JavaScript bundle
- Faster initial load
- Better SEO

### 2. **Code Splitting**
- Automatic route-based splitting
- Lazy loading
- Smaller bundles

### 3. **Image Optimization**
- Next.js Image component
- Automatic optimization
- Lazy loading

### 4. **Caching**
- API response caching
- Static asset caching
- Browser caching

---

## 📱 Pages Overview

### Public Pages
- `/` - Home/Landing page
- `/auth/login` - Login
- `/auth/reset-password` - Password reset
- `/products/[name]` - Product details

### User Pages (Protected)
- `/dashboard` - User dashboard
- `/cart` - Shopping cart
- `/checkout` - Checkout
- `/active-orders` - User orders
- `/notifications` - Notifications
- `/user-profile` - Profile

### Admin Pages (Protected + Admin)
- `/admin/products` - Product management
- `/admin/orders` - Order management
- `/admin/inventory` - Inventory management
- `/admin/users` - User management
- `/admin/reports` - Reports
- `/admin/sales` - Sales dashboard

---

This frontend provides a modern, responsive, and user-friendly interface with real-time capabilities, comprehensive state management, and excellent user experience.



