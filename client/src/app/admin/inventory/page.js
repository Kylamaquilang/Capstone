'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import API from '@/lib/axios';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';
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
  const [currentStock, setCurrentStock] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentActionType, setCurrentActionType] = useState('stockIn');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form states
  const [stockInForm, setStockInForm] = useState({
    quantity: '',
    referenceNo: '',
    batchNo: '',
    expiryDate: '',
    source: 'supplier',
    note: ''
  });
  const [stockOutForm, setStockOutForm] = useState({
    quantity: '',
    referenceNo: '',
    source: 'sale',
    note: ''
  });
  const [adjustForm, setAdjustForm] = useState({
    physicalCount: '',
    reason: '',
    note: ''
  });

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
    setShowStockOutModal(false);
    setShowAdjustModal(false);
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
    } else if (actionType === 'stockOut') {
      setShowStockOutModal(true);
    } else if (actionType === 'adjust') {
      setShowAdjustModal(true);
    }
  };

  // Handle stock in form submission
  const handleStockIn = async (e) => {
    e.preventDefault();
    try {
      await API.post('/stock/in', {
        productId: selectedProduct?.id,
        quantity: parseInt(stockInForm.quantity),
        referenceNo: stockInForm.referenceNo,
        batchNo: stockInForm.batchNo || null,
        expiryDate: stockInForm.expiryDate || null,
        source: stockInForm.source,
        note: stockInForm.note
      });

      handleStockActionSuccess();
      alert('Stock added successfully!');
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Error adding stock. Please try again.');
    }
  };

  // Handle stock out form submission
  const handleStockOut = async (e) => {
    e.preventDefault();
    try {
      await API.post('/stock/out', {
        productId: selectedProduct?.id,
        quantity: parseInt(stockOutForm.quantity),
        referenceNo: stockOutForm.referenceNo,
        source: stockOutForm.source,
        note: stockOutForm.note
      });

      handleStockActionSuccess();
      alert('Stock deducted successfully!');
    } catch (error) {
      console.error('Error deducting stock:', error);
      alert('Error deducting stock. Please try again.');
    }
  };

  // Handle stock adjustment form submission
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    try {
      await API.post('/stock/adjust', {
        productId: selectedProduct?.id,
        physicalCount: parseInt(adjustForm.physicalCount),
        reason: adjustForm.reason,
        note: adjustForm.note
      });

      handleStockActionSuccess();
      alert('Stock adjustment completed successfully!');
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Error adjusting stock. Please try again.');
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
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
    fetchAllData();
  }, []);

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
    const totalStock = currentStock.reduce((sum, product) => sum + (product.current_stock || 0), 0);
    const totalValue = currentStock.reduce((sum, product) => sum + (product.current_stock || 0) * (product.price || 0), 0);
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
        <Navbar />
        <div className="flex pt-16 lg:pt-20">
          <Sidebar />
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
      <Navbar />
      <div className="flex pt-16 lg:pt-20">
        <Sidebar />
        <div className="flex-1 bg-white p-2 sm:p-3 overflow-auto lg:ml-64">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">Inventory Management</h1>
                <p className="text-sm text-gray-600 mt-1">Transaction-based stock tracking system</p>
              </div>
              <button
                onClick={fetchAllData}
                className="px-4 py-2 bg-[#000C50] text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium mr-5"
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

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'overview', name: 'Overview', count: getSummaryStats().total_products },
                  { id: 'current', name: 'Current Stock', count: currentStock.length },
                  { id: 'history', name: 'Transaction History', count: stockHistory.length },
                  { id: 'alerts', name: 'Low Stock Alerts', count: lowStockAlerts.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-[#000C50] text-[#000C50]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                    <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Inventory Overview Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-md mt-2 ml-4">
                      <CubeIcon className="w-8 h-8 text-blue-700" />
                    </div>
                    <div className="ml-2 sm:ml-3">
                      <p className="text-xs sm:text-sm font-medium text-blue-600">Total Products</p>
                      <p className="text-base sm:text-lg font-bold text-blue-700">
                        {getSummaryStats().total_products}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-50 rounded-md mt-2 ml-4">
                      <ArchiveBoxIcon className="w-8 h-8 text-green-700" />
                    </div>
                    <div className="ml-2 sm:ml-3">
                      <p className="text-xs sm:text-sm font-medium text-green-600">Total Stock</p>
                      <p className="text-base sm:text-lg font-bold text-green-700">
                        {getSummaryStats().total_stock}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-50 rounded-md mt-2 ml-4">
                      <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                    </div>
                    <div className="ml-2 sm:ml-3">
                      <p className="text-xs sm:text-sm font-medium text-yellow-600">Low Stock</p>
                      <p className="text-base sm:text-lg font-bold text-yellow-700">
                        {getSummaryStats().low_stock_count}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-50 rounded-md mt-2 ml-4">
                      <ChartBarIcon className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="ml-2 sm:ml-3">
                      <p className="text-xs sm:text-sm font-medium text-purple-600">Inventory Value</p>
                      <p className="text-base sm:text-lg font-bold text-purple-700">
                        {formatCurrency(getSummaryStats().total_inventory_value)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setShowStockInModal(true);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex items-center space-x-2"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Add Stock</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setShowStockOutModal(true);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium flex items-center space-x-2"
                    >
                      <MinusIcon className="h-4 w-4" />
                      <span>Deduct Stock</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setShowAdjustModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2"
                    >
                      <ClockIcon className="h-4 w-4" />
                      <span>Adjust Stock</span>
                    </button>
                    <button
                      onClick={() => router.push('/admin/stock-management')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium flex items-center space-x-2"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      <span>Advanced Stock Management</span>
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
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reorder Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentStock.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {product.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.current_stock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.reorder_level}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(product.stock_status)}`}>
                              {product.stock_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowStockInModal(true);
                                }}
                                className="text-[#000C50] hover:text-blue-700"
                              >
                                Add Stock
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowAdjustModal(true);
                                }}
                                className="text-orange-600 hover:text-orange-700"
                              >
                                Adjust
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
                          Reference
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
                            {transaction.reference_no}
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {product.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                                onClick={() => {
                                  setSelectedProduct(product);
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add Stock {selectedProduct && `- ${selectedProduct.name}`}
              </h3>
              <form onSubmit={handleStockIn}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      required
                      value={stockInForm.quantity}
                      onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reference No</label>
                    <input
                      type="text"
                      value={stockInForm.referenceNo}
                      onChange={(e) => setStockInForm({ ...stockInForm, referenceNo: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Batch No (Optional)</label>
                    <input
                      type="text"
                      value={stockInForm.batchNo}
                      onChange={(e) => setStockInForm({ ...stockInForm, batchNo: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expiry Date (Optional)</label>
                    <input
                      type="date"
                      value={stockInForm.expiryDate}
                      onChange={(e) => setStockInForm({ ...stockInForm, expiryDate: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source</label>
                    <select
                      value={stockInForm.source}
                      onChange={(e) => setStockInForm({ ...stockInForm, source: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="supplier">Supplier</option>
                      <option value="purchase">Purchase</option>
                      <option value="return">Return</option>
                      <option value="adjustment">Adjustment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Note</label>
                    <textarea
                      value={stockInForm.note}
                      onChange={(e) => setStockInForm({ ...stockInForm, note: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows="3"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowStockInModal(false)}
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

      {/* Stock Out Modal */}
      {showStockOutModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Deduct Stock {selectedProduct && `- ${selectedProduct.name}`}
              </h3>
              <form onSubmit={handleStockOut}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      required
                      value={stockOutForm.quantity}
                      onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reference No</label>
                    <input
                      type="text"
                      value={stockOutForm.referenceNo}
                      onChange={(e) => setStockOutForm({ ...stockOutForm, referenceNo: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source</label>
                    <select
                      value={stockOutForm.source}
                      onChange={(e) => setStockOutForm({ ...stockOutForm, source: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="sale">Sale</option>
                      <option value="damage">Damage</option>
                      <option value="theft">Theft</option>
                      <option value="adjustment">Adjustment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Note</label>
                    <textarea
                      value={stockOutForm.note}
                      onChange={(e) => setStockOutForm({ ...stockOutForm, note: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows="3"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowStockOutModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Deduct Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Adjust Stock {selectedProduct && `- ${selectedProduct.name}`}
              </h3>
              <form onSubmit={handleAdjustStock}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current System Stock</label>
                    <input
                      type="number"
                      value={selectedProduct?.current_stock || 0}
                      disabled
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Physical Count</label>
                    <input
                      type="number"
                      required
                      value={adjustForm.physicalCount}
                      onChange={(e) => setAdjustForm({ ...adjustForm, physicalCount: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reason</label>
                    <select
                      required
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Select reason</option>
                      <option value="Physical Count">Physical Count</option>
                      <option value="Damaged Goods">Damaged Goods</option>
                      <option value="Theft">Theft</option>
                      <option value="Expired">Expired</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Note</label>
                    <textarea
                      value={adjustForm.note}
                      onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows="3"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
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
    </div>
  );
}