'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import API from '@/lib/axios';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    try {
      setLoading(true);
      
      // Fetch cart count
      try {
        const cartResponse = await API.get('/cart');
        if (cartResponse.data.success) {
          setCartCount(cartResponse.data.total_items || 0);
        }
      } catch (error) {
        console.log('Cart fetch error (server might be starting):', error.message);
        setCartCount(0);
      }

      // Fetch notification count
      try {
        const notificationResponse = await API.get('/notifications/unread-count');
        if (notificationResponse.data.success) {
          setNotificationCount(notificationResponse.data.count || 0);
        }
      } catch (error) {
        console.log('Notification fetch error (server might be starting):', error.message);
        setNotificationCount(0);
      }
    } catch (error) {
      console.log('General fetch error:', error.message);
      setCartCount(0);
      setNotificationCount(0);
    } finally {
      setLoading(false);
    }
  };

  const updateCartCount = (count) => {
    setCartCount(count);
  };

  const updateNotificationCount = (count) => {
    setNotificationCount(count);
  };

  const incrementCartCount = () => {
    setCartCount(prev => prev + 1);
  };

  const decrementCartCount = () => {
    setCartCount(prev => Math.max(0, prev - 1));
  };

  const decrementNotificationCount = () => {
    setNotificationCount(prev => Math.max(0, prev - 1));
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        cartCount,
        notificationCount,
        loading,
        fetchCounts,
        updateCartCount,
        updateNotificationCount,
        incrementCartCount,
        decrementCartCount,
        decrementNotificationCount
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
