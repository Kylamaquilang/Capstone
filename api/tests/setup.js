// tests/setup.js

/**
 * Test Setup Configuration
 * Provides common test utilities and configurations
 */

import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test_db';

// Global test utilities
global.testUtils = {
  // Mock user data
  mockUser: {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    student_id: 'TEST123',
    phone: '1234567890'
  },

  // Mock admin user
  mockAdmin: {
    id: 2,
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    student_id: 'ADMIN123',
    phone: '0987654321'
  },

  // Mock product data
  mockProduct: {
    id: 1,
    name: 'Test Product',
    description: 'Test Description',
    price: 100.00,
    original_price: 80.00,
    stock: 50,
    category_id: 1,
    image: '/uploads/test-image.jpg',
    sizes: [
      { id: 1, size: 'M', stock: 20, price: 100.00 },
      { id: 2, size: 'L', stock: 30, price: 100.00 }
    ]
  },

  // Mock order data
  mockOrder: {
    id: 1,
    user_id: 1,
    total_amount: 200.00,
    status: 'pending',
    payment_method: 'cash',
    items: [
      {
        product_id: 1,
        product_name: 'Test Product',
        quantity: 2,
        price: 100.00,
        size: 'M'
      }
    ]
  },

  // Mock cart data
  mockCartItem: {
    product_id: 1,
    product_name: 'Test Product',
    quantity: 2,
    price: 100.00,
    size: 'M',
    image: '/uploads/test-image.jpg'
  },

  // Mock notification data
  mockNotification: {
    id: 1,
    user_id: 1,
    title: 'Test Notification',
    message: 'This is a test notification',
    type: 'info',
    read: false,
    created_at: new Date().toISOString()
  },

  // Helper functions
  createMockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides
  }),

  createMockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      removeHeader: jest.fn().mockReturnThis()
    };
    return res;
  },

  createMockNext: () => jest.fn(),

  // Database mock helpers
  mockPoolQuery: (mockResults = []) => {
    return jest.fn().mockResolvedValue([mockResults]);
  },

  mockPoolGetConnection: () => ({
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn().mockResolvedValue(),
    query: jest.fn().mockResolvedValue([[]])
  }),

  // Socket.io mock
  mockSocket: {
    emit: jest.fn(),
    on: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis()
  },

  // Mock file upload
  mockFileUpload: {
    fieldname: 'image',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    destination: '/uploads',
    filename: 'test-image-1234567890.jpg',
    path: '/uploads/test-image-1234567890.jpg'
  },

  // Wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate test data
  generateTestData: (type, count = 1) => {
    const generators = {
      user: () => ({
        id: Math.floor(Math.random() * 1000),
        email: `test${Math.random()}@example.com`,
        name: `Test User ${Math.random()}`,
        role: 'user',
        student_id: `TEST${Math.random().toString(36).substr(2, 9)}`,
        phone: Math.floor(Math.random() * 10000000000).toString()
      }),

      product: () => ({
        id: Math.floor(Math.random() * 1000),
        name: `Test Product ${Math.random()}`,
        description: `Test Description ${Math.random()}`,
        price: Math.floor(Math.random() * 1000) + 10,
        original_price: Math.floor(Math.random() * 800) + 5,
        stock: Math.floor(Math.random() * 100),
        category_id: Math.floor(Math.random() * 10) + 1,
        image: `/uploads/test-image-${Math.random()}.jpg`
      }),

      order: () => ({
        id: Math.floor(Math.random() * 1000),
        user_id: Math.floor(Math.random() * 100) + 1,
        total_amount: Math.floor(Math.random() * 1000) + 10,
        status: ['pending', 'confirmed', 'shipped', 'delivered'][Math.floor(Math.random() * 4)],
        payment_method: ['cash', 'gcash'][Math.floor(Math.random() * 2)],
        created_at: new Date().toISOString()
      })
    };

    if (count === 1) {
      return generators[type]();
    }

    return Array.from({ length: count }, () => generators[type]());
  }
};

// Mock console methods in test environment
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
global.sessionStorage = sessionStorageMock;

// Mock fetch
global.fetch = jest.fn();

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn()
};

// Mock window.history
window.history = {
  pushState: jest.fn(),
  replaceState: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  go: jest.fn()
};

// Setup and teardown
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset localStorage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  // Reset sessionStorage
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
  
  // Reset fetch
  fetch.mockClear();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

export default global.testUtils;
