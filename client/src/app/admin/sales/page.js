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
    summary: {},
    dailyStats: [],
    topProducts: []
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
      const params = new URLSearchParams({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        group_by: groupBy
      });
      
      const { data } = await API.get(`/orders/sales-performance?${params}`);
      setSalesData(data);
    } catch (err) {
      setError('Failed to load sales data');
      console.error('Sales data error:', err);
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
    <div className="flex flex-col h-screen text-black">
      <Navbar />
      <div className="flex flex-1">
        <div className="w-64" style={{ height: 'calc(100vh - 64px)' }}>
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Sales Analytics</h1>
            <p className="text-gray-600">Comprehensive sales performance and reporting</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="day">Daily</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
              
              <button
                onClick={fetchSalesData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mt-6"
              >
                Refresh Data
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-xl text-gray-600">Loading sales data...</div>
            </div>
          ) : (
            <>
              {/* Sales Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {salesData.salesData?.reduce((sum, item) => sum + item.orders, 0) || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(salesData.salesData?.reduce((sum, item) => sum + item.revenue, 0) || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(
                          salesData.salesData?.reduce((sum, item) => sum + item.avg_order_value, 0) / 
                          (salesData.salesData?.length || 1)
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Growth</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {salesData.salesData && salesData.salesData.length > 1 ? 
                          `${Math.round(((salesData.salesData[0].revenue - salesData.salesData[1].revenue) / salesData.salesData[1].revenue) * 100)}%` : 
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Chart */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
                {salesData.salesData && salesData.salesData.length > 0 ? (
                  <div className="h-96">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No sales data available for the selected period</p>
                  </div>
                )}
              </div>

              {/* Sales Data Table */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Sales Data</h3>
                {salesData.salesData && salesData.salesData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-600">Period</th>
                          <th className="px-4 py-2 text-left text-gray-600">Orders</th>
                          <th className="px-4 py-2 text-left text-gray-600">Revenue</th>
                          <th className="px-4 py-2 text-left text-gray-600">Avg Order</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.salesData.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{formatDate(item.period)}</td>
                            <td className="px-4 py-2">{item.orders}</td>
                            <td className="px-4 py-2 text-green-600 font-semibold">
                              {formatCurrency(item.revenue)}
                            </td>
                            <td className="px-4 py-2">{formatCurrency(item.avg_order_value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No sales data available for the selected period</p>
                  </div>
                )}
              </div>

              {/* Top Products */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Products</h3>
                {salesData.topProducts && salesData.topProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {salesData.topProducts.map((product, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <img 
                            src={product.product_image || '/images/polo.png'} 
                            alt={product.product_name}
                            className="w-12 h-12 rounded object-cover mr-3"
                          />
                          <div>
                            <h4 className="font-medium text-gray-900">{product.product_name}</h4>
                            <p className="text-sm text-gray-500">#{index + 1} Top Seller</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Units Sold:</span>
                            <span className="font-semibold">{product.total_sold}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Revenue:</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(product.total_revenue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No product performance data available</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


