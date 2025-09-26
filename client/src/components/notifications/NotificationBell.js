'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import UserNotificationDropdown from './UserNotificationDropdown';
import { generateSampleNotifications } from '@/utils/notificationTemplates';
import { useSocket } from '@/context/SocketContext';

const NotificationBell = ({ userType = 'user', userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { socket, isConnected, connectionFailed, joinUserRoom } = useSocket();

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      // Try to load from API first
      try {
        const response = await fetch('http://localhost:5000/api/notifications', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setNotifications(Array.isArray(data) ? data : []);
          return;
        }
      } catch (apiError) {
        console.log('API not available, using sample data:', apiError.message);
      }
      
      // Fallback to sample notifications if API is not available
      const sampleNotifications = generateSampleNotifications();
      setNotifications(Array.isArray(sampleNotifications) ? sampleNotifications : []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Use sample data as fallback
      const sampleNotifications = generateSampleNotifications();
      setNotifications(Array.isArray(sampleNotifications) ? sampleNotifications : []);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load notifications and unread count when component mounts
  useEffect(() => {
    loadNotifications();
    
    // Join user room for real-time notifications
    if (userId && isConnected && !connectionFailed) {
      joinUserRoom(userId);
    }
    
    // Set up Socket.io event listeners for real-time updates
    if (socket && !connectionFailed) {
      const handleNewNotification = (notification) => {
        console.log('🔔 Real-time notification received:', notification);
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      };

      const handleOrderUpdate = (orderData) => {
        console.log('📦 Real-time order update received:', orderData);
        // Create notification for order update
        const orderNotification = {
          id: `order_update_${orderData.orderId}_${Date.now()}`,
          type: 'order',
          title: `Order #${orderData.orderId} Updated`,
          message: `Your order status has been updated to: ${orderData.status}`,
          timestamp: orderData.timestamp,
          read: false,
          priority: 'high'
        };
        setNotifications(prev => [orderNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      };

      socket.on('new-notification', handleNewNotification);
      socket.on('order-status-updated', handleOrderUpdate);

      return () => {
        socket.off('new-notification', handleNewNotification);
        socket.off('order-status-updated', handleOrderUpdate);
      };
    }
  }, [userId, socket, isConnected, connectionFailed, joinUserRoom, loadNotifications]);

  // Update unread count when notifications change
  useEffect(() => {
    if (Array.isArray(notifications)) {
      const unread = notifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } else {
      setUnreadCount(0);
    }
  }, [notifications]);

  const toggleDropdown = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Function to update notifications (called by dropdown)
  const updateNotifications = useCallback((updatedNotifications) => {
    setNotifications(updatedNotifications);
  }, []);

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-white hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-full"
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="absolute -top-1 -right-1">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          </div>
        )}
      </button>

      {/* Notification Dropdown */}
      <UserNotificationDropdown
        isOpen={isOpen}
        onClose={handleClose}
        userId={userId}
        notifications={notifications}
        onUpdateNotifications={updateNotifications}
      />
    </div>
  );
};

export default NotificationBell;
