'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProductTable from './product-table';
import Sidebar from '@/components/common/side-bar';
import Navbar from '@/components/common/admin-navbar';
import API from '@/lib/axios';

export default function AdminProductPage() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await API.get('/categories');
        setCategories(Array.isArray(data) ? data : []);
      } catch (e) {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="flex flex-col min-h-screen text-black admin-page">
      {/* ✅ Top Navbar */}
      <Navbar />

      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto lg:ml-0 ml-0">
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
            <div className="flex items-center gap-2 mb-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`${selectedCategory === cat.name ? 'bg-[#000C50] text-white' : 'bg-gray-200 text-black'} px-3 py-1 rounded font-semibold text-sm`}
                >
                  {String(cat.name).toUpperCase()}
                </button>
              ))}
            </div>

            {/* Product Table */}
            <ProductTable category={selectedCategory} />
          </div>
        </div>
      </div>
    </div>
  );
}
