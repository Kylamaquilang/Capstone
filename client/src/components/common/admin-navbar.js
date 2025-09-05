'use client';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/axios';

export default function AdminNavbar() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [apiAvailable, setApiAvailable] = useState(true);
  const router = useRouter();

  const fetchUnreadCount = async () => {
    try {
      const { data } = await API.get('/notifications/unread-count');
      setUnreadCount(data.count || 0);
      setApiAvailable(true);
    } catch (err) {
      // Silently handle network errors - don't break the UI
      if (err.code === 'NETWORK_ERROR' || err.message === 'Network Error') {
        console.log('API server not available - notification count disabled');
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
      return () => clearInterval(interval);
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

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="bg-[#000C50] text-white p-4 flex items-center justify-between hidden lg:flex">
        <div className="flex items-center gap-4">
          <Image src="/images/cpc.png" alt="Logo" width={40} height={40} />
        </div>
        <div className="flex justify-center items-center">
          <Image src="/images/logo1.png" alt="Logo" width={100} height={100} />
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={handleNotificationClick}
            className="relative"
            title={apiAvailable ? "Notifications" : "Notifications (API unavailable)"}
          >
            <BellIcon className={`h-6 w-6 ${apiAvailable ? 'text-white' : 'text-gray-400'}`} />
            {unreadCount > 0 && apiAvailable && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {!apiAvailable && (
              <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-xs rounded-full h-3 w-3"></span>
            )}
          </button>
          <button><UserCircleIcon className="h-6 w-6 text-white" /></button>
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="lg:hidden bg-[#000C50] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/images/cpc.png" alt="Logo" width={30} height={30} />
          <span className="text-lg font-bold">Admin Panel</span>
        </div>
        <div className="flex gap-3 items-center">
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
          <button><UserCircleIcon className="h-5 w-5 text-white" /></button>
        </div>
      </div>
    </>
  );
}
