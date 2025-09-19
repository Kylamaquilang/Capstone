'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { 
  CubeIcon, ClipboardDocumentListIcon, BanknotesIcon, 
  UserCircleIcon, ArrowLeftOnRectangleIcon, 
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
        className="lg:hidden fixed top-4 left-4 z-50 bg-white text-gray-700 p-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors border border-gray-200"
      >
        {isMobileMenuOpen ? (
          <XMarkIcon className="h-5 w-5" />
        ) : (
          <Bars3Icon className="h-5 w-5" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`
         w-50 bg-white border-r border-gray-100 flex flex-col min-h-screen  
        fixed lg:relative transform transition-transform duration-300 ease-in-out z-30  
        shadow-md  
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}  
      `}>
        {/* Navigation Items */}
        <div className="flex-1 px-3 py-6">
          <nav className="space-y-1">
            <SidebarItem href="/admin/products" icon={CubeIcon} label="Products" onClick={toggleMobileMenu} />
            <SidebarItem href="/admin/categories" icon={TagIcon} label="Categories" onClick={toggleMobileMenu} />
            <SidebarItem href="/admin/inventory" icon={ArchiveBoxIcon} label="Inventory" onClick={toggleMobileMenu} />
            <SidebarItem href="/admin/orders" icon={ClipboardDocumentListIcon} label="Orders" onClick={toggleMobileMenu} />
            <SidebarItem href="/admin/sales" icon={BanknotesIcon} label="Sales" onClick={toggleMobileMenu} />
            <SidebarItem href="/admin/users" icon={UserCircleIcon} label="Users" onClick={toggleMobileMenu} />
          </nav>
        </div>

        {/* Logout Section */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-3 text-sm font-medium text-gray-600 hover:text-white hover:bg-[#000C50] rounded-md transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}

function SidebarItem({ href, icon: Icon, label, onClick }) {
  const handleClick = (e) => {
    try {
      if (onClick) {
        onClick();
      }
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = href;
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="flex items-center space-x-3 px-3 py-3 text-sm font-medium text-gray-600 hover:text-white hover:bg-[#000C50] rounded-md transition-all duration-150 group"
    >
      <Icon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
      <span>{label}</span>
    </Link>
  );
}
