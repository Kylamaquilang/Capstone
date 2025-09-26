'use client';
import { useState, useCallback, useEffect } from 'react';
import ProductTable from './product-table';
import Sidebar from '@/components/common/side-bar';
import Navbar from '@/components/common/admin-navbar';
import AddProductModal from './add-product-modal';
import API from '@/lib/axios';

export default function AdminProductPage() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const handleAddProductSuccess = useCallback(() => {
    setShowAddProductModal(false);
    // The ProductTable component will handle refreshing its own data
    console.log('Product added - table will refresh automatically');
  }, []);

  const handleCloseAddProductModal = useCallback(() => {
    setShowAddProductModal(false);
  }, []);

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
    <div className="min-h-screen text-black admin-page">
      <Navbar />
      <div className="flex pt-16 lg:pt-20"> {/* Add padding-top for fixed navbar */}
        <Sidebar />
        <div className="flex-1 bg-gray-50 p-2 sm:p-3 overflow-auto lg:ml-64">
          {/* Header Section */}
          <div className="mb-2 ml-1 sm:ml-2">
            <h1 className="text-lg sm:text-2xl font-semibold text-gray-900 mb-1">Products</h1>
          </div>

          {/* Main Container with Buttons and Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Category Filter and Add Product Button */}
            <div className="p-2 sm:p-3 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-colors ${
                      selectedCategory === ''
                        ? 'bg-[#000C50] text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    ALL
                  </button>
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
                  className="bg-[#000C50] text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-800 transition-colors text-sm font-medium self-start sm:self-auto mt-3 sm:mt-0"
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
          onClose={handleCloseAddProductModal}
          onSuccess={handleAddProductSuccess}
        />
      )}
    </div>
  );
}