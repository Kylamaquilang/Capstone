'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import API from '@/lib/axios';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';
import ActionMenu from '@/components/common/ActionMenu';
import { CubeIcon } from '@heroicons/react/24/outline';
import { getImageUrl } from '@/utils/imageUtils';

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
      setError(''); // Clear any previous errors
      
      console.log('Fetching dynamic inventory data...');
      
      // Always try to get real products data first
      let allProducts = [];
      let productsWithSizes = [];
      let lowStockProducts = [];
      let categoryStats = [];
      
      // Step 1: Get all products (primary data source)
      try {
        console.log('Fetching all products...');
        const productsRes = await API.get('/products');
        allProducts = productsRes.data || [];
        
        if (allProducts.length === 0) {
          console.log('No products found in database');
          setInventoryData({
            summary: {
              total_products: 0,
              total_stock: 0,
              low_stock_count: 0,
              out_of_stock_count: 0,
              total_inventory_value: 0
            },
            categoryStats: [],
            lowStockProducts: []
          });
          setError('No products found. Add some products to see inventory data.');
          return;
        }
        
        console.log(`Found ${allProducts.length} products`);
      } catch (productsErr) {
        console.error('Failed to fetch products:', productsErr.message);
        throw productsErr; // Re-throw to trigger fallback
      }
      
      // Step 2: Try to get detailed product data with sizes
      try {
        console.log('Fetching detailed product data with sizes...');
        const detailedRes = await API.get('/products/detailed');
        const detailedProducts = detailedRes.data || [];
        
        if (Array.isArray(detailedProducts) && detailedProducts.length > 0) {
          // Fetch individual product details to get accurate sizes
          productsWithSizes = await Promise.all(
            detailedProducts.map(async (product) => {
              try {
                const { data: productDetail } = await API.get(`/products/${product.id}`);
                return {
                  ...product,
                  sizes: productDetail.sizes || []
                };
              } catch (err) {
                return {
                  ...product,
                  sizes: []
                };
              }
            })
          );
          console.log(`Enhanced ${productsWithSizes.length} products with size data`);
        } else {
          // Use basic products data
          productsWithSizes = allProducts.map(product => ({
            ...product,
            sizes: []
          }));
          console.log('Using basic product data (no size details available)');
        }
      } catch (detailedErr) {
        console.log('Detailed products API failed, using basic product data:', detailedErr.message);
        productsWithSizes = allProducts.map(product => ({
          ...product,
          sizes: []
        }));
      }
      
      // Step 3: Calculate dynamic inventory statistics
      console.log('Calculating dynamic inventory statistics...');
      
      // Calculate summary statistics
      const totalProducts = productsWithSizes.length;
      const totalStock = productsWithSizes.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
      const totalValue = productsWithSizes.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.price) || 0), 0);
      const lowStockCount = productsWithSizes.filter(p => (Number(p.stock) || 0) <= 5).length;
      const outOfStockCount = productsWithSizes.filter(p => (Number(p.stock) || 0) === 0).length;
      
      const summaryData = {
        total_products: totalProducts,
        total_stock: totalStock,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
        total_inventory_value: totalValue
      };
      
      // Calculate category statistics dynamically
      const categoryMap = new Map();
      
      console.log('Processing products for category breakdown:', productsWithSizes.length);
      
      productsWithSizes.forEach((product, index) => {
        console.log(`Product ${index + 1}:`, {
          name: product.name,
          category_name: product.category_name,
          category: product.category,
          category_id: product.category_id,
          stock: product.stock,
          price: product.price
        });
        
        // Use category name directly
        const category = product.category_name || product.category || 'Uncategorized';
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            category: category,
            product_count: 0,
            total_stock: 0,
            total_value: 0,
            price_sum: 0,
            avg_price: 0
          });
        }
        
        const categoryData = categoryMap.get(category);
        categoryData.product_count += 1;
        categoryData.total_stock += Number(product.stock) || 0;
        categoryData.total_value += (Number(product.stock) || 0) * (Number(product.price) || 0);
        categoryData.price_sum += Number(product.price) || 0;
      });
      
      console.log('Category map after processing:', Array.from(categoryMap.entries()));
      
      // Calculate average prices (simple average of product prices)
      categoryMap.forEach(categoryData => {
        categoryData.avg_price = categoryData.product_count > 0 
          ? categoryData.price_sum / categoryData.product_count 
          : 0;
      });
      
      categoryStats = Array.from(categoryMap.values());
      
      console.log('Final category statistics:', categoryStats);
      
      // Ensure we have at least one category entry
      if (categoryStats.length === 0) {
        console.log('No categories found, creating default category');
        categoryStats = [{
          category: 'All Products',
          product_count: productsWithSizes.length,
          total_stock: productsWithSizes.reduce((sum, p) => sum + (Number(p.stock) || 0), 0),
          total_value: productsWithSizes.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.price) || 0), 0),
          price_sum: productsWithSizes.reduce((sum, p) => sum + (Number(p.price) || 0), 0),
          avg_price: productsWithSizes.length > 0 
            ? productsWithSizes.reduce((sum, p) => sum + (Number(p.price) || 0), 0) / productsWithSizes.length 
            : 0
        }];
      }
      
      // Force create test categories if still empty (for debugging)
      if (categoryStats.length === 0) {
        console.log('Creating test categories for debugging');
        categoryStats = [
          {
            category: 'Test Category 1',
            product_count: 2,
            total_stock: 10,
            total_value: 2000,
            price_sum: 1000,
            avg_price: 500
          },
          {
            category: 'Test Category 2',
            product_count: 1,
            total_stock: 5,
            total_value: 1000,
            price_sum: 1000,
            avg_price: 1000
          }
        ];
      }
      
      console.log('Final category statistics after fallback:', categoryStats);
      
      // Step 4: Identify low stock products (size-based if available)
      const lowStockThreshold = 5;
      lowStockProducts = productsWithSizes.filter(product => {
        // Check if any size has low stock
        if (product.sizes && product.sizes.length > 0) {
          return product.sizes.some(size => Number(size.stock) <= lowStockThreshold);
        }
        // Fallback to base stock if no sizes
        return Number(product.stock) <= lowStockThreshold;
      });
      
      console.log(`Found ${lowStockProducts.length} products with low stock`);
      
      // Step 5: Set the dynamic inventory data
      setInventoryData({
        summary: summaryData,
        categoryStats: categoryStats,
        lowStockProducts: lowStockProducts
      });
      
      console.log('Dynamic inventory data loaded successfully');
      
    } catch (err) {
      console.error('Failed to load dynamic inventory data:', err);
      
      // Final fallback to sample data only if all APIs fail
      console.log('Using sample data as fallback...');
      
      const sampleProducts = [
        {
          id: 1,
          name: 'Sample Polo Shirt',
          price: 299.99,
          stock: 2,
          category_name: 'Shirts',
          image: null,
          sizes: [
            { size: 'S', stock: 0 },
            { size: 'M', stock: 1 },
            { size: 'L', stock: 1 }
          ]
        },
        {
          id: 2,
          name: 'Sample T-Shirt',
          price: 199.99,
          stock: 8,
          category_name: 'Shirts',
          image: null,
          sizes: [
            { size: 'S', stock: 3 },
            { size: 'M', stock: 3 },
            { size: 'L', stock: 2 }
          ]
        },
        {
          id: 3,
          name: 'Sample Jeans',
          price: 599.99,
          stock: 0,
          category_name: 'Pants',
          image: null,
          sizes: [
            { size: '30', stock: 0 },
            { size: '32', stock: 0 },
            { size: '34', stock: 0 }
          ]
        }
      ];
      
      const totalProducts = sampleProducts.length;
      const totalStock = sampleProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
      const totalValue = sampleProducts.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.price) || 0), 0);
      const lowStockCount = sampleProducts.filter(p => (Number(p.stock) || 0) <= 5).length;
      
      setInventoryData({
        summary: {
          total_products: totalProducts,
          total_stock: totalStock,
          low_stock_count: lowStockCount,
          out_of_stock_count: sampleProducts.filter(p => (Number(p.stock) || 0) === 0).length,
          total_inventory_value: totalValue
        },
        categoryStats: [
          {
            category: 'Shirts',
            product_count: 2,
            total_stock: 10,
            total_value: 1999.92,
            price_sum: 499.98,
            avg_price: 249.99
          },
          {
            category: 'Pants',
            product_count: 1,
            total_stock: 0,
            total_value: 0,
            price_sum: 599.99,
            avg_price: 599.99
          }
        ],
        lowStockProducts: sampleProducts.filter(p => (Number(p.stock) || 0) <= 5)
      });
      
      setError('Using sample data - API connection unavailable. Please check your server connection.');
    } finally {
      setLoading(false);
    }
  };

  const updateProductStock = async () => {
    if (!selectedProduct || !stockUpdate.stock || !stockUpdate.reason) return;
    
    try {
      await API.put(`/products/${selectedProduct.id}/stock`, stockUpdate);
      
      // Refresh dynamic inventory data
      console.log('Stock updated, refreshing inventory data...');
      await fetchInventoryData();
      
      // Close modal
      setShowStockModal(false);
      setSelectedProduct(null);
      setStockUpdate({ stock: '', reason: '', movement_type: 'adjustment' });
      
      alert('Stock updated successfully! Inventory data refreshed.');
    } catch (err) {
      console.error('Failed to update stock:', err);
      alert('Failed to update stock');
    }
  };

  const refreshInventory = async () => {
    console.log('Manual refresh triggered...');
    await fetchInventoryData();
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Auto-refresh for inventory
  useAdminAutoRefresh(fetchInventoryData, 'inventory');

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
      <div className="min-h-screen text-black admin-page">
        <Navbar />
        <div className="flex pt-16 lg:pt-20"> {/* Add padding-top for fixed navbar */}
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
      <div className="flex pt-16 lg:pt-20"> {/* Add padding-top for fixed navbar */}
        <Sidebar />
        <div className="flex-1 bg-gray-50 p-2 sm:p-3 overflow-auto lg:ml-64">
           {/* Header */}
           <div className="mb-4 sm:mb-6">
             <div className="flex justify-between items-center">
               <div>
                 <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">Inventory</h1>
                 <p className="text-gray-600 text-sm">Monitor stock levels and manage inventory</p>
               </div>
               <button
                 onClick={refreshInventory}
                 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
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

           {/* Tables Container */}
           <div className="space-y-6">
             {/* Category Statistics Container */}
             <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
               <div className="p-4 border-b border-gray-200">
                 <h3 className="text-xs font-semibold text-gray-900">Category Breakdown</h3>
               </div>
               <div className="p-4">
                 {inventoryData.categoryStats && inventoryData.categoryStats.length > 0 ? (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                     <thead className="bg-gray-100">
                       <tr>
                         <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Category</th>
                         <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Products</th>
                         <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Total Stock</th>
                         <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Avg Price</th>
                         <th className="px-4 py-3 text-xs font-medium text-gray-700">Total Value</th>
                       </tr>
                     </thead>
                     <tbody>
                       {inventoryData.categoryStats.map((category, index) => {
                         const categoryName = category.category || category.name || `Category ${index + 1}`;
                         
                         return (
                           <tr key={`category-${index}`} className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                             index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                           }`}>
                             <td className="px-4 py-3 border-r border-gray-100">
                               <span className="text-xs font-medium text-gray-900">
                                 {categoryName}
                               </span>
                             </td>
                             <td className="px-4 py-3 border-r border-gray-100">
                               <span className="text-xs text-gray-900">{category.product_count || 0}</span>
                             </td>
                             <td className="px-4 py-3 border-r border-gray-100">
                               <span className="text-xs text-gray-900">{category.total_stock || 0}</span>
                             </td>
                             <td className="px-4 py-3 border-r border-gray-100">
                               <span className="text-xs font-medium text-green-600">
                                 {formatCurrency(category.avg_price || 0)}
                               </span>
                             </td>
                             <td className="px-4 py-3">
                               <span className="text-xs font-medium text-blue-600">
                                 {formatCurrency(category.total_value || 0)}
                               </span>
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                     </table>
                   </div>
                 ) : (
                   <div className="text-center py-6 text-gray-500">
                     <div className="text-gray-300 text-2xl mb-2">📊</div>
                     <p className="text-xs">No category data available</p>
                     <p className="text-xs text-gray-400 mt-1">Add products with categories to see breakdown</p>
                   </div>
                 )}
               </div>
             </div>

             {/* Low Stock Alerts Container */}
             <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
               <div className="p-4 border-b border-gray-200">
                 <div className="flex justify-between items-center">
                   <h3 className="text-xs font-semibold text-gray-900">
                     Low Stock Alerts {inventoryData.lowStockProducts.length > 0 && inventoryData.lowStockProducts[0].sizes && inventoryData.lowStockProducts[0].sizes.length > 0 ? '(Size-Based)' : '(Basic)'}
                   </h3>
                   <span className="text-xs text-gray-500">
                     Threshold: 5 units {inventoryData.lowStockProducts.length > 0 && inventoryData.lowStockProducts[0].sizes && inventoryData.lowStockProducts[0].sizes.length > 0 ? 'per size' : 'per product'}
                   </span>
                 </div>
               </div>
               <div className="p-4">
                 {inventoryData.lowStockProducts.length > 0 ? (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                     <thead className="bg-blue-100">
                       <tr>
                         <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Product</th>
                         <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Category</th>
                         <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Low Stock Sizes</th>
                         <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Status</th>
                         <th className="px-4 py-3 text-xs font-medium text-gray-700">Actions</th>
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
                                 src={getImageUrl(product.image)} 
                                 alt={product.name}
                                 className="w-8 h-8 rounded object-cover mr-2"
                                 onError={(e) => {
                                   e.target.src = '/images/polo.png';
                                 }}
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
                             <div className="space-y-1">
                               {product.sizes && product.sizes.length > 0 ? (
                                 product.sizes
                                   .filter(size => Number(size.stock) <= 5)
                                   .map((size, idx) => (
                                     <div key={idx} className="flex items-center gap-2">
                                       <span className="text-xs font-medium text-gray-700">{size.size}:</span>
                                       <span className={`text-xs font-semibold ${
                                         Number(size.stock) === 0 ? 'text-red-600' : 'text-yellow-600'
                                       }`}>
                                         {size.stock}
                                       </span>
                                     </div>
                                   ))
                               ) : (
                                 <span className={`text-xs font-semibold ${
                                   Number(product.stock) === 0 ? 'text-red-600' : 'text-yellow-600'
                                 }`}>
                                   Base Stock: {product.stock}
                                 </span>
                               )}
                             </div>
                           </td>
                           <td className="px-4 py-3 border-r border-gray-100">
                             <div className="space-y-1">
                               {product.sizes && product.sizes.length > 0 ? (
                                 product.sizes
                                   .filter(size => Number(size.stock) <= 5)
                                   .map((size, idx) => (
                                     <span key={idx} className={`px-2 py-0.5 rounded text-xs font-medium ${
                                       Number(size.stock) === 0 
                                         ? 'bg-red-100 text-red-800' 
                                         : 'bg-yellow-100 text-yellow-800'
                                     }`}>
                                       {Number(size.stock) === 0 ? 'Out of Stock' : 'Low Stock'}
                                     </span>
                                   ))
                               ) : (
                                 <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                   Number(product.stock) === 0 
                                     ? 'bg-red-100 text-red-800' 
                                     : 'bg-yellow-100 text-yellow-800'
                                 }`}>
                                   {Number(product.stock) === 0 ? 'Out of Stock' : 'Low Stock'}
                                 </span>
                               )}
                             </div>
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
                     <p className="text-xs">All product sizes have sufficient stock!</p>
                   </div>
                 )}
               </div>
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








