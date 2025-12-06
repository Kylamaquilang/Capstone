'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
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
  CubeIcon,
  ArrowDownTrayIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from '@/lib/sweetalert-config';

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
  const [productSales, setProductSales] = useState({
    productSales: [],
    summary: {}
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productSalesLoading, setProductSalesLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });
  const [productSalesFilters, setProductSalesFilters] = useState({
    product_id: '',
    size: '',
    min_price: '',
    max_price: ''
  });
  const [availableSizes, setAvailableSizes] = useState([]);
  const prevProductIdRef = useRef('');
  const [groupBy, setGroupBy] = useState('day');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Sales Report Tab State
  const [activeView, setActiveView] = useState('analytics'); // 'analytics' or 'detailed'
  
  // Detailed Sales Report State
  const [detailedSalesData, setDetailedSalesData] = useState({
    orderItems: [],
    summary: {
      total_orders: 0,
      total_revenue: 0,
      gcash_orders: 0,
      cash_orders: 0,
      gcash_revenue: 0,
      cash_revenue: 0
    },
    priceBreakdown: null
  });
  const [detailedSalesFilters, setDetailedSalesFilters] = useState({
    product_id: '',
    size: '',
    category_id: ''
  });
  const [detailedSalesPagination, setDetailedSalesPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [allProductsForReport, setAllProductsForReport] = useState([]);
  const [availableProductsForReport, setAvailableProductsForReport] = useState([]);
  const [availableCategoriesForReport, setAvailableCategoriesForReport] = useState([]);
  const [availableSizesForReport, setAvailableSizesForReport] = useState([]);
  const [detailedSalesLoading, setDetailedSalesLoading] = useState(false);
  const detailedSalesFetchInProgressRef = useRef(false);
  const prevDetailedProductIdRef = useRef('');

  // Fetch products list for filter dropdown
  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await API.get('/products');
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    }
  }, []);

  // Update available sizes when product is selected
  useEffect(() => {
    const currentProductId = productSalesFilters.product_id;
    
    // Only update if product_id actually changed
    if (prevProductIdRef.current === currentProductId) {
      return;
    }
    
    prevProductIdRef.current = currentProductId;
    
    if (currentProductId) {
      const productId = parseInt(currentProductId);
      const selectedProduct = products.find(p => p.id === productId);
      
      // Get sizes from product definition (primary source - most reliable)
      let sizesFromProduct = [];
      if (selectedProduct && selectedProduct.sizes && selectedProduct.sizes.length > 0) {
        // Get all sizes from product definition, excluding 'NONE'
        sizesFromProduct = selectedProduct.sizes
          .map(s => s.size)
          .filter(s => s && s !== 'NONE' && s !== null && s !== undefined && s !== '');
      }
      
      // Also get unique sizes from sales data for the selected product
      // This ensures we show sizes that may have been sold even if not in current product definition
      const productSalesData = productSales.productSales || [];
      const sizesFromSales = productSalesData
        .filter(item => item.product_id === productId)
        .map(item => item.size)
        .filter(size => size && size !== null && size !== undefined && size !== 'NONE' && size !== 'N/A' && size !== '');
      
      // Combine both sources and get unique sizes, sorted alphabetically
      const allSizes = [...new Set([...sizesFromProduct, ...sizesFromSales])];
      
      if (allSizes.length > 0) {
        // Product has sizes - show all available sizes in the filter
        setAvailableSizes(allSizes.sort());
      } else if (selectedProduct) {
        // Product exists but has no sizes - set empty array (size filter will be disabled)
        setAvailableSizes([]);
      } else {
        // Product not found yet, wait for products to load
        setAvailableSizes([]);
      }
      
      // Reset size filter when product changes
      setProductSalesFilters(prev => ({ ...prev, size: '' }));
    } else {
      setAvailableSizes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSalesFilters.product_id]);

  const fetchProductSales = useCallback(async () => {
    try {
      setProductSalesLoading(true);
      
      const params = new URLSearchParams();
      
      // Only add date filters if they are provided
      if (dateRange.start_date) {
        params.append('start_date', dateRange.start_date);
      }
      if (dateRange.end_date) {
        params.append('end_date', dateRange.end_date);
      }
      
      // Add product, size, and price filters
      if (productSalesFilters.product_id) {
        params.append('product_id', productSalesFilters.product_id);
      }
      if (productSalesFilters.size) {
        params.append('size', productSalesFilters.size);
      }
      if (productSalesFilters.min_price) {
        params.append('min_price', productSalesFilters.min_price);
      }
      if (productSalesFilters.max_price) {
        params.append('max_price', productSalesFilters.max_price);
      }
      
      const { data } = await API.get(`/orders/product-sales-report?${params}`);
      
      setProductSales({
        productSales: data.productSales || [],
        summary: data.summary || {}
      });
    } catch (err) {
      console.error('Error fetching product sales:', err);
      setProductSales({
        productSales: [],
        summary: {}
      });
    } finally {
      setProductSalesLoading(false);
    }
  }, [dateRange.start_date, dateRange.end_date, productSalesFilters.product_id, productSalesFilters.size, productSalesFilters.min_price, productSalesFilters.max_price]);

  const fetchSalesData = useCallback(async () => {
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
            // Filter orders by date range and status - only include claimed/completed orders
            let filteredOrders = orders.filter(order => {
              const isSuccessful = order.status === 'claimed' || order.status === 'completed';
              
              // If no date range is specified, return all successful orders
              if (!dateRange.start_date && !dateRange.end_date) {
                return isSuccessful;
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
              
              console.log(`Order ${order.id}: ${order.created_at} - In range: ${isInDateRange}, Successful: ${isSuccessful}`);
              
              return isInDateRange && isSuccessful;
            });
            
            console.log(`📊 Filtered orders: ${filteredOrders.length} orders in date range`);
            
            if (filteredOrders.length === 0 && (dateRange.start_date || dateRange.end_date)) {
              console.log('📊 No successful orders found in date range, trying without date filter...');
              // Try without date filter to see all successful orders
              const allClaimedOrders = orders.filter(order => order.status === 'claimed' || order.status === 'completed');
              console.log(`📊 All successful orders: ${allClaimedOrders.length}`);
              
              if (allClaimedOrders.length > 0) {
                // Use all claimed orders
                const totalRevenue = allClaimedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
                const totalOrders = allClaimedOrders.length;
                const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
                
                // Group by period based on groupBy setting
                const groupedData = {};
                allClaimedOrders.forEach(order => {
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
                
                // Calculate payment breakdown from claimed orders
                const paymentBreakdown = [
                  {
                    payment_method: 'gcash',
                    order_count: allClaimedOrders.filter(o => o.payment_method?.toLowerCase() === 'gcash').length,
                    total_revenue: allClaimedOrders.filter(o => o.payment_method?.toLowerCase() === 'gcash').reduce((sum, o) => sum + (o.total_amount || 0), 0),
                    avg_order_value: 0
                  },
                  {
                    payment_method: 'cash',
                    order_count: allClaimedOrders.filter(o => o.payment_method?.toLowerCase() === 'cash').length,
                    total_revenue: allClaimedOrders.filter(o => o.payment_method?.toLowerCase() === 'cash').reduce((sum, o) => sum + (o.total_amount || 0), 0),
                    avg_order_value: 0
                  }
                ];
                
                // Calculate average order values for payment methods
                paymentBreakdown.forEach(payment => {
                  payment.avg_order_value = payment.order_count > 0 ? payment.total_revenue / payment.order_count : 0;
                });
                
                // Calculate top products from claimed order items
                const productSales = {};
                allClaimedOrders.forEach(order => {
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
                order_count: filteredOrders.filter(o => o.payment_method?.toLowerCase() === 'gcash').length,
                total_revenue: filteredOrders.filter(o => o.payment_method?.toLowerCase() === 'gcash').reduce((sum, o) => sum + (o.total_amount || 0), 0),
                avg_order_value: 0
              },
              {
                payment_method: 'cash',
                order_count: filteredOrders.filter(o => o.payment_method?.toLowerCase() === 'cash').length,
                total_revenue: filteredOrders.filter(o => o.payment_method?.toLowerCase() === 'cash').reduce((sum, o) => sum + (o.total_amount || 0), 0),
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
  }, [dateRange, groupBy]);

  // Fetch products list on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch product sales when date range or filters change
  useEffect(() => {
    fetchProductSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start_date, dateRange.end_date, productSalesFilters.product_id, productSalesFilters.size, productSalesFilters.min_price, productSalesFilters.max_price]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  // Auto-refresh for sales
  useAdminAutoRefresh(fetchSalesData, 'sales');

  // Fetch detailed sales report data
  const fetchDetailedSalesData = useCallback(async () => {
    if (detailedSalesFetchInProgressRef.current) {
      return;
    }
    
    detailedSalesFetchInProgressRef.current = true;
    setDetailedSalesLoading(true);
    
    try {
      setError('');
      
      const params = new URLSearchParams();
      if (dateRange.start_date) params.append('start_date', dateRange.start_date);
      if (dateRange.end_date) params.append('end_date', dateRange.end_date);
      if (detailedSalesFilters.product_id) params.append('product_id', detailedSalesFilters.product_id);
      if (detailedSalesFilters.size) params.append('size', detailedSalesFilters.size);
      if (detailedSalesFilters.category_id) params.append('category_id', detailedSalesFilters.category_id);
      
      const response = await API.get(`/orders/detailed-sales-report?${params}`);
      
      setDetailedSalesData(response.data || {
        orderItems: [],
        summary: {
          total_orders: 0,
          total_revenue: 0,
          gcash_orders: 0,
          cash_orders: 0,
          gcash_revenue: 0,
          cash_revenue: 0
        },
        priceBreakdown: null
      });
    } catch (err) {
      console.error('Detailed sales data error:', err);
      setDetailedSalesData({
        orderItems: [],
        summary: {
          total_orders: 0,
          total_revenue: 0,
          gcash_orders: 0,
          cash_orders: 0,
          gcash_revenue: 0,
          cash_revenue: 0
        },
        priceBreakdown: null
      });
    } finally {
      setDetailedSalesLoading(false);
      detailedSalesFetchInProgressRef.current = false;
    }
  }, [dateRange.start_date, dateRange.end_date, detailedSalesFilters.product_id, detailedSalesFilters.size, detailedSalesFilters.category_id]);

  // Fetch categories and products for detailed report filters
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [categoriesRes, productsRes] = await Promise.all([
          API.get('/categories'),
          API.get('/products')
        ]);
        
        const categories = categoriesRes.data || [];
        const products = productsRes.data || [];
        
        setAvailableCategoriesForReport(categories);
        setAllProductsForReport(products);
        setAvailableProductsForReport(products);
      } catch (err) {
        console.error('Error fetching filter data:', err);
      }
    };
    
    if (activeView === 'detailed') {
      fetchFilterData();
    }
  }, [activeView]);

  // Filter products based on selected category
  useEffect(() => {
    if (detailedSalesFilters.category_id) {
      const filtered = allProductsForReport.filter(product => 
        product.category_id && parseInt(product.category_id) === parseInt(detailedSalesFilters.category_id)
      );
      setAvailableProductsForReport(filtered);
      
      if (detailedSalesFilters.product_id) {
        const selectedProduct = allProductsForReport.find(p => p.id === parseInt(detailedSalesFilters.product_id));
        if (!selectedProduct || selectedProduct.category_id !== parseInt(detailedSalesFilters.category_id)) {
          setDetailedSalesFilters(prev => ({ ...prev, product_id: '', size: '' }));
        }
      }
    } else {
      setAvailableProductsForReport(allProductsForReport);
    }
  }, [detailedSalesFilters.category_id, allProductsForReport]);

  // Update available sizes when product is selected
  useEffect(() => {
    const currentProductId = detailedSalesFilters.product_id;
    
    if (prevDetailedProductIdRef.current === currentProductId) {
      return;
    }
    
    prevDetailedProductIdRef.current = currentProductId;
    
    if (currentProductId && detailedSalesData.orderItems) {
      const productId = parseInt(currentProductId);
      const sizesFromSales = detailedSalesData.orderItems
        .filter(item => item.product_id === productId)
        .map(item => item.size)
        .filter(size => size && size !== null && size !== undefined && size !== 'NONE' && size !== 'N/A' && size !== '');
      
      const uniqueSizes = [...new Set(sizesFromSales)];
      
      if (uniqueSizes.length > 0) {
        setAvailableSizesForReport(uniqueSizes.sort());
      } else {
        setAvailableSizesForReport([]);
      }
      
      setDetailedSalesFilters(prev => ({ ...prev, size: '' }));
    } else {
      setAvailableSizesForReport([]);
    }
  }, [detailedSalesFilters.product_id, detailedSalesData.orderItems]);

  // Fetch detailed sales data when view changes or filters change
  useEffect(() => {
    if (activeView === 'detailed') {
      fetchDetailedSalesData();
    }
  }, [activeView, fetchDetailedSalesData]);

  // Calculate paginated sales data
  const getPaginatedDetailedSalesData = () => {
    if (!detailedSalesData.orderItems || !Array.isArray(detailedSalesData.orderItems)) {
      return [];
    }
    
    const startIndex = (detailedSalesPagination.page - 1) * detailedSalesPagination.limit;
    const endIndex = startIndex + detailedSalesPagination.limit;
    return detailedSalesData.orderItems.slice(startIndex, endIndex);
  };

  // Update pagination total when data changes
  useEffect(() => {
    if (detailedSalesData.orderItems && Array.isArray(detailedSalesData.orderItems)) {
      const total = detailedSalesData.orderItems.length;
      const pages = Math.ceil(total / detailedSalesPagination.limit);
      setDetailedSalesPagination(prev => ({
        ...prev,
        total: total,
        pages: pages,
        page: prev.page > pages ? Math.max(1, pages) : prev.page
      }));
    }
  }, [detailedSalesData.orderItems, detailedSalesPagination.limit]);

  // Handle pagination
  const handleDetailedSalesPageChange = (newPage) => {
    setDetailedSalesPagination(prev => ({ ...prev, page: newPage }));
  };

  // Export functions
  const handleExportDetailedSalesPDF = async () => {
    try {
      if (!detailedSalesData.orderItems || detailedSalesData.orderItems.length === 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'No Data',
          text: 'No sales data available to export.',
          confirmButtonColor: '#000C50'
        });
        return;
      }

      const pdf = new jsPDF();
      pdf.setFont('helvetica');
      
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Sales Report - Product Sales Details', 20, 30);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 45);
      
      if (dateRange.start_date || dateRange.end_date) {
        pdf.text(`Date Range: ${dateRange.start_date || 'N/A'} to ${dateRange.end_date || 'N/A'}`, 20, 55);
      }
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total Revenue: ${formatCurrency(detailedSalesData.summary?.total_revenue || 0)}`, 20, 70);
      
      const tableData = detailedSalesData.orderItems.map(item => [
        new Date(item.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        item.product_name || 'N/A',
        item.size || '—',
        item.quantity?.toString() || '0',
        formatCurrency(item.unit_price || 0),
        formatCurrency(item.item_total || 0),
        (item.payment_method?.toUpperCase() || 'N/A')
      ]);
      
      autoTable(pdf, {
        startY: 80,
        head: [['Date', 'Product Name', 'Size', 'Qty', 'Unit Price', 'Total', 'Payment']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 12, 80], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        margin: { top: 80 }
      });
      
      pdf.save(`Sales-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error generating PDF. Please try again.',
        confirmButtonColor: '#000C50'
      });
    }
  };

  // Export to CSV
  const handleExportDetailedSalesCSV = () => {
    try {
      if (!detailedSalesData.orderItems || detailedSalesData.orderItems.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'No Data',
          text: 'No sales data available to export.',
          confirmButtonColor: '#000C50'
        });
        return;
      }

      const headers = ['Date & Time', 'Product Name', 'Size', 'Quantity', 'Unit Price', 'Total', 'Payment Method'];
      const csvRows = [headers.join(',')];

      detailedSalesData.orderItems.forEach(item => {
        const date = new Date(item.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const time = new Date(item.order_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        csvRows.push([
          `"${date} ${time}"`,
          `"${(item.product_name || '').replace(/"/g, '""')}"`,
          `"${(item.size || 'N/A').replace(/"/g, '""')}"`,
          item.quantity || 0,
          item.unit_price || 0,
          item.item_total || 0,
          `"${(item.payment_method?.toUpperCase() || 'N/A').replace(/"/g, '""')}"`
        ].join(','));
      });

      // Add summary
      csvRows.push('');
      csvRows.push('Summary');
      csvRows.push(`Total Orders,${detailedSalesData.summary?.total_orders || 0}`);
      csvRows.push(`Total Revenue,${detailedSalesData.summary?.total_revenue || 0}`);
      csvRows.push(`Total Items,${detailedSalesData.orderItems.length}`);

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Sales-Report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating CSV:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error generating CSV. Please try again.',
        confirmButtonColor: '#000C50'
      });
    }
  };

  // Export to Excel (uses CSV format)
  const handleExportDetailedSalesExcel = () => {
    handleExportDetailedSalesCSV(); // Excel can open CSV files
  };

  // Print Sales Report
  const handlePrintDetailedSales = () => {
    try {
      if (!detailedSalesData.orderItems || detailedSalesData.orderItems.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'No Data',
          text: 'No sales data available to print.',
          confirmButtonColor: '#000C50'
        });
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Please allow popups to print the report.',
          confirmButtonColor: '#000C50'
        });
        return;
      }

      let tableRows = '';
      detailedSalesData.orderItems.forEach(item => {
        const date = new Date(item.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const time = new Date(item.order_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        tableRows += `
          <tr>
            <td>${date}<br/>${time}</td>
            <td>${item.product_name || 'N/A'}</td>
            <td>${item.size || '—'}</td>
            <td style="text-align: center;">${item.quantity || 0}</td>
            <td style="text-align: right;">${formatCurrency(item.unit_price || 0)}</td>
            <td style="text-align: right; font-weight: 500;">${formatCurrency(item.item_total || 0)}</td>
            <td style="text-align: center;">${(item.payment_method?.toUpperCase() || 'N/A')}</td>
          </tr>
        `;
      });

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Sales Report - ${new Date().toLocaleDateString()}</title>
            <style>
              @media print {
                @page {
                  margin: 1cm;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
              }
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #333;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #000C50;
                padding-bottom: 20px;
              }
              .header h1 {
                color: #000C50;
                margin: 0 0 10px 0;
                font-size: 28px;
              }
              .header p {
                color: #666;
                margin: 5px 0;
                font-size: 14px;
              }
              .summary {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                border-left: 4px solid #000C50;
              }
              .summary h3 {
                margin: 0 0 10px 0;
                color: #000C50;
                font-size: 16px;
              }
              .summary p {
                margin: 5px 0;
                font-size: 14px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 12px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
              }
              th {
                background-color: #000C50;
                color: white;
                font-weight: bold;
                text-transform: uppercase;
                font-size: 11px;
              }
              tr:nth-child(even) {
                background-color: #f6f6f6;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                text-align: center;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Sales Report</h1>
              <p>Generated on: ${new Date().toLocaleString()}</p>
              ${dateRange.start_date || dateRange.end_date ? `<p>Date Range: ${dateRange.start_date || 'N/A'} to ${dateRange.end_date || 'N/A'}</p>` : ''}
            </div>
            
            <div class="summary">
              <h3>Summary</h3>
              <p><strong>Total Orders:</strong> ${detailedSalesData.summary?.total_orders || 0}</p>
              <p><strong>Total Revenue:</strong> ${formatCurrency(detailedSalesData.summary?.total_revenue || 0)}</p>
              <p><strong>Total Items:</strong> ${detailedSalesData.orderItems.length}</p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Product Name</th>
                  <th>Size</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                  <th>Payment Method</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <div class="footer">
              <p>Sales Report - ${new Date().toLocaleDateString()}</p>
            </div>

            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
    } catch (error) {
      console.error('Error printing report:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error printing report. Please try again.',
        confirmButtonColor: '#000C50'
      });
    }
  };

  // Pagination Controls Component
  const PaginationControls = ({ pagination, onPageChange, dataName = 'items' }) => {
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const startItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

    if (pagination.total === 0) return null;

    return (
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-600">
            Showing {startItem} to {endItem} of {pagination.total} {dataName}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1 || totalPages <= 1}
              className="px-3 py-1 text-xs border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              &lt;
            </button>
            
            <span className="px-3 py-1 text-xs border border-gray-300 bg-white">
              {pagination.page}
            </span>
            
            <button
              onClick={() => onPageChange(Math.min(totalPages, pagination.page + 1))}
              disabled={pagination.page >= totalPages || totalPages <= 1}
              className="px-3 py-1 text-xs border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    );
  };

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
      <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="flex pt-[68px] lg:pt-20">
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 bg-gray-50 p-3 sm:p-4 overflow-auto lg:ml-64">
          {/* Header */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Sales</h1>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => activeView === 'analytics' ? fetchSalesData() : fetchDetailedSalesData()}
                  className="w-full sm:w-auto px-3 py-2 bg-[#000C50] text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2 active:scale-95"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span>Refresh Data</span>
                </button>
                <Link
                  href="/admin/orders"
                  className="w-full sm:w-auto px-3 py-2 bg-white text-[#000C50] rounded-md text-sm font-medium flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50"
                >
                  <ClipboardDocumentListIcon className="w-4 h-4" />
                  <span>View Orders</span>
                </Link>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="mt-4 border-b border-gray-200">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveView('analytics')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'analytics'
                      ? 'border-[#000C50] text-[#000C50]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveView('detailed')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeView === 'detailed'
                      ? 'border-[#000C50] text-[#000C50]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Detailed Report
                </button>
              </nav>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Analytics View */}
          {activeView === 'analytics' && (
            <>
          {/* Filters */}
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
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
                onClick={() => {
                  setDateRange({ start_date: '', end_date: '' });
                  setGroupBy('day');
                }}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium active:scale-95"
              >
                Clear Filters
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
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

            </>
          )}

          {/* Detailed Report View */}
          {activeView === 'detailed' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header Section */}
              <div className="px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Sales Report</h3>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <button
                      onClick={handleExportDetailedSalesPDF}
                      className="px-2.5 sm:px-3 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5 sm:gap-2"
                      title="Export to PDF"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                    <button
                      onClick={handleExportDetailedSalesCSV}
                      className="px-2.5 sm:px-3 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1.5 sm:gap-2"
                      title="Export to CSV"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">CSV</span>
                    </button>
                    <button
                      onClick={handleExportDetailedSalesExcel}
                      className="px-2.5 sm:px-3 py-2 text-xs sm:text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-1.5 sm:gap-2"
                      title="Export to Excel"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Excel</span>
                    </button>
                    <button
                      onClick={handlePrintDetailedSales}
                      className="px-2.5 sm:px-3 py-2 text-xs sm:text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-1.5 sm:gap-2"
                      title="Print Report"
                    >
                      <PrinterIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Print</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
                  <div className="w-full sm:w-auto sm:min-w-[180px] sm:max-w-[250px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Category</label>
                    <select
                      value={detailedSalesFilters.category_id}
                      onChange={(e) => {
                        const newCategoryId = e.target.value;
                        const selectedProduct = allProductsForReport.find(p => p.id === parseInt(detailedSalesFilters.product_id));
                        const shouldClearProduct = newCategoryId && selectedProduct && selectedProduct.category_id !== parseInt(newCategoryId);
                        
                        setDetailedSalesFilters(prev => ({
                          ...prev,
                          category_id: newCategoryId,
                          product_id: shouldClearProduct ? '' : prev.product_id,
                          size: shouldClearProduct ? '' : prev.size
                        }));
                        setDetailedSalesPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Categories</option>
                      {availableCategoriesForReport.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-full sm:w-auto sm:min-w-[180px] sm:max-w-[250px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Product Name</label>
                    <select
                      value={detailedSalesFilters.product_id}
                      onChange={(e) => {
                        setDetailedSalesFilters(prev => ({ ...prev, product_id: e.target.value, size: '' }));
                        setDetailedSalesPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Products</option>
                      {availableProductsForReport.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {detailedSalesFilters.product_id && (
                    <div className="w-full sm:w-auto sm:min-w-[120px] sm:max-w-[180px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Filter by Size
                        {availableSizesForReport.length === 0 && (
                          <span className="text-gray-400 text-xs ml-1">(No sizes available)</span>
                        )}
                      </label>
                      {availableSizesForReport.length > 0 ? (
                        <select
                          value={detailedSalesFilters.size}
                          onChange={(e) => {
                            setDetailedSalesFilters(prev => ({ ...prev, size: e.target.value }));
                            setDetailedSalesPagination(prev => ({ ...prev, page: 1 }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">All Sizes</option>
                          {availableSizesForReport.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value=""
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-400 cursor-not-allowed"
                          disabled
                        >
                          <option value="">No sizes available</option>
                        </select>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => {
                        setDetailedSalesFilters({ product_id: '', size: '', category_id: '' });
                        setDetailedSalesPagination(prev => ({ ...prev, page: 1 }));
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors whitespace-nowrap h-[38px]"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              {detailedSalesLoading ? (
                <div className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#000C50] mx-auto mb-4"></div>
                  <div className="text-sm text-gray-600">Loading sales data...</div>
                </div>
              ) : detailedSalesData.orderItems && Array.isArray(detailedSalesData.orderItems) && detailedSalesData.orderItems.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ backgroundColor: '#F6F6F6' }}>
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date & Time</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product Name</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Size</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Unit Price</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Total</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Payment Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {getPaginatedDetailedSalesData().map((item, index) => {
                          const globalIndex = (detailedSalesPagination.page - 1) * detailedSalesPagination.limit + index;
                          return (
                            <tr key={globalIndex} className={`hover:bg-green-50/50 transition-colors ${globalIndex % 2 === 0 ? 'bg-white' : ''}`} style={globalIndex % 2 !== 0 ? { backgroundColor: '#F6F6F6' } : {}}>
                              <td className="px-6 py-4">
                                <div className="text-xs text-gray-900">
                                  {new Date(item.order_date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(item.order_date).toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-xs text-gray-900">{item.product_name}</div>
                              </td>
                              <td className="px-6 py-4">
                                {item.size && item.size !== 'N/A' ? (
                                  <span className="inline-flex px-2.5 py-1 text-xs text-black uppercase">
                                    {item.size}
                                  </span>
                                ) : (
                                  <span className="text-xs text-black">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs text-black">
                                  {item.quantity}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-900">{formatCurrency(item.unit_price)}</span>
                                    {item.is_historical_price === 1 && item.current_price && Math.abs(item.unit_price - item.current_price) > 0.01 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800" title={`Historical price (locked). Current price: ${formatCurrency(item.current_price)}`}>
                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                        Locked
                                      </span>
                                    )}
                                  </div>
                                  {item.is_historical_price === 1 && item.current_price && Math.abs(item.unit_price - item.current_price) > 0.01 && (
                                    <p className="text-xs text-blue-600 mt-1">Price at time of sale</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs text-gray-900">{formatCurrency(item.item_total)}</span>
                              </td>
                              <td className="px-6 py-4">
                                {item.payment_method?.toLowerCase() === 'gcash' ? (
                                  <span className="inline-flex px-3 py-1.5 text-xs rounded-full uppercase" style={{ backgroundColor: '#F8E194', color: '#E2821D' }}>
                                    GCash
                                  </span>
                                ) : (
                                  <span className="inline-flex px-3 py-1.5 text-xs rounded-full uppercase" style={{ backgroundColor: '#A5D8FF', color: '#2B8BE0' }}>
                                    Cash
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  <PaginationControls
                    pagination={detailedSalesPagination}
                    onPageChange={handleDetailedSalesPageChange}
                    dataName="items"
                  />

                  {/* Summary Footer */}
                  <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Showing {detailedSalesPagination.total} item{detailedSalesPagination.total !== 1 ? 's' : ''} from {detailedSalesData.summary?.total_orders || 0} order{detailedSalesData.summary?.total_orders !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600">Total Revenue:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(detailedSalesData.summary?.total_revenue || 0)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Price Breakdown */}
                      {detailedSalesData.priceBreakdown && (
                        <div className="pt-3 border-t border-gray-200">
                          {(detailedSalesData.priceBreakdown.revenue_from_historical_prices || 0) > 0.01 ? (
                            <>
                              <div className="text-xs font-medium text-gray-700 mb-2">Revenue Breakdown by Price Point:</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div className="bg-blue-50 p-3 rounded-lg">
                                  <div className="text-xs text-gray-600 mb-1">Revenue from Historical Prices</div>
                                  <div className="text-base font-semibold text-blue-700">
                                    {formatCurrency(detailedSalesData.priceBreakdown.revenue_from_historical_prices || 0)}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {detailedSalesData.priceBreakdown.items_at_historical_price || 0} item{detailedSalesData.priceBreakdown.items_at_historical_price !== 1 ? 's' : ''} sold at previous prices
                                  </div>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg">
                                  <div className="text-xs text-gray-600 mb-1">Revenue from Current Price</div>
                                  <div className="text-base font-semibold text-green-700">
                                    {formatCurrency(detailedSalesData.priceBreakdown.revenue_from_current_price || 0)}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {detailedSalesData.priceBreakdown.items_at_current_price || 0} item{detailedSalesData.priceBreakdown.items_at_current_price !== 1 ? 's' : ''} sold at current price
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 text-xs text-gray-500 italic">
                                * Historical prices are locked at the time of purchase and never change, even if product prices are updated later.
                              </div>
                            </>
                          ) : (
                            <div className="text-xs font-medium text-gray-700">
                              Total Revenue: {formatCurrency(detailedSalesData.summary?.total_revenue || 0)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">No sales data available</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {dateRange.start_date || dateRange.end_date 
                          ? 'No product sales found for the selected date range'
                          : 'No product sales have been recorded yet. Sales are recorded when orders are marked as "claimed" or "completed".'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


