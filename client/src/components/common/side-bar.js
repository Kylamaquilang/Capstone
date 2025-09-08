'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { 
  CubeIcon, ClipboardDocumentListIcon, XCircleIcon, BanknotesIcon, 
  BellIcon, UserCircleIcon, ArrowLeftOnRectangleIcon, 
  ArchiveBoxIcon, TagIcon, Bars3Icon, XMarkIcon
} from '@heroicons/react/24/outline';

export default function Sidebar() {
  const { logout } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 bg-[#000C50] text-white p-3 rounded-md shadow-lg hover:bg-blue-900 transition-colors"
      >
        {isMobileMenuOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-72 sm:w-64 bg-white text-black-900 flex flex-col justify-between shadow-md min-h-screen
        fixed lg:relative z-50 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top - Navigation Items */}
        <div className="flex flex-col space-y-4 sm:space-y-6 px-4 sm:px-6 py-6 sm:py-8 ml-2 sm:ml-3">
          <SidebarItem href="/admin/products" icon={CubeIcon} label="Products" onClick={toggleMobileMenu} />
          <SidebarItem href="/admin/categories" icon={TagIcon} label="Categories" onClick={toggleMobileMenu} />
          <SidebarItem href="/admin/inventory" icon={ArchiveBoxIcon} label="Inventory" onClick={toggleMobileMenu} />
          <SidebarItem href="/admin/orders" icon={ClipboardDocumentListIcon} label="Orders" onClick={toggleMobileMenu} />
          <SidebarItem href="/admin/cancelled" icon={XCircleIcon} label="Cancelled" onClick={toggleMobileMenu} />
          <SidebarItem href="/admin/sales" icon={BanknotesIcon} label="Sales" onClick={toggleMobileMenu} />
          <SidebarItem href="/admin/notification" icon={BellIcon} label="Notifications" onClick={toggleMobileMenu} />
          <SidebarItem href="/admin/users" icon={UserCircleIcon} label="Users" onClick={toggleMobileMenu} />
        </div>

        {/* Bottom - Logout */}
        <div className="p-4 sm:p-6">
          <button 
            onClick={handleLogout}
            className="flex items-center text-black-900 hover:text-red-600 transition ml-2 sm:ml-3 w-full py-2 px-2 rounded-md hover:bg-gray-100"
          >
            <ArrowLeftOnRectangleIcon className="h-6 w-6 sm:h-7 sm:w-7 mr-2 sm:mr-3" />
            <span className="text-sm sm:text-base font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}

function SidebarItem({ href, icon: Icon, label, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center space-x-3 sm:space-x-4 hover:text-[#000C50] transition text-base sm:text-[18px] font-medium py-2 px-2 rounded-md hover:bg-gray-100"
    >
      <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
      <span>{label}</span>
    </Link>
  );
}

