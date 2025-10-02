'use client';
import { useState, useCallback, useEffect } from 'react';
import ProductTable from './product-table';
import Sidebar from '@/components/common/side-bar';
import Navbar from '@/components/common/admin-navbar';
import AddProductModal from './add-product-modal';
import API from '@/lib/axios';
import { useSocket } from '@/context/SocketContext';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';

export default function AdminProductPage() {
  const { socket, isConnected, joinAdminRoom } = useSocket();
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Define the tabs
  const tabs = [
    { id: 'ALL', label: 'ALL' },
    { id: 'LANYARD', label: 'LANYARD' },
    { id: 'NSTP', label: 'NSTP' },
    { id: 'P.E', label: 'P.E' },
    { id: 'POLO', label: 'POLO' },
    { id: 'TELA', label: 'TELA' }
  ];

  const refreshCategories = useCallback(async () => {
    try {
      const { data } = await API.get('/categories');
      setCategories(data);
    } catch (err) {
      console.error('Failed to refresh categories:', err);
    }
  }, []);

  // Auto-refresh for categories
  useAdminAutoRefresh(refreshCategories, 'categories');

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
          // Separate main categories and subcategories
          const mainCategories = data.filter(cat => !cat.parent_id);
          setCategories(Array.isArray(mainCategories) ? mainCategories : []);
        }
      } catch (e) {
        console.error('Fetch categories error:', e);
        if (isMounted) {
          setCategories([]);
        }
      }
    };
    fetchCategories();

    // Load subcategories when main category is selected
    const loadSubcategories = async () => {
      if (activeTab && activeTab !== 'ALL') {
        try {
          const { data } = await API.get('/categories');
          const categorySubcategories = data.filter(cat => cat.parent_id === Number(activeTab));
          if (isMounted) {
            setSubcategories(categorySubcategories);
          }
        } catch (e) {
          console.error('Fetch subcategories error:', e);
          if (isMounted) {
            setSubcategories([]);
          }
        }
      } else {
        if (isMounted) {
          setSubcategories([]);
          setSelectedSubcategory('');
        }
      }
    };
    loadSubcategories();

    // Set up Socket.io listeners for real-time updates
    if (socket && isConnected) {
      // Join admin room for real-time updates
      joinAdminRoom();

      // Listen for product updates
      const handleProductUpdate = (productData) => {
        console.log('Real-time product update received:', productData);
        // Refresh categories when products are updated (might affect categories)
        fetchCategories();
      };

      // Listen for new products
      const handleNewProduct = (productData) => {
        console.log('Real-time new product received:', productData);
        // Refresh categories when new products are added
        fetchCategories();
      };

      // Listen for admin notifications (might indicate product changes)
      const handleAdminNotification = (notificationData) => {
        console.log('🔔 Real-time admin notification received:', notificationData);
        // Refresh categories when admin notifications arrive
        fetchCategories();
      };

      socket.on('product-updated', handleProductUpdate);
      socket.on('new-product', handleNewProduct);
      socket.on('admin-notification', handleAdminNotification);

      return () => {
        socket.off('product-updated', handleProductUpdate);
        socket.off('new-product', handleNewProduct);
        socket.off('admin-notification', handleAdminNotification);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [socket, isConnected, joinAdminRoom, activeTab]);

  return (
    <div className="min-h-screen text-black admin-page">
      <Navbar />
      <div className="flex pt-16 lg:pt-20"> {/* Add padding-top for fixed navbar */}
        <Sidebar />
        <div className="flex-1 bg-white-50 p-2 sm:p-3 overflow-auto lg:ml-64">
          {/* Header Section */}
          <div className="mb-2 ml-1 sm:ml-2">
            <h1 className="text-lg sm:text-2xl font-semibold text-gray-900 mb-1">Products</h1>
          </div>

          {/* Main Container with Search, Tabs and Table */}
          <div className="bg-white rounded-xl shadow-lg">
            {/* Modern Tab Navigation */}
            <div className="border-b border-gray-100">
              <div className="flex items-center justify-between px-4 py-3">
                {/* Tab Navigation */}
                <div className="flex space-x-1 bg-white-100 p-1 rounded-lg">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSelectedSubcategory('');
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-[#000C50] text-white shadow-sm font-semibold'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Add Product Button */}
                <button 
                  onClick={() => setShowAddProductModal(true)}
                  className="bg-[#000C50] text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium shadow-sm"
                >
                  Add Product
                </button>
              </div>
              
              {/* Subcategory Filter */}
              {subcategories.length > 0 && (
                <div className="px-4 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {subcategories.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setSelectedSubcategory(sub.name)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                          selectedSubcategory === sub.name 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                        }`}
                      >
                        {String(sub.name).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Product Table with Search Bar */}
            <ProductTable category={activeTab === 'ALL' ? '' : activeTab} subcategory={selectedSubcategory} />
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