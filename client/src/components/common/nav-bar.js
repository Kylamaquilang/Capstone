'use client';
import {
    BellIcon,
    MagnifyingGlassIcon,
    ShoppingCartIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useNotifications } from '@/context/NotificationContext';

export default function Navbar() {
  const { cartCount, notificationCount } = useNotifications();

  // Badge component
  const Badge = ({ count, children }) => {
    if (count === 0) return children;
    
    return (
      <div className="relative">
        {children}
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
          {count > 99 ? '99+' : count}
        </span>
      </div>
    );
  };

  return (
    <nav className="bg-[#000C50] text-white p-4 flex items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-lg">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Image src="/images/cpc.png" alt="Logo" width={40} height={40} priority />
        </Link>
      </div>
      <div className="flex justify-center items-center ml-23">
        <Image src="/images/logo1.png" alt="Logo" width={100} height={100} priority />
      </div>
      <div className="flex gap-4 items-center">
        <button><MagnifyingGlassIcon className="h-6 w-6 text-white" /></button>
        
        <Link href="/notification">
          <Badge count={notificationCount}>
            <BellIcon className="h-6 w-6 text-white" />
          </Badge>
        </Link>
        
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
