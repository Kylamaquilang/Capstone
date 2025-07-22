'use client';
import Sidebar from '@/components/common/side-bar';
import Navbar from '@/components/common/admin-navbar';
import AddProductForm from './add-product-form';

export default function AdminProductPage() {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 border-r shadow" style={{ height: 'calc(100vh - 64px)' }}>
          <Sidebar />
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-100 p-10 overflow-y-auto">
          <AddProductForm />
        </div>
      </div>
    </div>
  );
}
