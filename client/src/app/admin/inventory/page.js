'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import API from '@/lib/axios';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';
import { useSocket } from '@/context/SocketContext';
import { 
  CubeIcon, 
  PlusIcon, 
  MinusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  DocumentTextIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import { getImageUrl } from '@/utils/imageUtils';
import { useRouter } from 'next/navigation';

export default function AdminInventoryPage() {
  const router = useRouter();
  const { socket, isConnected, joinAdminRoom } = useSocket();
  const [currentStock, setCurrentStock] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [productSizes, setProductSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentActionType, setCurrentActionType] = useState('stockIn');
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Form states
  const [stockInForm, setStockInForm] = useState({
    productId: '',
    quantity: '',
    size: '',
    batchNo: '',
    note: ''
  });
  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    size: '',
    physicalCount: '',
    reason: '',
    note: ''
  });
  const [stockOutForm, setStockOutForm] = useState({
    productId: '',
    quantity: '',
    size: '',
    reason: '',
    note: ''
  });
  const [adjustProductSizes, setAdjustProductSizes] = useState([]);
  const [stockOutProductSizes, setStockOutProductSizes] = useState([]);

  // Fetch all products
  const fetchAllProducts = async () => {
    try {
      const response = await API.get('/products');
      setAllProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Fetch current stock
  const fetchCurrentStock = async () => {
    try {
      const response = await API.get('/stock/current');
      setCurrentStock(response.data.data || []);
    } catch (error) {
      console.error('Error fetching current stock:', error);
      setError('Failed to fetch current stock data');
    }
  };

  // Fetch stock history
  const fetchStockHistory = async () => {
    try {
      const response = await API.get('/stock/history?limit=50');
      setStockHistory(response.data.data || []);
    } catch (error) {
      console.error('Error fetching stock history:', error);
    }
  };

  // Fetch low stock alerts
  const fetchLowStockAlerts = async () => {
    try {
      const response = await API.get('/stock/alerts/low-stock');
      setLowStockAlerts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching low stock alerts:', error);
    }
  };

  // Handle stock action success
  const handleStockActionSuccess = () => {
    setShowStockInModal(false);
    setShowAdjustModal(false);
    setShowStockOutModal(false);
    setSelectedProduct(null);
    setCurrentActionType('stockIn');
    fetchAllData();
  };

  // Open stock action modal
  const handleStockAction = (product, actionType) => {
    setSelectedProduct(product);
    setCurrentActionType(actionType);
    
    if (actionType === 'stockIn') {
      setShowStockInModal(true);
    } else if (actionType === 'adjust') {
      setShowAdjustModal(true);
    } else if (actionType === 'stockOut') {
      setShowStockOutModal(true);
    }
  };

  // Handle product selection in modal
  const handleProductSelect = async (productId) => {
    setStockInForm({ ...stockInForm, productId, size: '' });
    
    // Fetch sizes for selected product
    if (productId) {
      try {
        const response = await API.get(`/products/${productId}/sizes`);
        setProductSizes(response.data || []);
      } catch (error) {
        console.error('Error fetching product sizes:', error);
        setProductSizes([]);
      }
    } else {
      setProductSizes([]);
    }
  };

  // Handle stock in form submission
  const handleStockIn = async (e) => {
    e.preventDefault();
    try {
      await API.post('/stock/in', {
        productId: parseInt(stockInForm.productId),
        quantity: parseInt(stockInForm.quantity),
        size: stockInForm.size || null,
        batchNo: stockInForm.batchNo || null,
        source: 'restock', // Default source
        note: stockInForm.note
      });

      handleStockActionSuccess();
      // Reset form
      setStockInForm({
        productId: '',
        quantity: '',
        size: '',
        batchNo: '',
        note: ''
      });
      setProductSizes([]);
      alert('Stock added successfully!');
    } catch (error) {
      console.error('Error adding stock:', error);
      alert(error.response?.data?.error || 'Error adding stock. Please try again.');
    }
  };


  // Handle product selection in adjust modal
  const handleAdjustProductSelect = async (productId) => {
    setAdjustForm({ ...adjustForm, productId, size: '', physicalCount: '' });
    
    // Fetch sizes for selected product
    if (productId) {
      try {
        const response = await API.get(`/products/${productId}/sizes`);
        setAdjustProductSizes(response.data || []);
      } catch (error) {
        console.error('Error fetching product sizes:', error);
        setAdjustProductSizes([]);
      }
    } else {
      setAdjustProductSizes([]);
    }
  };

  // Handle product selection in stock out modal
  const handleStockOutProductSelect = async (productId) => {
    setStockOutForm({ ...stockOutForm, productId, size: '' });
    
    // Fetch sizes for selected product
    if (productId) {
      try {
        const response = await API.get(`/products/${productId}/sizes`);
        setStockOutProductSizes(response.data || []);
      } catch (error) {
        console.error('Error fetching product sizes:', error);
        setStockOutProductSizes([]);
      }
    } else {
      setStockOutProductSizes([]);
    }
  };

  // Handle stock out form submission
  const handleStockOut = async (e) => {
    e.preventDefault();
    try {
      await API.post('/stock/out', {
        productId: parseInt(stockOutForm.productId),
        quantity: parseInt(stockOutForm.quantity),
        size: stockOutForm.size || null,
        source: stockOutForm.reason, // reason becomes source
        note: stockOutForm.note
      });

      handleStockActionSuccess();
      // Reset form
      setStockOutForm({
        productId: '',
        quantity: '',
        size: '',
        reason: '',
        note: ''
      });
      setStockOutProductSizes([]);
      alert('Stock removed successfully!');
    } catch (error) {
      console.error('Error removing stock:', error);
      alert(error.response?.data?.error || 'Error removing stock. Please try again.');
    }
  };

  // Handle stock adjustment form submission
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    try {
      await API.post('/stock/adjust', {
        productId: parseInt(adjustForm.productId),
        size: adjustForm.size || null,
        physicalCount: parseInt(adjustForm.physicalCount),
        reason: adjustForm.reason,
        note: adjustForm.note
      });

      handleStockActionSuccess();
      // Reset form
      setAdjustForm({
        productId: '',
        size: '',
        physicalCount: '',
        reason: '',
        note: ''
      });
      setAdjustProductSizes([]);
      alert('Stock adjustment completed successfully!');
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert(error.response?.data?.error || 'Error adjusting stock. Please try again.');
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAllProducts(),
        fetchCurrentStock(),
        fetchStockHistory(),
        fetchLowStockAlerts()
      ]);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    fetchAllData();

    // Set up Socket.io listeners for real-time updates
    if (socket && isConnected) {
      // Join admin room for real-time updates
      joinAdminRoom();

      // Listen for new products
      const handleNewProduct = (productData) => {
        console.log('📦 Real-time new product received in inventory:', productData);
        if (isMounted) {
          // Refresh products list
          fetchAllProducts();
        }
      };

      // Listen for product updates
      const handleProductUpdate = (productData) => {
        console.log('📦 Real-time product update received in inventory:', productData);
        if (isMounted) {
          // Refresh all data to update stock levels
          fetchAllProducts();
          fetchCurrentStock();
        }
      };

      // Listen for product deletions
      const handleProductDelete = (productData) => {
        console.log('🗑️ Real-time product deletion received in inventory:', productData);
        if (isMounted) {
          // Refresh products list and stock
          fetchAllProducts();
          fetchCurrentStock();
        }
      };

      // Listen for inventory updates
      const handleInventoryUpdate = (inventoryData) => {
        console.log('📦 Real-time inventory update received:', inventoryData);
        if (isMounted) {
          // Refresh all inventory data
          fetchCurrentStock();
          fetchStockHistory();
          fetchLowStockAlerts();
        }
      };

      // Listen for admin notifications
      const handleAdminNotification = (notificationData) => {
        console.log('🔔 Real-time admin notification received in inventory:', notificationData);
        if (isMounted) {
          // Refresh all data when admin notifications arrive
          fetchAllData();
        }
      };

      // Register socket event listeners
      socket.on('new-product', handleNewProduct);
      socket.on('product-updated', handleProductUpdate);
      socket.on('product-deleted', handleProductDelete);
      socket.on('inventory-updated', handleInventoryUpdate);
      socket.on('admin-notification', handleAdminNotification);

      return () => {
        socket.off('new-product', handleNewProduct);
        socket.off('product-updated', handleProductUpdate);
        socket.off('product-deleted', handleProductDelete);
        socket.off('inventory-updated', handleInventoryUpdate);
        socket.off('admin-notification', handleAdminNotification);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [socket, isConnected, joinAdminRoom]);

  // Auto-refresh for inventory
  useAdminAutoRefresh(fetchAllData, 'inventory');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'LOW': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'GOOD': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'IN': return 'bg-green-100 text-green-800';
      case 'OUT': return 'bg-red-100 text-red-800';
      case 'ADJUSTMENT': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertLevelColor = (level) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'LOW': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  // Calculate summary statistics
  const getSummaryStats = () => {
    const totalProducts = currentStock.length;
    
    // Calculate total stock and value
    let totalStock = 0;
    let totalValue = 0;
    
    currentStock.forEach(product => {
      if (product.sizes && product.sizes.length > 0) {
        // Product has sizes - sum up each size's stock and value
        product.sizes.forEach(size => {
          const sizeStock = size.stock || 0;
          const sizePrice = size.price || product.price || 0;
          totalStock += sizeStock;
          totalValue += sizeStock * sizePrice;
        });
      } else {
        // Product without sizes - use main stock and price
        const stock = product.current_stock || 0;
        const price = product.price || 0;
        totalStock += stock;
        totalValue += stock * price;
      }
    });
    
    const lowStockCount = lowStockAlerts.length;
    const outOfStockCount = currentStock.filter(p => (p.current_stock || 0) === 0).length;

    return {
      total_products: totalProducts,
      total_stock: totalStock,
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      total_inventory_value: totalValue
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen text-black admin-page">
        <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex pt-[68px] lg:pt-20">
          <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
          <div className="flex-1 flex items-center justify-center bg-gray-50 lg:ml-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#000C50] mx-auto mb-4"></div>
              <div className="text-sm text-gray-600">Loading inventory data...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-black admin-page">
      <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="flex pt-[68px] lg:pt-20">
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 bg-gray-50 p-3 sm:p-4 overflow-auto lg:ml-64">
           {/* Header */}
           <div className="mb-4">
             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
               <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Inventory Management</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Transaction-based stock tracking system</p>
               </div>
               <button
                onClick={fetchAllData}
                 className="w-full sm:w-auto px-4 py-2 bg-[#000C50] text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium active:scale-95"
               >
                 Refresh Data
               </button>
             </div>
           </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Tabs - Horizontal Scroll on Mobile */}
          <div className="mb-6">
            <div className="border-b border-gray-200 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
                {[
                  { id: 'overview', name: 'Overview', count: getSummaryStats().total_products },
                  { id: 'current', name: 'Current Stock', count: currentStock.length },
                  { id: 'history', name: 'History', count: stockHistory.length },
                  { id: 'alerts', name: 'Alerts', count: lowStockAlerts.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-[#000C50] text-[#000C50]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                    <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-[10px] sm:text-xs">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
          {/* Inventory Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-md">
                  <CubeIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-600">Total Products</p>
                  <p className="text-lg font-bold text-blue-700">
                        {getSummaryStats().total_products}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-md">
                  <ArchiveBoxIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-green-600">Total Stock</p>
                  <p className="text-lg font-bold text-green-700">
                        {getSummaryStats().total_stock}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-50 rounded-md">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-yellow-600">Low Stock</p>
                  <p className="text-lg font-bold text-yellow-700">
                        {getSummaryStats().low_stock_count}
                  </p>
                </div>
              </div>
            </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-md">
                  <ChartBarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-purple-600">Inventory Value</p>
                  <p className="text-lg font-bold text-purple-700">
                        {formatCurrency(getSummaryStats().total_inventory_value)}
                  </p>
                </div>
              </div>
            </div>
          </div>

              {/* Quick Actions */}
             <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
               <div className="p-3 sm:p-4 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
               </div>
               <div className="p-3 sm:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setShowStockInModal(true);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2 active:scale-95"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Add Stock</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setShowStockOutModal(true);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2 active:scale-95"
                    >
                      <MinusIcon className="h-4 w-4" />
                      <span>Stock Out</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setShowAdjustModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2 active:scale-95"
                    >
                      <ClockIcon className="h-4 w-4" />
                      <span>Adjust Stock</span>
                    </button>
                    <button
                      onClick={() => router.push('/admin/stock-management')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center space-x-2 active:scale-95"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Advanced Management</span>
                      <span className="sm:hidden">Advanced</span>
                    </button>
                   </div>
                   </div>
               </div>
             </div>
          )}

          {/* Current Stock Tab */}
          {activeTab === 'current' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Current Stock</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setShowStockInModal(true);
                      }}
                      className="bg-[#000C50] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      Add Stock
                    </button>
                 </div>
               </div>
                
                   <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Base Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                         </tr>
                       </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentStock.map((product) => {
                        // If product has sizes, display each size as a separate row
                        if (product.sizes && product.sizes.length > 0) {
                          return product.sizes.map((size, index) => {
                            const sizeStock = size.stock || 0;
                            const sizeStatus = sizeStock <= 5 ? 'LOW' : sizeStock <= 10 ? 'MEDIUM' : 'GOOD';
                            
                            return (
                              <tr key={`${product.id}-${size.id}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 uppercase">
                                  {product.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                    {size.size}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                                  {size.base_stock || 0}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                                  {sizeStock}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(sizeStatus)}`}>
                                    {sizeStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          });
                        } else {
                          // Product has no sizes, display as single row
                          return (
                        <tr key={product.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 uppercase">
                            {product.name}
                             </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-500">
                                  No sizes
                                </span>
                             </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                                {product.base_stock || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                            {product.current_stock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(product.stock_status)}`}>
                              {product.stock_status}
                                   </span>
                             </td>
                           </tr>
                          );
                        }
                      })}
                       </tbody>
                     </table>
                   </div>
                   </div>
               </div>
          )}

          {/* Stock History Tab */}
          {activeTab === 'history' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction History</h3>
                
                   <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                       </tr>
                     </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stockHistory.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(transaction.created_at).toLocaleDateString()}
                           </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {transaction.product_name}
                           </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTransactionTypeColor(transaction.transaction_type)}`}>
                              {transaction.transaction_type}
                                       </span>
                           </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.source}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.created_by_name}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                     </table>
                   </div>
                   </div>
               </div>
          )}

          {/* Low Stock Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Low Stock Alerts</h3>
                
                {lowStockAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-green-600 text-lg font-medium">All products are well stocked!</div>
                    <p className="text-gray-500 mt-2">No low stock alerts at this time.</p>
                 </div>
                ) : (
                     <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Base Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Current Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reorder Level
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Alert Level
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                           </tr>
                         </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {lowStockAlerts.map((product) => (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 uppercase">
                              {product.name}
                               </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                              {product.base_stock || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                              {product.current_stock}
                               </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.reorder_level}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAlertLevelColor(product.alert_level)}`}>
                                {product.alert_level}
                                 </span>
                               </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={async () => {
                                  setSelectedProduct(product);
                                  setStockInForm({ 
                                    productId: product.id.toString(), 
                                    quantity: '', 
                                    size: '', 
                                    batchNo: '', 
                                    note: '' 
                                  });
                                  // Fetch sizes for this product
                                  try {
                                    const response = await API.get(`/products/${product.id}/sizes`);
                                    setProductSizes(response.data || []);
                                  } catch (error) {
                                    console.error('Error fetching product sizes:', error);
                                    setProductSizes([]);
                                  }
                                  setShowStockInModal(true);
                                }}
                                className="text-[#000C50] hover:text-blue-700"
                              >
                                Add Stock
                              </button>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                )}
              </div>
                 </div>
               )}
             </div>
           </div>

      {/* Stock In Modal */}
      {showStockInModal && (
        <div className="fixed inset-0 overflow-y-auto h-full w-full z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
          <div className="relative top-20 mx-auto p-5 border-2 border-gray-300 w-96 shadow-2xl rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add Stock
              </h3>
              <form onSubmit={handleStockIn}>
                <div className="space-y-4">
                  {/* Product Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select Product <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={stockInForm.productId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                    >
                      <option value="">-- Select a product --</option>
                      {allProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name.toUpperCase()}
                          {(!product.sizes || product.sizes.length === 0) && ` - Stock: ${product.stock || 0}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Size Dropdown (shows when product has sizes) */}
                  {productSizes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Size <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={stockInForm.size}
                        onChange={(e) => setStockInForm({ ...stockInForm, size: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                      >
                        <option value="">-- Select size --</option>
                        {productSizes.map((sizeObj) => (
                          <option key={sizeObj.id} value={sizeObj.size}>
                            {sizeObj.size.toUpperCase()}
                            {sizeObj.size.toLowerCase() !== 'none' && ` - Stock: ${sizeObj.stock || 0}`}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">This product has size variants. Stock shown is for each size.</p>
                    </div>
                  )}

                  {/* Size Text Input (shows when product selected but no sizes available) */}
                  {stockInForm.productId && productSizes.length === 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Size (Optional)</label>
                      <input
                        type="text"
                        value={stockInForm.size}
                        onChange={(e) => setStockInForm({ ...stockInForm, size: e.target.value })}
                        placeholder="e.g., S, M, L, XL"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                      <p className="text-xs text-gray-500 mt-1">Leave empty if not applicable</p>
        </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type=""
                      required
                      min="1"
                      value={stockInForm.quantity}
                      onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Enter quantity to add"
                    />
      </div>

                  {/* Batch No */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Batch No (Optional)</label>
                    <input
                      type="text"
                      value={stockInForm.batchNo}
                      onChange={(e) => setStockInForm({ ...stockInForm, batchNo: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="e.g., BATCH-001"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Note</label>
                    <textarea
                      value={stockInForm.note}
                      onChange={(e) => setStockInForm({ ...stockInForm, note: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows="3"
                      placeholder="Additional notes or remarks"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowStockInModal(false);
                      setStockInForm({
                        productId: '',
                        quantity: '',
                        size: '',
                        batchNo: '',
                        note: ''
                      });
                      setProductSizes([]);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#000C50] text-white rounded-md hover:bg-blue-700"
                  >
                    Add Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 overflow-y-auto h-full w-full z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
          <div className="relative top-20 mx-auto p-5 border-2 border-gray-300 w-96 shadow-2xl rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Adjust Stock
              </h3>
              <form onSubmit={handleAdjustStock}>
                <div className="space-y-4">
                  {/* Product Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select Product <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={adjustForm.productId}
                      onChange={(e) => handleAdjustProductSelect(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                    >
                      <option value="">-- Select a product --</option>
                      {allProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name.toUpperCase()}
                          {(!product.sizes || product.sizes.length === 0) && ` - Stock: ${product.stock || 0}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Size Dropdown (shows when product has sizes) */}
                  {adjustProductSizes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Size <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={adjustForm.size}
                        onChange={(e) => setAdjustForm({ ...adjustForm, size: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                      >
                        <option value="">-- Select size --</option>
                        {adjustProductSizes.map((sizeObj) => (
                          <option key={sizeObj.id} value={sizeObj.size}>
                            {sizeObj.size.toUpperCase()}
                            {sizeObj.size.toLowerCase() !== 'none' && ` - Stock: ${sizeObj.stock || 0}`}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">This product has size variants. Stock shown is for each size.</p>
                    </div>
                  )}

                  {/* Size Text Input (shows when product selected but no sizes available) */}
                  {adjustForm.productId && adjustProductSizes.length === 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Size (Optional)</label>
                      <input
                        type="text"
                        value={adjustForm.size}
                        onChange={(e) => setAdjustForm({ ...adjustForm, size: e.target.value })}
                        placeholder="e.g., S, M, L, XL"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty if not applicable</p>
                    </div>
                  )}

                  {/* Current System Stock */}
                  {adjustForm.productId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current System Stock</label>
                    <input
                      type="number"
                        value={
                          adjustProductSizes.length > 0
                            ? (adjustForm.size 
                                ? adjustProductSizes.find(s => s.size === adjustForm.size)?.stock || 0
                                : 0)
                            : allProducts.find(p => p.id === parseInt(adjustForm.productId))?.stock || 0
                        }
                      disabled
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700 font-semibold"
                    />
                    {adjustProductSizes.length > 0 && !adjustForm.size && (
                      <p className="text-xs text-amber-600 mt-1">Please select a size to see available stock</p>
                    )}
                  </div>
                  )}

                  {/* Physical Count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Physical Count <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={adjustForm.physicalCount}
                      onChange={(e) => setAdjustForm({ ...adjustForm, physicalCount: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Enter actual physical count"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the actual count you physically verified</p>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">-- Select reason --</option>
                      <option value="Physical Count">Physical Count</option>
                      <option value="Damaged Goods">Damaged Goods</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Note</label>
                    <textarea
                      value={adjustForm.note}
                      onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows="3"
                      placeholder="Additional notes or remarks"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdjustModal(false);
                      setAdjustForm({
                        productId: '',
                        size: '',
                        physicalCount: '',
                        reason: '',
                        note: ''
                      });
                      setAdjustProductSizes([]);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                  >
                    Adjust Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stock Out Modal */}
      {showStockOutModal && (
        <div className="fixed inset-0 overflow-y-auto h-full w-full z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
          <div className="relative top-20 mx-auto p-5 border-2 border-gray-300 w-96 shadow-2xl rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Stock Out (Remove Stock)
                </h3>
                <form onSubmit={handleStockOut}>
                  <div className="space-y-4">
                    {/* Product Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Select Product <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={stockOutForm.productId}
                        onChange={(e) => handleStockOutProductSelect(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                      >
                        <option value="">-- Select a product --</option>
                        {allProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name.toUpperCase()}
                            {(!product.sizes || product.sizes.length === 0) && ` - Stock: ${product.stock || 0}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Size Dropdown (shows when product has sizes) */}
                    {stockOutProductSizes.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Size <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={stockOutForm.size}
                          onChange={(e) => setStockOutForm({ ...stockOutForm, size: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                        >
                          <option value="">-- Select size --</option>
                          {stockOutProductSizes.map((sizeObj) => (
                            <option key={sizeObj.id} value={sizeObj.size}>
                              {sizeObj.size.toUpperCase()}
                              {sizeObj.size.toLowerCase() !== 'none' && ` - Stock: ${sizeObj.stock || 0}`}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">This product has size variants. Stock shown is for each size.</p>
                      </div>
                    )}

                    {/* Size Text Input (shows when product selected but no sizes available) */}
                    {stockOutForm.productId && stockOutProductSizes.length === 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Size (Optional)</label>
                        <input
                          type="text"
                          value={stockOutForm.size}
                          onChange={(e) => setStockOutForm({ ...stockOutForm, size: e.target.value })}
                          placeholder="e.g., S, M, L, XL"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave empty if not applicable</p>
                      </div>
                    )}

                    {/* Current Stock Display */}
                    {stockOutForm.productId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                        <input
                          type="number"
                          value={
                            stockOutProductSizes.length > 0
                              ? (stockOutForm.size 
                                  ? stockOutProductSizes.find(s => s.size === stockOutForm.size)?.stock || 0
                                  : 0)
                              : allProducts.find(p => p.id === parseInt(stockOutForm.productId))?.stock || 0
                          }
                          disabled
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700 font-semibold"
                        />
                        {stockOutProductSizes.length > 0 && !stockOutForm.size && (
                          <p className="text-xs text-amber-600 mt-1">Please select a size to see available stock</p>
                        )}
                      </div>
                    )}

                    {/* Quantity to Remove */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Quantity to Remove <span className="text-red-500">*</span>
                      </label>
                      <input
                        type=""
                        required
                        min="1"
                        value={stockOutForm.quantity}
                        onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Enter quantity"
                      />
                    </div>

                    {/* Reason Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Reason <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={stockOutForm.reason}
                        onChange={(e) => setStockOutForm({ ...stockOutForm, reason: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">-- Select reason --</option>
                        <option value="Damaged">Damaged</option>
                        <option value="Quality Issue">Quality Issue</option>
                      </select>
                    </div>

                    {/* Note */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Note</label>
                      <textarea
                        value={stockOutForm.note}
                        onChange={(e) => setStockOutForm({ ...stockOutForm, note: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        rows="3"
                        placeholder="Additional notes or remarks"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowStockOutModal(false);
                        setStockOutForm({
                          productId: '',
                          quantity: '',
                          size: '',
                          reason: '',
                          note: ''
                        });
                        setStockOutProductSizes([]);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Remove Stock
                    </button>
                  </div>
                </form>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}