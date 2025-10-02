'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';
import { getImageUrl } from '@/utils/imageUtils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { 
  CurrencyDollarIcon, 
  ShoppingBagIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
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
    start_date: '',
    end_date: ''
  });
  const [groupBy, setGroupBy] = useState('day');

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        group_by: groupBy
      });
      
      // Only add date filters if they are provided
      if (dateRange.start_date) {
        params.append('start_date', dateRange.start_date);
      }
      if (dateRange.end_date) {
        params.append('end_date', dateRange.end_date);
      }
      
      console.log('📊 Sales fetch params:', { start_date: dateRange.start_date, end_date: dateRange.end_date, group_by: groupBy });
      
      // Try the main sales performance API first (connected to orders)
      try {
        console.log('Fetching sales performance data from orders...');
        const { data } = await API.get(`/orders/sales-performance/public?${params}`);
        
        console.log('📊 Sales performance API response:', data);
        
        // Ensure data structure is properly set
        setSalesData({
          salesData: data.salesData || [],
          topProducts: data.topProducts || [],
          paymentBreakdown: data.paymentBreakdown || [],
          inventorySummary: data.inventorySummary || [],
          salesLogsSummary: data.salesLogsSummary || {},
          summary: data.summary || {}
        });
        
        // Fetch profit analytics
        try {
          console.log('Fetching profit analytics...');
          const profitParams = new URLSearchParams();
          if (dateRange.start_date) profitParams.append('startDate', dateRange.start_date);
          if (dateRange.end_date) profitParams.append('endDate', dateRange.end_date);
          
          const { data: profitData } = await API.get(`/orders/sales-analytics?${profitParams}`);
          console.log('📊 Profit analytics response:', profitData);
          
          // Update sales data with profit information
          setSalesData(prev => ({
            ...prev,
            profitAnalytics: profitData
          }));
        } catch (profitError) {
          console.log('Profit analytics API failed:', profitError.message);
        }
        
        console.log('Sales performance data loaded successfully from orders');
        return;
      } catch (salesApiError) {
        console.log('Sales performance API failed:', salesApiError.message);
        
        // Fallback 1: Try basic orders API and calculate sales data
        try {
          console.log('Trying basic orders API to calculate sales data...');
          const ordersRes = await API.get('/orders/admin');
          const orders = ordersRes.data || [];
          
          console.log('📊 Raw orders data:', orders.length, 'orders found');
          
          if (Array.isArray(orders) && orders.length > 0) {
            // Filter orders by date range and status
            let filteredOrders = orders.filter(order => {
              const isNotCancelled = order.status !== 'cancelled';
              
              // If no date range is specified, return all non-cancelled orders
              if (!dateRange.start_date && !dateRange.end_date) {
                return isNotCancelled;
              }
              
              const orderDate = new Date(order.created_at);
              let isInDateRange = true;
              
              if (dateRange.start_date) {
                const startDate = new Date(dateRange.start_date);
                isInDateRange = isInDateRange && orderDate >= startDate;
              }
              
              if (dateRange.end_date) {
                const endDate = new Date(dateRange.end_date);
                endDate.setHours(23, 59, 59, 999); // Include the entire end date
                isInDateRange = isInDateRange && orderDate <= endDate;
              }
              
              console.log(`Order ${order.id}: ${order.created_at} - In range: ${isInDateRange}, Not cancelled: ${isNotCancelled}`);
              
              return isInDateRange && isNotCancelled;
            });
            
            console.log(`📊 Filtered orders: ${filteredOrders.length} orders in date range`);
            
            if (filteredOrders.length === 0 && (dateRange.start_date || dateRange.end_date)) {
              console.log('📊 No orders found in date range, trying without date filter...');
              // Try without date filter to see all orders
              const allNonCancelledOrders = orders.filter(order => order.status !== 'cancelled');
              console.log(`📊 All non-cancelled orders: ${allNonCancelledOrders.length}`);
              
              if (allNonCancelledOrders.length > 0) {
                // Use all non-cancelled orders
                const totalRevenue = allNonCancelledOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
                const totalOrders = allNonCancelledOrders.length;
                const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
                
                // Group by period based on groupBy setting
                const groupedData = {};
                allNonCancelledOrders.forEach(order => {
                  const orderDate = new Date(order.created_at);
                  let periodKey;
                  
                  if (groupBy === 'month') {
                    periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
                  } else if (groupBy === 'year') {
                    periodKey = orderDate.getFullYear().toString();
                  } else {
                    periodKey = orderDate.toISOString().split('T')[0];
                  }
                  
                  if (!groupedData[periodKey]) {
                    groupedData[periodKey] = {
                      period: periodKey,
                      orders: 0,
                      revenue: 0,
                      avg_order_value: 0
                    };
                  }
                  
                  groupedData[periodKey].orders += 1;
                  groupedData[periodKey].revenue += order.total_amount || 0;
                });
                
                // Calculate averages
                Object.values(groupedData).forEach(item => {
                  item.avg_order_value = item.orders > 0 ? item.revenue / item.orders : 0;
                });
                
                const salesDataArray = Object.values(groupedData).sort((a, b) => a.period.localeCompare(b.period));
                
                // Calculate payment breakdown from orders
                const paymentBreakdown = [
                  {
                    payment_method: 'gcash',
                    order_count: allNonCancelledOrders.filter(o => o.payment_method === 'gcash').length,
                    total_revenue: allNonCancelledOrders.filter(o => o.payment_method === 'gcash').reduce((sum, o) => sum + (o.total_amount || 0), 0),
                    avg_order_value: 0
                  },
                  {
                    payment_method: 'cash',
                    order_count: allNonCancelledOrders.filter(o => o.payment_method === 'cash').length,
                    total_revenue: allNonCancelledOrders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + (o.total_amount || 0), 0),
                    avg_order_value: 0
                  }
                ];
                
                // Calculate average order values for payment methods
                paymentBreakdown.forEach(payment => {
                  payment.avg_order_value = payment.order_count > 0 ? payment.total_revenue / payment.order_count : 0;
                });
                
                // Calculate top products from order items
                const productSales = {};
                allNonCancelledOrders.forEach(order => {
                  if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                      const productKey = `${item.product_id}-${item.product_name}`;
                      if (!productSales[productKey]) {
                        productSales[productKey] = {
                          product_name: item.product_name,
                          product_image: getImageUrl(item.image),
                          total_sold: 0,
                          total_revenue: 0,
                          category_name: 'General'
                        };
                      }
                      productSales[productKey].total_sold += item.quantity || 0;
                      productSales[productKey].total_revenue += item.total_price || 0;
                    });
                  }
                });
                
                const topProducts = Object.values(productSales)
                  .sort((a, b) => b.total_sold - a.total_sold)
                  .slice(0, 5);
                
                setSalesData({
                  salesData: salesDataArray,
                  topProducts: topProducts,
                  paymentBreakdown: paymentBreakdown,
                  inventorySummary: [],
                  salesLogsSummary: {
                    completed_sales: totalOrders,
                    completed_revenue: totalRevenue,
                    reversed_sales: 0,
                    total_sales_logs: totalOrders
                  },
                  summary: {
                    total_orders: totalOrders,
                    total_revenue: totalRevenue,
                    avg_order_value: avgOrderValue
                  }
                });
                
                setError('Using all orders data (date filter returned no results)');
                console.log('Sales data calculated successfully from all orders');
                return;
              }
            } else if (filteredOrders.length === 0) {
              console.log('📊 No orders found in database');
              setSalesData({
                salesData: [],
                topProducts: [],
                paymentBreakdown: [],
                inventorySummary: [],
                salesLogsSummary: {},
                summary: {}
              });
              setError('No orders found in the system.');
              return;
            }
            
            // Calculate basic sales data from filtered orders
            const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
            const totalOrders = filteredOrders.length;
            const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
            
            // Group by period based on groupBy setting
            const groupedData = {};
            filteredOrders.forEach(order => {
              const orderDate = new Date(order.created_at);
              let periodKey;
              
              if (groupBy === 'month') {
                periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
              } else if (groupBy === 'year') {
                periodKey = orderDate.getFullYear().toString();
              } else {
                periodKey = orderDate.toISOString().split('T')[0];
              }
              
              if (!groupedData[periodKey]) {
                groupedData[periodKey] = {
                  period: periodKey,
                  orders: 0,
                  revenue: 0,
                  avg_order_value: 0
                };
              }
              
              groupedData[periodKey].orders += 1;
              groupedData[periodKey].revenue += order.total_amount || 0;
            });
            
            // Calculate averages
            Object.values(groupedData).forEach(item => {
              item.avg_order_value = item.orders > 0 ? item.revenue / item.orders : 0;
            });
            
            const salesDataArray = Object.values(groupedData).sort((a, b) => a.period.localeCompare(b.period));
            
            // Calculate payment breakdown from orders
            const paymentBreakdown = [
              {
                payment_method: 'gcash',
                order_count: filteredOrders.filter(o => o.payment_method === 'gcash').length,
                total_revenue: filteredOrders.filter(o => o.payment_method === 'gcash').reduce((sum, o) => sum + (o.total_amount || 0), 0),
                avg_order_value: 0
              },
              {
                payment_method: 'cash',
                order_count: filteredOrders.filter(o => o.payment_method === 'cash').length,
                total_revenue: filteredOrders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + (o.total_amount || 0), 0),
                avg_order_value: 0
              }
            ];
            
            // Calculate average order values for payment methods
            paymentBreakdown.forEach(payment => {
              payment.avg_order_value = payment.order_count > 0 ? payment.total_revenue / payment.order_count : 0;
            });
            
            // Calculate top products from order items
            const productSales = {};
            filteredOrders.forEach(order => {
              if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                  const productKey = `${item.product_id}-${item.product_name}`;
                  if (!productSales[productKey]) {
                    productSales[productKey] = {
                      product_name: item.product_name,
                      product_image: item.image || '/images/polo.png',
                      total_sold: 0,
                      total_revenue: 0,
                      category_name: 'General'
                    };
                  }
                  productSales[productKey].total_sold += item.quantity || 0;
                  productSales[productKey].total_revenue += item.total_price || 0;
                });
              }
            });
            
            const topProducts = Object.values(productSales)
              .sort((a, b) => b.total_sold - a.total_sold)
              .slice(0, 5);
            
            setSalesData({
              salesData: salesDataArray,
              topProducts: topProducts,
              paymentBreakdown: paymentBreakdown,
              inventorySummary: [],
              salesLogsSummary: {
                completed_sales: totalOrders,
                completed_revenue: totalRevenue,
                reversed_sales: 0,
                total_sales_logs: totalOrders
              },
              summary: {
                total_orders: totalOrders,
                total_revenue: totalRevenue,
                avg_order_value: avgOrderValue
              }
            });
            
            setError('Using calculated data from orders (sales performance API unavailable)');
            console.log('Sales data calculated successfully from orders');
            return;
          } else {
            console.log('No orders found in database');
          }
        } catch (ordersError) {
          console.log('Basic orders API also failed:', ordersError.message);
        }
        
        // No fallback to sample data - show empty state instead
        console.log('No sales data available - showing empty state');
        setSalesData({
          salesData: [],
          topProducts: [],
          paymentBreakdown: [],
          inventorySummary: [],
          salesLogsSummary: {},
          summary: {}
        });
        setError('No sales data available. Please check if there are any orders in the system.');
        
      }
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
        inventorySummary: [],
        salesLogsSummary: {},
        summary: {}
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [dateRange, groupBy]);

  // Auto-refresh for sales
  useAdminAutoRefresh(fetchSalesData, 'sales');

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
        borderColor: 'rgb(168, 85, 247)', // Purple
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Orders',
        data: salesData.salesData?.map(item => item.orders) || [],
        borderColor: 'rgb(245, 158, 11)', // Orange
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        fill: false,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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

  // Prepare pie chart data for payment methods
  const pieChartData = {
    labels: salesData.paymentBreakdown?.map(item => 
      item.payment_method === 'gcash' ? 'GCash' : 
      item.payment_method === 'cash' ? 'Cash' : 
      item.payment_method
    ) || [],
    datasets: [
      {
        data: salesData.paymentBreakdown?.map(item => item.total_revenue) || [],
        backgroundColor: [
          'rgba(147, 197, 253, 0.8)', // Pastel blue for GCash
          'rgba(254, 240, 138, 0.8)', // Pastel yellow for Cash
          'rgba(139, 92, 246, 0.8)', // Violet for others
          'rgba(251, 146, 60, 0.8)', // Orange for others
        ],
        borderColor: [
          'rgba(147, 197, 253, 1)',
          'rgba(254, 240, 138, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(251, 146, 60, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Payment Method Breakdown',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ₱${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    },
  };

  return (
    <div className="min-h-screen text-black admin-page">
      <Navbar />
      <div className="flex pt-16 lg:pt-20"> {/* Add padding-top for fixed navbar */}
        <Sidebar />
        <div className="flex-1 bg-white p-2 sm:p-3 overflow-auto lg:ml-64">
          {/* Header */}
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-2xl font-semibold text-gray-900 mb-5">Sales Analytics</h1>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchSalesData}
                  className="px-3 py-2 bg-[#000C50] text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2 mb-5"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Refresh Data
                </button>
                <a
                  href="/admin/orders"
                  className="px-3 py-2 bg-white-600 text-[#000C50] rounded-md text-sm font-medium flex items-center gap-2 mb-5 border"
                >
                  <ClipboardDocumentListIcon className="w-4 h-4" />
                  View Orders
                </a>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-2 sm:p-3 rounded-lg shadow-sm border border-gray-200 mb-5">
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
                Apply Filters
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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-50 rounded-md mt-2 ml-4">
                      <ShoppingBagIcon className="w-8 h-8 text-blue-600" />
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
                      <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
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
                      <ChartBarIcon className="w-8 h-8 text-purple-600" />
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
                      <ChartBarIcon className="w-8 h-8 text-yellow-600" />
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

              {/* Profit Analytics Section */}
              {salesData.profitAnalytics && (
                <div className="mb-5">
                  <h2 className="text-sm font-semibold text-gray-900 mb-2">Profit Analytics</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-50 rounded-md mt-2 ml-4">
                          <CurrencyDollarIcon className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-blue-600">Total Cost</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(salesData.profitAnalytics.summary?.total_cost || 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-green-50 rounded-md mt-2 ml-4">
                          <ChartBarIcon className="w-8 h-8 text-green-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-600">Total Profit</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(salesData.profitAnalytics.summary?.total_profit || 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-purple-50 rounded-md mt-2 ml-4">
                          <ChartBarIcon className="w-8 h-8 text-purple-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-purple-600">Profit Margin</p>
                          <p className="text-lg font-bold text-purple-600">
                            {salesData.profitAnalytics.summary?.overall_profit_margin || 0}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                      <div className="flex items-center">
                        <div className="p-2 bg-orange-50 rounded-md mt-2 ml-4">
                          <ChartBarIcon className="w-8 h-8 text-orange-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-orange-600">Avg Profit/Order</p>
                          <p className="text-lg font-bold text-orange-600">
                            {salesData.profitAnalytics.summary?.total_orders > 0 ? 
                              formatCurrency((salesData.profitAnalytics.summary?.total_profit || 0) / salesData.profitAnalytics.summary?.total_orders) : 
                              formatCurrency(0)
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-2">
                {/* Sales Trend Line Chart */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-md">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900">Sales Trend</h3>
                  </div>
                  <div className="p-4">
                    {salesData.salesData && salesData.salesData.length > 0 ? (
                      <div className="h-80">
                        <Line data={chartData} options={chartOptions} />
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <ChartBarIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs">No sales data available for the selected period</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Method Pie Chart */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-md">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900">Payment Methods</h3>
                  </div>
                  <div className="p-4">
                    {salesData.paymentBreakdown && salesData.paymentBreakdown.length > 0 ? (
                      <div className="h-80">
                        <Doughnut data={pieChartData} options={pieChartOptions} />
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <ChartBarIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs">No payment data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sales Data Table */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-2 mt-5">
                <div className="p-2">
                  <h3 className="text-sm font-semibold text-gray-900 ml-3 mt-1">Detailed Sales Data</h3>
                </div>
                <div className="p-2">
                  {salesData.salesData && salesData.salesData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Period</th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Orders</th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Revenue</th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-700">Avg Order</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.salesData.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50 transition-colors border-b border-gray-100 bg-white">
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
                      <div className="text-gray-300 text-2xl mb-2"></div>
                      <p className="text-xs">No sales data available for the selected period</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Breakdown */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-md mb-2 mt-5">
                <div className="p-2">
                  <h3 className="text-sm font-semibold text-gray-900 ml-3 mt-1">Payment Method Breakdown</h3>
                </div>
                <div className="p-2">
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
              <div className="bg-white border border-gray-200 rounded-lg shadow-md mb-2 mt-5">
                <div className="p-2">
                  <h3 className="text-sm font-semibold text-gray-900 ml-3 mt-1">Inventory Movement Summary</h3>
                </div>
                <div className="p-2">
                  {salesData.inventorySummary && salesData.inventorySummary.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Movement Type</th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Count</th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Total Quantity</th>
                          <th className="px-4 py-3 text-xs font-medium text-gray-700">Products Affected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.inventorySummary.map((movement, index) => (
                          <tr key={index} className="hover:bg-gray-50 transition-colors border-b border-gray-100 bg-white">
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
                      <CubeIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs">No inventory movement data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders Summary */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-2 mt-5">
                <div className="p-2">
                  <h3 className="text-sm font-semibold text-gray-900 ml-3 mt-1">Recent Orders Summary</h3>
                  <div className="text-xs text-gray-600 mt-1 ml-3 mt-1">
                    Showing orders from {formatDate(dateRange.start_date)} to {formatDate(dateRange.end_date)}
                  </div>
                </div>
                <div className="p-2">
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
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm mt-5">
                <div className="p-2">
                  <h3 className="text-sm font-semibold text-gray-900 ml-3 mt-1">Top Selling Products</h3>
                </div>
                <div className="p-2">
                {salesData.topProducts && salesData.topProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {salesData.topProducts.map((product, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-3">
                        <div className="flex items-center mb-2">
                          <img 
                            src={getImageUrl(product.product_image)} 
                            alt={product.product_name}
                            className="w-10 h-10 rounded object-cover mr-2"
                          />
                          <div>
                            <h4 className="text-xs font-medium text-gray-900 uppercase">{product.product_name}</h4>
                            <p className="text-xs text-gray-500">#{index + 1} Top Seller</p>
                            {product.category_name && (
                              <p className="text-xs text-gray-400 uppercase">{product.category_name}</p>
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


