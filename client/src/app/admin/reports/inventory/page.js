'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import API from '@/lib/axios';
import { 
  CubeIcon, 
  MagnifyingGlassIcon,
  CalendarIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function InventoryReportsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState('current-inventory');
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    productId: '',
    categoryId: '',
    actionType: ''
  });
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Fetch products and categories for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          API.get('/products'),
          API.get('/categories')
        ]);
        
        setProducts(productsRes.data || []);
        setCategories(categoriesRes.data || []);
      } catch (err) {
        console.error('Failed to fetch filter data:', err);
      }
    };

    fetchFilterData();
  }, []);

  // Generate report
  const generateReport = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      
      // Add filters
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.productId) params.append('productId', filters.productId);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.actionType) params.append('actionType', filters.actionType);

      const response = await API.get(`/stock-movements/reports/${reportType}?${params}`);
      // Extract the data array based on report type
      if (reportType === 'current-inventory' && response.data.inventory) {
        setReportData(response.data.inventory);
      } else if (reportType === 'restock' && response.data.restocks) {
        setReportData(response.data.restocks);
      } else if (reportType === 'sales-usage' && response.data.sales) {
        setReportData(response.data.sales);
      } else if (reportType === 'low-stock-alert' && response.data.products) {
        setReportData(response.data.products);
      } else {
        setReportData(response.data);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      productId: '',
      categoryId: '',
      actionType: ''
    });
    setReportData(null);
  };

  // Export report
  const exportReport = () => {
    if (!reportData) return;
    
    const reportName = getReportName(reportType);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${reportName}_${timestamp}.json`;
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = filename;
    link.click();
  };

  // Get report name
  const getReportName = (type) => {
    switch (type) {
      case 'current-inventory':
        return 'Current_Inventory_Report';
      case 'restock':
        return 'Restock_Report';
      case 'sales-usage':
        return 'Sales_Usage_Report';
      case 'low-stock-alert':
        return 'Low_Stock_Alert_Report';
      default:
        return 'Inventory_Report';
    }
  };

  // Get report title
  const getReportTitle = (type) => {
    switch (type) {
      case 'current-inventory':
        return 'Current Inventory Report';
      case 'restock':
        return 'Restock Report';
      case 'sales-usage':
        return 'Sales/Usage Report';
      case 'low-stock-alert':
        return 'Low Stock Alert Report';
      default:
        return 'Inventory Report';
    }
  };

  // Get report description
  const getReportDescription = (type) => {
    switch (type) {
      case 'current-inventory':
        return 'Shows all products and their current stock levels';
      case 'restock':
        return 'Shows all restock history and incoming inventory';
      case 'sales-usage':
        return 'Shows all deductions including sales, issues, and damages';
      case 'low-stock-alert':
        return 'Highlights products below reorder point';
      default:
        return 'Inventory report';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="flex">
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inventory Reports</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Generate and export inventory reports
                </p>
              </div>
            </div>
          </div>

          {/* Report Type Selection */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { id: 'current-inventory', title: 'Current Inventory', icon: ChartBarIcon },
                { id: 'restock', title: 'Restock Report', icon: CheckCircleIcon },
                { id: 'sales-usage', title: 'Sales/Usage Report', icon: CubeIcon },
                { id: 'low-stock-alert', title: 'Low Stock Alert', icon: ExclamationTriangleIcon }
              ].map((report) => (
                <button
                  key={report.id}
                  onClick={() => setReportType(report.id)}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    reportType === report.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <report.icon className="h-6 w-6" />
                    <div>
                      <div className="font-medium">{report.title}</div>
                      <div className="text-xs text-gray-500">
                        {getReportDescription(report.id)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-2 mb-4">
              <FunnelIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Report Filters</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Product Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={filters.productId}
                  onChange={(e) => handleFilterChange('productId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All Products</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.categoryId}
                  onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Action Type</label>
                <select
                  value={filters.actionType}
                  onChange={(e) => handleFilterChange('actionType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">All Actions</option>
                  <option value="stock_in">Restock</option>
                  <option value="stock_out">Deduct</option>
                  <option value="stock_adjustment">Adjust</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 mt-4">
              <button
                onClick={generateReport}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
              
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Clear Filters
              </button>
              
              {reportData && (
                <button
                  onClick={exportReport}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex items-center space-x-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  <span>Export</span>
                </button>
              )}
            </div>
          </div>

          {/* Report Content */}
          <div className="flex-1 p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating report...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CubeIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">{error}</p>
                  <button
                    onClick={generateReport}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : reportData ? (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                {/* Report Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {getReportTitle(reportType)}
                      </h2>
                      <p className="text-sm text-gray-600">
                        Generated on {new Date().toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {reportData.length || 0} records
                    </div>
                  </div>
                </div>

                {/* Report Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        {reportType === 'current-inventory' && (
                          <>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Product</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Category</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Size</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Base Stock</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Current Stock</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Status</th>
                          </>
                        )}
                        {reportType === 'restock' && (
                          <>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Date</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Product</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Size</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Quantity</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Performed By</th>
                          </>
                        )}
                        {reportType === 'sales-usage' && (
                          <>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Date</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Product</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Size</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Quantity</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Reason</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Performed By</th>
                          </>
                        )}
                        {reportType === 'low-stock-alert' && (
                          <>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Product</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Category</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Current Stock</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Reorder Level</th>
                            <th className="px-4 py-3 text-xs font-medium text-gray-700">Status</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-gray-50 transition-colors border-b border-gray-100 bg-white">
                          {reportType === 'current-inventory' && (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-900 uppercase">{item.product_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 uppercase">{item.category_name || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 uppercase">{item.size || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.base_stock || 0}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.current_stock || 0}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  item.current_stock === 0 
                                    ? 'bg-red-100 text-red-800' 
                                    : item.current_stock <= 5
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {item.stock_status || (item.current_stock === 0 ? 'Out of Stock' : item.current_stock <= 5 ? 'Low Stock' : 'In Stock')}
                                </span>
                              </td>
                            </>
                          )}
                          {reportType === 'restock' && (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {new Date(item.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 uppercase">{item.product_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 uppercase">{item.size || 'Base'}</td>
                              <td className="px-4 py-3 text-sm text-green-600 font-medium">+{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.user_name || 'System'}</td>
                            </>
                          )}
                          {reportType === 'sales-usage' && (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {new Date(item.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 uppercase">{item.product_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 uppercase">{item.size || 'Base'}</td>
                              <td className="px-4 py-3 text-sm text-red-600 font-medium">-{Math.abs(item.quantity)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.reason || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.user_name || 'System'}</td>
                            </>
                          )}
                          {reportType === 'low-stock-alert' && (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-900 uppercase">{item.product_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 uppercase">{item.category_name || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.current_stock || 0}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.reorder_level || 5}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  item.current_stock === 0 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {item.alert_level || (item.current_stock === 0 ? 'Out of Stock' : 'Low Stock')}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Select a report type and generate to view data</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Use the filters above to customize your report
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
