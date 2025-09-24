'use client';

import React, { useState, useEffect, useRef } from 'react';
import { formatTimestamp, generateSampleNotifications } from '@/utils/notificationTemplates';

const UserNotificationDropdown = ({ isOpen, onClose, userId, notifications = [], onUpdateNotifications }) => {
  const [localNotifications, setLocalNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Use notifications from parent if provided, otherwise load locally
  useEffect(() => {
    if (notifications.length > 0) {
      setLocalNotifications(notifications);
    } else if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, notifications, userId]);

  // Sync local notifications with parent when they change
  useEffect(() => {
    if (onUpdateNotifications && localNotifications.length > 0) {
      onUpdateNotifications(localNotifications);
    }
  }, [localNotifications, onUpdateNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Try to load from API first
      try {
        const response = await fetch('/api/notifications', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setLocalNotifications(data);
          return;
        }
      } catch (apiError) {
        console.log('API not available, using sample data:', apiError.message);
      }
      
      // Fallback to sample notifications if API is not available
      const sampleNotifications = generateSampleNotifications();
      setLocalNotifications(sampleNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Use sample data as fallback
      const sampleNotifications = generateSampleNotifications();
      setLocalNotifications(sampleNotifications);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      // Try API call first
      try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          // Update local state
          const updatedNotifications = localNotifications.map(notification =>
            notification.id === notificationId
              ? { ...notification, read: true }
              : notification
          );
          setLocalNotifications(updatedNotifications);
          return;
        }
      } catch (apiError) {
        console.log('API not available, updating locally:', apiError.message);
      }
      
      // Fallback to local update
      const updatedNotifications = localNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      );
      setLocalNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAsUnread = async (notificationId) => {
    try {
      // Try API call first
      try {
        const response = await fetch(`/api/notifications/${notificationId}/unread`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          // Update local state
          const updatedNotifications = localNotifications.map(notification =>
            notification.id === notificationId
              ? { ...notification, read: false }
              : notification
          );
          setLocalNotifications(updatedNotifications);
          return;
        }
      } catch (apiError) {
        console.log('API not available, updating locally:', apiError.message);
      }
      
      // Fallback to local update
      const updatedNotifications = localNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: false }
          : notification
      );
      setLocalNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error marking notification as unread:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      // Try API call first
      try {
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          // Update local state
          const updatedNotifications = localNotifications.filter(notification => notification.id !== notificationId);
          setLocalNotifications(updatedNotifications);
          return;
        }
      } catch (apiError) {
        console.log('API not available, updating locally:', apiError.message);
      }
      
      // Fallback to local update
      const updatedNotifications = localNotifications.filter(notification => notification.id !== notificationId);
      setLocalNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };


  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!isOpen) return null;

  const unreadCount = localNotifications.filter(n => !n.read).length;

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-10 w-82 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[400px] overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          </div>
          
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
    

      {/* Notifications List */}
      <div className="max-h-[400px] overflow-y-auto pb-16">
        {loading ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-3 text-sm">Loading notifications...</p>
          </div>
        ) : localNotifications.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">No notifications</h4>
            <p className="text-sm text-gray-500">We'll notify you about your orders and updates</p>
          </div>
        ) : (
          <div>
            {localNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Notification Type Indicator */}
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                    notification.type === 'order' ? 'bg-blue-500' :
                    notification.type === 'payment' ? 'bg-green-500' :
                    notification.type === 'engagement' ? 'bg-purple-500' :
                    'bg-gray-500'
                  }`}></div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${getPriorityColor(notification.priority)}`}>
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                          {!notification.read && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 mt-2">
                      {!notification.read ? (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 text-gray-600 hover:text-gray-800 hover:bg-blue-100 rounded transition-colors"
                          title="Mark as read"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => markAsUnread(notification.id)}
                          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          title="Mark as unread"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 text-gray-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                        title="Delete notification"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              // Navigate to full notifications page
              window.location.href = '/notifications';
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-2"
          >
            <span>View All Notifications</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="text-xs text-gray-500 font-medium">
            {localNotifications.length} total
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotificationDropdown;
