'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminSalesPage() {
  const [salesData, setSalesData] = useState({
    salesData: [],
    topProducts: [],
    paymentBreakdown: [],
    inventorySummary: [],
    salesLogsSummary: {},
    summary: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState('day');

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        group_by: groupBy
      });
      
      const { data } = await API.get(`/orders/sales-performance/public?${params}`);
      
      // Ensure data structure is properly set
      setSalesData({
        salesData: data.salesData || [],
        topProducts: data.topProducts || [],
        paymentBreakdown: data.paymentBreakdown || [],
        inventorySummary: data.inventorySummary || [],
        salesLogsSummary: data.salesLogsSummary || {},
        summary: data.summary || {}
      });
    } catch (err) {
      console.error('Sales data error:', err);
      
      // Handle different types of errors
      if (err.response?.status === 404) {
        setError('Sales performance endpoint not found. Please check if the API server is running.');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Authentication required. Please log in as admin to view sales data.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to load sales data. Please check your connection.');
      }
      
      // Set empty data structure to prevent crashes
      setSalesData({
        salesData: [],
        topProducts: [],
        paymentBreakdown: [],
        inventorySummary: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [dateRange, groupBy]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (groupBy === 'month') {
      return new Date(dateStr + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } else if (groupBy === 'year') {
      return dateStr;
    }
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Prepare chart data
  const chartData = {
    labels: salesData.salesData?.map(item => formatDate(item.period)) || [],
    datasets: [
      {
        label: 'Revenue',
        data: salesData.salesData?.map(item => item.revenue) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Orders',
        data: salesData.salesData?.map(item => item.orders) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: false,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Sales Performance Trend',
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Revenue (PHP)',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Number of Orders',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className="flex flex-col min-h-screen text-black admin-page">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-gray-50 p-6 overflow-auto lg:ml-0 ml-0">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Sales</h1>
            <p className="text-gray-600 text-sm">Comprehensive sales performance and reporting</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Group By</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="day">Daily</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
              
              <button
                onClick={fetchSalesData}
                className="px-4 py-2 bg-[#000C50] text-white rounded-md hover:bg-blue-800 text-sm font-medium"
              >
                Refresh Data
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#000C50] mx-auto mb-4"></div>
              <div className="text-sm text-gray-600">Loading sales data...</div>
            </div>
          ) : (
            <>
              {/* Sales Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 h-25">
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-50 rounded-md mt-2 ml-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Total Orders</p>
                      <p className="text-lg font-bold text-blue-700">
                        {salesData.summary?.total_orders || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-50 rounded-md mt-2 ml-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Total Revenue</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(salesData.summary?.total_revenue || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-50 rounded-md mt-2 ml-4">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600">Avg Order Value</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatCurrency(salesData.summary?.avg_order_value || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-50 rounded-md mt-2 ml-4">
                      <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-600">Growth</p>
                      <p className="text-lg font-bold text-yellow-600">
                        {salesData.salesData && salesData.salesData.length > 1 && salesData.salesData[1].revenue > 0 ? 
                          `${Math.round(((salesData.salesData[0].revenue - salesData.salesData[1].revenue) / salesData.salesData[1].revenue) * 100)}%` : 
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Tracking Section */}
              <div className="mb-6">
                <h2 className="text-md font-semibold text-gray-900 mb-3">Sales Tracking</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-xs font-medium text-gray-600">Completed Sales</p>
                        <p className="text-lg font-bold text-green-600">
                          {salesData.salesLogsSummary?.completed_sales || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-xs font-medium text-gray-600">Sales Revenue</p>
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(salesData.salesLogsSummary?.completed_revenue || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-xs font-medium text-gray-600">Reversed Sales</p>
                        <p className="text-lg font-bold text-red-600">
                          {salesData.salesLogsSummary?.reversed_sales || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-xs font-medium text-gray-600">Total Sales Logs</p>
                        <p className="text-lg font-bold text-purple-600">
                          {salesData.salesLogsSummary?.total_sales_logs || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Chart */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-md mb-6 flex align-center">
                <div className="p-4">
                  <h3 className="text-md font-semibold text-gray-900">Sales Trend</h3>
                </div>
                <div className="p-4">
                {salesData.salesData && salesData.salesData.length > 0 ? (
                  <div className="h-80">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <div className="text-gray-300 text-2xl mb-2">📈</div>
                    <p className="text-xs">No sales data available for the selected period</p>
                  </div>
                )}
                </div>
              </div>

              {/* Sales Data Table */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
                <div className="p-4">
                  <h3 className="text-md font-semibold text-gray-900">Detailed Sales Data</h3>
                </div>
                <div className="p-4">
                  {salesData.salesData && salesData.salesData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="px-4 py-3 text-sm font-medium text-black-700 border-r border-gray-200">Period</th>
                          <th className="px-4 py-3 text-sm font-medium text-black-700 border-r border-gray-200">Orders</th>
                          <th className="px-4 py-3 text-sm font-medium text-black-700 border-r border-gray-200">Revenue</th>
                          <th className="px-4 py-3 text-sm font-medium text-black-700">Avg Order</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.salesData.map((item, index) => (
                          <tr key={index} className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}>
                            <td className="px-4 py-3 border-r border-gray-100">
                              <span className="text-xs font-medium text-gray-900">{formatDate(item.period)}</span>
                            </td>
                            <td className="px-4 py-3 border-r border-gray-100">
                              <span className="text-xs text-gray-900">{item.orders}</span>
                            </td>
                            <td className="px-4 py-3 border-r border-gray-100">
                              <span className="text-xs font-medium text-green-600">
                                {formatCurrency(item.revenue)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-gray-900">{formatCurrency(item.avg_order_value)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <div className="text-gray-300 text-2xl mb-2">📊</div>
                      <p className="text-xs">No sales data available for the selected period</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Breakdown */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-md mb-6">
                <div className="p-4">
                  <h3 className="text-md font-semibold text-gray-900">Payment Method Breakdown</h3>
                </div>
                <div className="p-4">
                {salesData.paymentBreakdown && salesData.paymentBreakdown.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {salesData.paymentBreakdown.map((payment, index) => (
                      <div key={index} className="border border-gray-200 shadow-md rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-medium text-gray-900 capitalize">
                            {payment.payment_method === 'gcash' ? 'GCash' : 'Cash Payment'}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            payment.payment_method === 'gcash' 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'bg-green-50 text-green-700'
                          }`}>
                            {payment.payment_method === 'gcash' ? 'Online' : 'Counter'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Orders:</span>
                            <span className="font-medium">{payment.order_count}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Revenue:</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(payment.total_revenue)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Avg Order:</span>
                            <span className="font-medium">
                              {formatCurrency(payment.avg_order_value)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <div className="text-gray-300 text-2xl mb-2">💳</div>
                    <p className="text-xs">No payment data available</p>
                  </div>
                )}
                </div>
              </div>

              {/* Inventory Movement Summary */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-md mb-6">
                <div className="p-4">
                  <h3 className="text-md font-semibold text-gray-900">Inventory Movement Summary</h3>
                </div>
                <div className="p-4">
                  {salesData.inventorySummary && salesData.inventorySummary.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-200">Movement Type</th>
                          <th className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-200">Count</th>
                          <th className="px-4 py-3 text-sm font-medium text-gray-700 border-r border-gray-200">Total Quantity</th>
                          <th className="px-4 py-3 text-sm font-medium text-gray-700">Products Affected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.inventorySummary.map((movement, index) => (
                          <tr key={index} className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}>
                            <td className="px-4 py-3 border-r border-gray-100">
                              <span className="text-xs font-medium text-gray-900 capitalize">{movement.movement_type}</span>
                            </td>
                            <td className="px-4 py-3 border-r border-gray-100">
                              <span className="text-xs text-gray-900">{movement.movement_count}</span>
                            </td>
                            <td className="px-4 py-3 border-r border-gray-100">
                              <span className="text-xs text-gray-900">{movement.total_quantity}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-gray-900">{movement.products_affected}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <div className="text-gray-300 text-2xl mb-2">📦</div>
                      <p className="text-xs">No inventory movement data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders Summary */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
                <div className="p-4">
                  <h3 className="text-md font-semibold text-gray-900">Recent Orders Summary</h3>
                  <div className="text-xs text-gray-600 mt-1">
                    Showing orders from {formatDate(dateRange.start_date)} to {formatDate(dateRange.end_date)}
                  </div>
                </div>
                <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="border border-gray-200 rounded-md p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-medium text-gray-900">Total Orders</h4>
                      <span className="text-lg font-bold text-blue-600">{salesData.summary?.total_orders || 0}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Average order value: {formatCurrency(salesData.summary?.avg_order_value || 0)}
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-md p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-medium text-gray-900">Total Revenue</h4>
                      <span className="text-lg font-bold text-green-600">{formatCurrency(salesData.summary?.total_revenue || 0)}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      From {salesData.summary?.total_orders || 0} orders
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-md p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-medium text-gray-900">Growth Rate</h4>
                      <span className="text-lg font-bold text-purple-600">
                        {salesData.salesData && salesData.salesData.length > 1 && salesData.salesData[1].revenue > 0 ? 
                          `${Math.round(((salesData.salesData[0].revenue - salesData.salesData[1].revenue) / salesData.salesData[1].revenue) * 100)}%` : 
                          'N/A'
                        }
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Compared to previous period
                    </div>
                  </div>
                </div>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-md font-semibold text-gray-900">Top Performing Products</h3>
                </div>
                <div className="p-4">
                {salesData.topProducts && salesData.topProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {salesData.topProducts.map((product, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-3">
                        <div className="flex items-center mb-2">
                          <img 
                            src={product.product_image || '/images/polo.png'} 
                            alt={product.product_name}
                            className="w-10 h-10 rounded object-cover mr-2"
                          />
                          <div>
                            <h4 className="text-xs font-medium text-gray-900">{product.product_name}</h4>
                            <p className="text-xs text-gray-500">#{index + 1} Top Seller</p>
                            {product.category_name && (
                              <p className="text-xs text-gray-400">{product.category_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Units Sold:</span>
                            <span className="font-medium">{product.total_sold}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Revenue:</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(product.total_revenue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <div className="text-gray-300 text-2xl mb-2">🏆</div>
                    <p className="text-xs">No product performance data available</p>
                  </div>
                )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


