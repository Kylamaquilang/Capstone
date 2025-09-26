// src/lib/axios.js
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Don't auto-logout for certain endpoints that might legitimately return auth errors
      const currentPath = window.location.pathname;
      const isThankYouPage = currentPath.includes('/thank-you');
      const isPaymentPage = currentPath.includes('/payment');
      const isCheckoutPage = currentPath.includes('/checkout');
      
      // Only auto-logout if not on critical pages where auth errors might be expected
      if (!isThankYouPage && !isPaymentPage && !isCheckoutPage) {
        // Clear token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/auth/login') {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;
