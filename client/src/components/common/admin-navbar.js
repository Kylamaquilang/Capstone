'use client';
import { BellIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import API from '@/lib/axios';

export default function AdminNavbar() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const { user, logout } = useAuth();

  const fetchUnreadCount = async () => {
    try {
      // Check if token exists before making request
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('🔔 Admin navbar - No token found, skipping unread count');
        setUnreadCount(0);
        setApiAvailable(false);
        return;
      }
      
      console.log('🔔 Admin navbar - Fetching unread count with token');
      const { data } = await API.get('/api/notifications/unread-count');
      setUnreadCount(data.count || 0);
      setApiAvailable(true);
    } catch (err) {
      // Silently handle network errors - don't break the UI
      if (err.code === 'NETWORK_ERROR' || err.message === 'Network Error') {
        console.log('API server not available - notification count disabled');
        setUnreadCount(0);
        setApiAvailable(false);
      } else if (err.response?.status === 401) {
        console.log('🔔 Admin navbar - 401 error, token may be invalid');
        setUnreadCount(0);
        setApiAvailable(false);
      } else {
        console.error('Failed to fetch unread count:', err);
        setUnreadCount(0);
        setApiAvailable(false);
      }
    }
  };

  const fetchRecentNotifications = async () => {
    if (loadingNotifications) return;
    
    try {
      setLoadingNotifications(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setRecentNotifications([]);
        return;
      }
      
      const { data } = await API.get('/api/notifications/recent?limit=5');
      setRecentNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch recent notifications:', err);
      setRecentNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    // Try to fetch unread count, but don't break if API is unavailable
    fetchUnreadCount();
    
    // Only set up interval if we're in a browser environment
    if (typeof window !== 'undefined') {
      const interval = setInterval(fetchUnreadCount, 30000);
      
      // Listen for custom event when notifications are marked as read
      const handleNotificationsMarkedAsRead = () => {
        fetchUnreadCount();
        fetchRecentNotifications();
      };
      
      // Admin navbar should always be visible (no scroll behavior)
      window.addEventListener('notificationsMarkedAsRead', handleNotificationsMarkedAsRead);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('notificationsMarkedAsRead', handleNotificationsMarkedAsRead);
      };
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = () => {
    if (showDropdown) {
      setShowDropdown(false);
    } else {
      setShowDropdown(true);
      fetchRecentNotifications();
    }
  };

  const handleViewAllNotifications = () => {
    setShowDropdown(false);
    try {
      router.push('/admin/notification');
    } catch (err) {
      console.error('Navigation error:', err);
      // Fallback to window.location if router fails
      window.location.href = '/admin/notification';
    }
  };

  const formatNotificationTime = (createdAt) => {
    const now = new Date();
    const notificationTime = new Date(createdAt);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <>
      {/* Desktop Header */}
      <nav className="hidden lg:flex bg-[#000C50] text-white p-4 items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-lg" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        <div className="flex items-center gap-2">
          <Image src="/images/cpc.png" alt="Logo" width={30} height={30} />
          <span className="text-lg font-bold">Admin Panel</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative" ref={dropdownRef}>
          <button 
            onClick={handleNotificationClick}
              className="relative p-2 rounded-lg hover:bg-blue-800 transition-colors"
            title={apiAvailable ? "Notifications" : "Notifications (API unavailable)"}
          >
            <BellIcon className={`h-5 w-5 ${apiAvailable ? 'text-white' : 'text-gray-400'}`} />
            {unreadCount > 0 && apiAvailable && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {!apiAvailable && (
              <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-xs rounded-full h-2 w-2"></span>
            )}
          </button>
          
            {/* Notification Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Recent Notifications</h3>
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="p-4 text-center">
                      <div className="text-sm text-gray-500">Loading...</div>
                    </div>
                  ) : recentNotifications.length > 0 ? (
                    recentNotifications.map((notification) => (
                      <div key={notification.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${notification.is_read ? 'bg-gray-300' : 'bg-blue-500'}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 line-clamp-2">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatNotificationTime(notification.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <div className="text-sm text-gray-500">No notifications</div>
                    </div>
                  )}
                </div>
                
                <div className="p-3 border-t border-gray-200">
                  <button
                    onClick={handleViewAllNotifications}
                    className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium text-center py-2 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
            </div>
            
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="text-white p-2 rounded-lg hover:bg-blue-800 transition-colors"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="lg:hidden bg-[#000C50] text-white p-3 flex items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-lg" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        <div className="flex items-center gap-2">
          <Image src="/images/cpc.png" alt="Logo" width={24} height={24} />
          <span className="text-base font-semibold">Admin</span>
        </div>
        <div className="flex gap-1 items-center">
          <div className="relative" ref={dropdownRef}>
          <button 
            onClick={handleNotificationClick}
            className="relative p-2 rounded-lg hover:bg-blue-800 transition-colors"
            title={apiAvailable ? "Notifications" : "Notifications (API unavailable)"}
          >
            <BellIcon className={`h-4 w-4 ${apiAvailable ? 'text-white' : 'text-gray-400'}`} />
            {unreadCount > 0 && apiAvailable && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-3 w-3 flex items-center justify-center text-[10px]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {!apiAvailable && (
              <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-xs rounded-full h-2 w-2"></span>
            )}
          </button>
          
            {/* Mobile Notification Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Recent Notifications</h3>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {loadingNotifications ? (
                    <div className="p-3 text-center">
                      <div className="text-sm text-gray-500">Loading...</div>
                    </div>
                  ) : recentNotifications.length > 0 ? (
                    recentNotifications.map((notification) => (
                      <div key={notification.id} className="p-2 border-b border-gray-100 hover:bg-gray-50">
                        <div className="flex items-start space-x-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${notification.is_read ? 'bg-gray-300' : 'bg-blue-500'}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 line-clamp-2">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatNotificationTime(notification.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center">
                      <div className="text-sm text-gray-500">No notifications</div>
                    </div>
                  )}
                </div>
                
                <div className="p-2 border-t border-gray-200">
                  <button
                    onClick={handleViewAllNotifications}
                    className="w-full text-xs text-blue-600 hover:text-blue-800 font-medium text-center py-2 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
            </div>
            
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="text-white p-2 rounded-lg hover:bg-blue-800 transition-colors"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}