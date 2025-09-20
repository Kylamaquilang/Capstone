'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import API from '@/lib/axios';
import ActionMenu from '@/components/common/ActionMenu';
import { CubeIcon } from '@heroicons/react/24/outline';

export default function AdminInventoryPage() {
  const [inventoryData, setInventoryData] = useState({
    summary: {},
    categoryStats: [],
    lowStockProducts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockUpdate, setStockUpdate] = useState({
    stock: '',
    reason: '',
    movement_type: 'adjustment'
  });

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      
      // Fetch inventory summary
      const summaryRes = await API.get('/products/inventory/summary');
      
      // Fetch low stock products
      const lowStockRes = await API.get('/products/low-stock');

      setInventoryData({
        summary: summaryRes.data.summary || summaryRes.data,
        categoryStats: summaryRes.data.categoryStats || [],
        lowStockProducts: lowStockRes.data.products || []
      });
    } catch (err) {
      console.error('Inventory error:', err);
      
      // If authentication fails, try to get basic product data
      if (err.response?.status === 401 || err.response?.status === 403) {
        try {
          console.log('Authentication failed, trying basic product data...');
          const productsRes = await API.get('/products');
          const products = productsRes.data || [];
          
          // Calculate basic stats from products
          const totalProducts = products.length;
          const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
          const totalValue = products.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.price) || 0), 0);
          const lowStockCount = products.filter(p => (Number(p.stock) || 0) <= 5).length;
          
          setInventoryData({
            summary: {
              total_products: totalProducts,
              total_stock: totalStock,
              low_stock_count: lowStockCount,
              out_of_stock_count: products.filter(p => (Number(p.stock) || 0) === 0).length,
              total_inventory_value: totalValue
            },
            categoryStats: [],
            lowStockProducts: products.filter(p => (Number(p.stock) || 0) <= 5)
          });
          
          setError('Limited data available - please log in as admin for full features');
        } catch (fallbackErr) {
          setError('Failed to load inventory data. Please check your connection and try again.');
        }
      } else {
        setError('Failed to load inventory data. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateProductStock = async () => {
    if (!selectedProduct || !stockUpdate.stock || !stockUpdate.reason) return;
    
    try {
      await API.put(`/products/${selectedProduct.id}/stock`, stockUpdate);
      
      // Refresh data
      fetchInventoryData();
      
      // Close modal
      setShowStockModal(false);
      setSelectedProduct(null);
      setStockUpdate({ stock: '', reason: '', movement_type: 'adjustment' });
      
      alert('Stock updated successfully!');
    } catch (err) {
      alert('Failed to update stock');
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const getStockStatusColor = (stock, threshold = 5) => {
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock <= threshold) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStockStatusText = (stock, threshold = 5) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= threshold) return 'Low Stock';
    return 'In Stock';
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen text-black admin-page">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center bg-gray-50">
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
    <div className="flex flex-col min-h-screen text-black admin-page">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-gray-50 p-3 sm:p-6 overflow-auto lg:ml-0 ml-0">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-3xl font-semibold text-black-900">Inventory</h1>
            <p className="text-gray-600 text-sm">Monitor stock levels and manage inventory</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Inventory Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-md mt-2 ml-4">
                  <svg className="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-blue-600">Total Products</p>
                  <p className="text-base sm:text-lg font-bold text-blue-700">
                    {inventoryData.summary.total_products || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 rounded-md mt-2 ml-4">
                  <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-14 0h14" />
                  </svg>
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-green-600">Total Stock</p>
                  <p className="text-base sm:text-lg font-bold text-green-700">
                    {inventoryData.summary.total_stock || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-50 rounded-md mt-2 ml-4">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-yellow-600">Low Stock</p>
                  <p className="text-base sm:text-lg font-bold text-yellow-700">
                    {inventoryData.summary.low_stock_count || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-purple-50 rounded-md mt-2 ml-4">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm font-medium text-purple-600">Inventory Value</p>
                  <p className="text-base sm:text-lg font-bold text-purple-700">
                    {formatCurrency(inventoryData.summary.total_inventory_value || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Statistics */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Category Breakdown</h3>
            </div>
            <div className="p-4">
              {inventoryData.categoryStats && inventoryData.categoryStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium text-black-700 border-r border-gray-200">Category</th>
                      <th className="px-4 py-3 text-sm font-medium text-black-700 border-r border-gray-200">Products</th>
                      <th className="px-4 py-3 text-sm font-medium text-black-700 border-r border-gray-200">Total Stock</th>
                      <th className="px-4 py-3 text-sm font-medium text-black-700">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.categoryStats.map((category, index) => (
                      <tr key={index} className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <span className="text-xs font-medium text-gray-900">{category.category || 'Uncategorized'}</span>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <span className="text-xs text-gray-900">{category.product_count}</span>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <span className="text-xs text-gray-900">{category.total_stock}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-green-600">
                            {formatCurrency(category.avg_price || 0)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-gray-300 text-2xl mb-2">📊</div>
                  <p className="text-xs">No category data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-900">Low Stock Alerts</h3>
                <span className="text-xs text-gray-500">
                  Threshold: {inventoryData.summary.lowStockThreshold || 5} units
                </span>
              </div>
            </div>
            <div className="p-4">
              {inventoryData.lowStockProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-200">Product</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-200">Category</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-200">Current Stock</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-200">Status</th>
                      <th className="px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.lowStockProducts.map((product, index) => (
                      <tr key={product.id} className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <div className="flex items-center">
                            <img 
                              src={product.image || '/images/polo.png'} 
                              alt={product.name}
                              className="w-8 h-8 rounded object-cover mr-2"
                            />
                            <div>
                              <div className="text-xs font-medium text-gray-900">{product.name}</div>
                              <div className="text-xs text-gray-500">₱{Number(product.price || 0).toFixed(2)}</div>
                              {product.category_name && (
                                <div className="text-xs text-gray-400">{product.category_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <span className="text-xs text-gray-600">{product.category_name || 'N/A'}</span>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <span className={`text-xs font-semibold ${
                            product.stock === 0 ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            getStockStatusColor(product.stock)
                          }`}>
                            {getStockStatusText(product.stock)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ActionMenu
                            actions={[
                              {
                                label: 'Restock Product',
                                icon: CubeIcon,
                                onClick: () => {
                                  setSelectedProduct(product);
                                  setStockUpdate({ stock: '', reason: '', movement_type: 'purchase' });
                                  setShowStockModal(true);
                                }
                              }
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-gray-300 text-2xl mb-2">✅</div>
                  <p className="text-xs">All products have sufficient stock!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Update Modal */}
      {showStockModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Update Stock for {selectedProduct.name}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Movement Type
              </label>
              <select
                value={stockUpdate.movement_type}
                onChange={(e) => setStockUpdate({ ...stockUpdate, movement_type: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="purchase">Purchase/Stock In</option>
                <option value="adjustment">Adjustment</option>
                <option value="return">Return</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity Change
              </label>
              <input
                type="number"
                value={stockUpdate.stock}
                onChange={(e) => setStockUpdate({ ...stockUpdate, stock: e.target.value })}
                placeholder="Enter quantity (use negative for reduction)"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Current stock: {selectedProduct.stock}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason
              </label>
              <textarea
                value={stockUpdate.reason}
                onChange={(e) => setStockUpdate({ ...stockUpdate, reason: e.target.value })}
                placeholder="Explain the reason for this stock change..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowStockModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={updateProductStock}
                disabled={!stockUpdate.stock || !stockUpdate.reason}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}








