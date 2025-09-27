'use client';
import {
    MagnifyingGlassIcon,
    ShoppingCartIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function Navbar() {
  const { cartCount, notificationCount } = useNotifications();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show navbar when scrolling up or at the top
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setIsVisible(true);
      } 
      // Hide navbar when scrolling down (but not at the very top)
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  // Badge component
  const Badge = ({ count, children }) => {
    if (count === 0) return children;
    
    return (
      <div className="relative">
        {children}
        <span className="absolute -top-2 -right-2 bg-gray-200 text-black text-xs font-normal px-1.5 py-0.5 rounded-full">
          {count > 99 ? '99+' : count}
        </span>
      </div>
    );
  };

  return (
    <nav className={`bg-[#000C50] text-white p-4 flex items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-lg transition-transform duration-300 ease-in-out ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Image src="/images/cpc.png" alt="Logo" width={40} height={40} priority />
        </Link>
      </div>
      <div className="flex justify-center items-center ml-23">
        <Image src="/images/logo1.png" alt="Logo" width={120} height={120} priority />
      </div>
      <div className="flex gap-4 items-center">
        
        <NotificationBell userType="user" userId={user?.id?.toString()} />
        
        <Link href="/cart">
          <Badge count={cartCount}>
            <ShoppingCartIcon className="h-6 w-6 text-white" />
          </Badge>
        </Link>
        
        <Link href="/user-profile"><UserCircleIcon className="h-6 w-6 text-white" /></Link>
      </div>
    </nav>
  );
}