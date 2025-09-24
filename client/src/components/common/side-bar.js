'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { 
  CubeIcon, ClipboardDocumentListIcon, BanknotesIcon, 
  UserCircleIcon, ArrowLeftOnRectangleIcon, 
  ArchiveBoxIcon, TagIcon, Bars3Icon, XMarkIcon,
  BellIcon
} from '@heroicons/react/24/outline';

export default function Sidebar() {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-20 left-3 z-50 bg-white text-gray-700 p-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors border border-gray-200"
      >
        {isMobileMenuOpen ? (
          <XMarkIcon className="h-4 w-4" />
        ) : (
          <Bars3Icon className="h-4 w-4" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-gray bg-opacity-50 z-40"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={`
         w-64 bg-white border-r border-gray-100 flex flex-col min-h-screen  
        fixed top-20 left-0 transform transition-transform duration-300 ease-in-out z-30  
        shadow-md
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}  
      `}>
        {/* Mobile Header */}
        <div className="lg:hidden px-3 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
            <button
              onClick={toggleMobileMenu}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-6">
          <nav className="space-y-1">
            <SidebarItem href="/admin/products" icon={CubeIcon} label="Products" onClick={toggleMobileMenu} pathname={pathname} />
            <SidebarItem href="/admin/categories" icon={TagIcon} label="Categories" onClick={toggleMobileMenu} pathname={pathname} />
            <SidebarItem href="/admin/inventory" icon={ArchiveBoxIcon} label="Inventory" onClick={toggleMobileMenu} pathname={pathname} />
            <SidebarItem href="/admin/orders" icon={ClipboardDocumentListIcon} label="Orders" onClick={toggleMobileMenu} pathname={pathname} />
            <SidebarItem href="/admin/notification" icon={BellIcon} label="Notifications" onClick={toggleMobileMenu} pathname={pathname} />
            <SidebarItem href="/admin/sales" icon={BanknotesIcon} label="Sales" onClick={toggleMobileMenu} pathname={pathname} />
            <SidebarItem href="/admin/users" icon={UserCircleIcon} label="Users" onClick={toggleMobileMenu} pathname={pathname} />
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

function SidebarItem({ href, icon: Icon, label, onClick, pathname }) {
  const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
  
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
      className={`flex items-center space-x-3 px-3 py-3 text-sm font-medium rounded-md transition-all duration-150 group ${
        isActive 
          ? 'bg-[#000C50] text-white shadow-sm' 
          : 'text-gray-600 hover:text-white hover:bg-[#000C50]'
      }`}
    >
      <Icon className={`h-5 w-5 transition-colors ${
        isActive 
          ? 'text-white' 
          : 'text-gray-400 group-hover:text-white'
      }`} />
      <span className="flex-1">{label}</span>
      {isActive && (
        <div className="w-1 h-6 bg-white rounded-full"></div>
      )}
    </Link>
  );
}
