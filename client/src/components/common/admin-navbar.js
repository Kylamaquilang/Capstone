'use client';
import { BellIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import API from '@/lib/axios';

export default function AdminNavbar() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [apiAvailable, setApiAvailable] = useState(true);
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
      const { data } = await API.get('/notifications/unread-count');
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

  useEffect(() => {
    // Try to fetch unread count, but don't break if API is unavailable
    fetchUnreadCount();
    
    // Only set up interval if we're in a browser environment
    if (typeof window !== 'undefined') {
      const interval = setInterval(fetchUnreadCount, 30000);
      
      // Listen for custom event when notifications are marked as read
      const handleNotificationsMarkedAsRead = () => {
        fetchUnreadCount();
      };
      
      // Admin navbar should always be visible (no scroll behavior)
      window.addEventListener('notificationsMarkedAsRead', handleNotificationsMarkedAsRead);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('notificationsMarkedAsRead', handleNotificationsMarkedAsRead);
      };
    }
  }, []);

  const handleNotificationClick = () => {
    try {
      router.push('/admin/notification');
    } catch (err) {
      console.error('Navigation error:', err);
      // Fallback to window.location if router fails
      window.location.href = '/admin/notification';
    }
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
          <button 
            onClick={handleNotificationClick}
            className="relative"
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
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <UserCircleIcon className="h-6 w-6 text-white" />
            </div>
            
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
          
          <div className="flex items-center">
            <div className="flex items-center space-x-1">
              <UserCircleIcon className="h-4 w-4 text-white" />
              <div className="text-right hidden xs:block">
                <p className="text-xs font-medium text-white truncate max-w-20">{user?.name || 'Admin'}</p>
              </div>
            </div>
            
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