'use client';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { 
  CubeIcon, ClipboardDocumentListIcon, XCircleIcon, BanknotesIcon, 
  BellIcon, UserCircleIcon, ArrowLeftOnRectangleIcon, 
  ArchiveBoxIcon, ChartBarIcon, TagIcon
} from '@heroicons/react/24/outline';

export default function Sidebar() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <div className="w-64 bg-white text-black-900 flex flex-col justify-between border-r shadow-md" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Top - Navigation Items */}
      <div className="flex flex-col space-y-6 px-6 py-8 ml-3">
        <SidebarItem href="/admin/dashboard" icon={ChartBarIcon} label="Dashboard" />
        <SidebarItem href="/admin/products" icon={CubeIcon} label="Products" />
        <SidebarItem href="/admin/categories" icon={TagIcon} label="Categories" />
        <SidebarItem href="/admin/inventory" icon={ArchiveBoxIcon} label="Inventory" />
        <SidebarItem href="/admin/orders" icon={ClipboardDocumentListIcon} label="Orders" />
        <SidebarItem href="/admin/cancelled" icon={XCircleIcon} label="Cancelled" />
        <SidebarItem href="/admin/sales" icon={BanknotesIcon} label="Sales" />
        <SidebarItem href="/admin/notifications" icon={BellIcon} label="Notifications" />
        <SidebarItem href="/admin/users" icon={UserCircleIcon} label="Users" />
      </div>

      {/* Bottom - Logout */}
      <div className="p-6">
        <button 
          onClick={handleLogout}
          className="flex items-center text-black-900 hover:text-red-600 transition ml-3 w-full"
        >
          <ArrowLeftOnRectangleIcon className="h-7 w-7 mr-3" />
          <span className="text-base font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}

function SidebarItem({ href, icon: Icon, label }) {
  return (
    <Link
      href={href}
      className="flex items-center space-x-4 hover:text-[#000C50] transition text-[18px] font-medium"
    >
      <Icon className="h-7 w-7" />
      <span>{label}</span>
    </Link>
  );
}

