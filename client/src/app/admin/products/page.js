'use client';
import { useEffect, useState } from 'react';
import ProductTable from './product-table';
import Sidebar from '@/components/common/side-bar';
import Navbar from '@/components/common/admin-navbar';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import AddProductModal from './add-product-modal';
import API from '@/lib/axios';

export default function AdminProductPage() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchCategories = async () => {
      try {
        const { data } = await API.get('/categories');
        if (isMounted) {
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Fetch categories error:', e);
        if (isMounted) {
          setCategories([]);
        }
      }
    };
    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen text-black admin-page">
        {/* ✅ Top Navbar */}
        <Navbar />

      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-gray-50 p-3 sm:p-6 overflow-auto lg:ml-0 ml-0">
          {/* Header Section */}
          <div className="mb-3 ml-1 sm:ml-2">
            <h1 className="text-xl sm:text-3xl font-semibold text-gray-900 mb-1">Products</h1>
          </div>

          {/* Main Container with Buttons and Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Category Filter and Add Product Button */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-colors ${
                        selectedCategory === cat.name 
                          ? 'bg-[#000C50] text-white' 
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {String(cat.name).toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Add Product Button */}
                <button 
                  onClick={() => setShowAddProductModal(true)}
                  className="bg-[#000C50] text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-800 transition-colors text-sm font-medium self-start sm:self-auto"
                >
                  Add Product
                </button>
              </div>
            </div>

            {/* Product Table */}
            <ProductTable category={selectedCategory} />
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProductModal && (
        <AddProductModal 
          onClose={() => setShowAddProductModal(false)}
          onSuccess={() => {
            setShowAddProductModal(false);
            // Refresh the product table by triggering a re-render
            window.location.reload();
          }}
        />
      )}
    </div>
    </ErrorBoundary>
  );
}
