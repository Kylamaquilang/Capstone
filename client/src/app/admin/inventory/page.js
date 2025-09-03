'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import API from '@/lib/axios';

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
        summary: summaryRes.data,
        categoryStats: summaryRes.data.categoryStats || [],
        lowStockProducts: lowStockRes.data.products || []
      });
    } catch (err) {
      setError('Failed to load inventory data');
      console.error('Inventory error:', err);
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
      <div className="flex flex-col h-screen text-black">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xl">Loading inventory data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen text-black">
      <Navbar />
      <div className="flex flex-1">
        <div className="w-64" style={{ height: 'calc(100vh - 64px)' }}>
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600">Monitor stock levels and manage inventory</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {/* Inventory Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {inventoryData.summary.total_products || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-14 0h14" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Stock</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {inventoryData.summary.total_stock || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {inventoryData.summary.low_stock_count || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(inventoryData.summary.total_inventory_value || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Statistics */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
            {inventoryData.categoryStats && inventoryData.categoryStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-600">Category</th>
                      <th className="px-4 py-2 text-left text-gray-600">Products</th>
                      <th className="px-4 py-2 text-left text-gray-600">Total Stock</th>
                      <th className="px-4 py-2 text-left text-gray-600">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.categoryStats.map((category, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{category.category || 'Uncategorized'}</td>
                        <td className="px-4 py-2">{category.product_count}</td>
                        <td className="px-4 py-2">{category.total_stock}</td>
                        <td className="px-4 py-2 text-green-600">
                          {formatCurrency(category.avg_price || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No category data available</p>
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
              <span className="text-sm text-gray-500">
                Threshold: {inventoryData.summary.lowStockThreshold || 5} units
              </span>
            </div>
            
            {inventoryData.lowStockProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-600">Product</th>
                      <th className="px-4 py-2 text-left text-gray-600">Category</th>
                      <th className="px-4 py-2 text-left text-gray-600">Current Stock</th>
                      <th className="px-4 py-2 text-left text-gray-600">Status</th>
                      <th className="px-4 py-2 text-left text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.lowStockProducts.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="flex items-center">
                            <img 
                              src={product.image || '/images/polo.png'} 
                              alt={product.name}
                              className="w-10 h-10 rounded object-cover mr-3"
                            />
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-gray-500">₱{product.price}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {product.category_name || 'N/A'}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`font-semibold ${
                            product.stock === 0 ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            getStockStatusColor(product.stock)
                          }`}>
                            {getStockStatusText(product.stock)}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setStockUpdate({ stock: '', reason: '', movement_type: 'purchase' });
                              setShowStockModal(true);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            Restock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>All products have sufficient stock!</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.location.href = '/admin/products'}
              className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="font-semibold">Manage Products</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/admin/products/add-product'}
              className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="font-semibold">Add New Product</p>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/admin/dashboard'}
              className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="font-semibold">View Dashboard</p>
              </div>
            </button>
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






