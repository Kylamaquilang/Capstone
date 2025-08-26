'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';

export default function Navbar() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-white shadow-lg px-6 py-4 flex justify-between items-center fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center space-x-8">
        <Link href="/dashboard" className="text-2xl font-bold text-[#000C50] hover:text-[#1a237e] transition-colors">
          CPC ESSEN
        </Link>
        
        <div className="flex items-center space-x-6">
          <Link href="/dashboard" className="text-gray-700 hover:text-[#000C50] transition-colors">
            Products
          </Link>
          <Link href="/cart" className="text-gray-700 hover:text-[#000C50] transition-colors">
            Cart
          </Link>
          <Link href="/user-profile" className="text-gray-700 hover:text-[#000C50] transition-colors">
            Profile
          </Link>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.student_id || user?.email}</p>
        </div>
        
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
