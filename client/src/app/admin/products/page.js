'use client';
import Link from 'next/link';
import ProductTable from './product-table';
import Sidebar from '@/components/common/side-bar';
import Navbar from '@/components/common/admin-navbar';

export default function AdminProductPage() {
  return (
    <div className="flex flex-col h-screen text-black">
      {/* ✅ Top Navbar */}
      <Navbar />

      {/* ✅ Page layout below Navbar */}
      <div className="flex flex-1">
        {/* Sidebar with fixed height minus navbar */}
        <div className="w-64" style={{ height: 'calc(100vh - 64px)' }}>
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto">
          {/* 🟦 Card Container */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">PRODUCT</h2>

              {/* ✅ Add Product Button with Link */}
              <Link href="/admin/products/add-product">
                <button className="bg-[#000C50] text-white px-4 py-2 rounded hover:bg-blue-900 transition">
                  ADD PRODUCT
                </button>
              </Link>
            </div>

            {/* Category Buttons */}
            <div className="flex space-x-2 mb-4">
              {['TELA', 'POLO', 'PE', 'NSTP', 'LANYARD'].map((cat) => (
                <button
                  key={cat}
                  className="bg-gray-200 px-3 py-1 rounded font-semibold text-sm"
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Product Table */}
            <ProductTable />
          </div>
        </div>
      </div>
    </div>
  );
}
