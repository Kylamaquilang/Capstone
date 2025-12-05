'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState, useCallback, useRef } from 'react';
import API from '@/lib/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSocket } from '@/context/SocketContext';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';
import Swal from '@/lib/sweetalert-config';
import { 
  ChartBarIcon, 
  ExclamationTriangleIcon, 
  CurrencyDollarIcon,
  CubeIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

export default function AdminReportsPage() {
  const { socket, isConnected, joinAdminRoom } = useSocket();
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Separate loading states for each tab to prevent glitch effect
  const [tabLoading, setTabLoading] = useState({
    inventory: false,
    sales: false
  });
  
  // Track if data has been loaded for each tab
  const [dataLoaded, setDataLoaded] = useState({
    inventory: false,
    sales: false
  });
  
  // Date filters
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    period: 'month' // day, month, year
  });

  // Report data states
  const [inventoryData, setInventoryData] = useState([]);
  const [salesData, setSalesData] = useState({});
  
  // Sales report filters
  const [salesFilters, setSalesFilters] = useState({
    product_id: '',
    size: '',
    category_id: ''
  });
  const [availableProducts, setAvailableProducts] = useState([]); // All products from sales
  const [allProducts, setAllProducts] = useState([]); // Full product list with category info
  const [availableSizes, setAvailableSizes] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]); // All categories (not just from sales)
  const prevProductIdRef = useRef('');
  const salesFetchInProgressRef = useRef(false);

  // Fetch inventory data
  const fetchInventoryData = async () => {
    // Only show loading if data hasn't been loaded yet
    const showLoading = !dataLoaded.inventory;
    if (showLoading) {
      setTabLoading(prev => ({ ...prev, inventory: true }));
    }
    
    try {
      setError('');
      
      console.log('Fetching inventory data for reports...');
      
      // Get inventory report with individual size rows
      try {
        const response = await API.get('/stock-movements/reports/current-inventory');
        const inventoryRows = response.data.inventory || [];
        
        if (inventoryRows.length === 0) {
          console.log('No inventory data found');
          setInventoryData([]);
          if (showLoading) {
            setError('No inventory data found. Add some products to see inventory data.');
          }
          return;
        }
        
        console.log(`Found ${inventoryRows.length} inventory rows (including individual sizes)`);
        setInventoryData(inventoryRows);
        setDataLoaded(prev => ({ ...prev, inventory: true }));
        
      } catch (inventoryErr) {
        console.error('Failed to fetch inventory data:', inventoryErr.message);
        throw inventoryErr;
      }
      
    } catch (err) {
      console.error('Inventory error:', err);
      if (showLoading) {
        setError('Failed to fetch inventory data');
      }
      setInventoryData([]);
    } finally {
      if (showLoading) {
        setTabLoading(prev => ({ ...prev, inventory: false }));
      }
    }
  };


  // Fetch all categories (not just from sales)
  const fetchAllCategories = useCallback(async () => {
    try {
      const response = await API.get('/categories');
      setAvailableCategories(response.data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setAvailableCategories([]);
    }
  }, []);

  // Fetch products that have been sold
  const fetchSoldProducts = useCallback(async () => {
    try {
      // Get all sales data to extract unique products with category info
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('start_date', dateFilter.startDate);
      if (dateFilter.endDate) params.append('end_date', dateFilter.endDate);
      
      const response = await API.get(`/orders/detailed-sales-report?${params}`);
      if (response.data?.orderItems && Array.isArray(response.data.orderItems)) {
        // Extract unique products from sales data with category information
        const productMap = new Map();
        
        response.data.orderItems.forEach(item => {
          if (item.product_id && !productMap.has(item.product_id)) {
            productMap.set(item.product_id, {
              id: item.product_id,
              name: item.product_name,
              category_id: item.category_id || null
            });
          }
        });
        
        const productsList = Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setAllProducts(productsList); // Store full list
        setAvailableProducts(productsList); // Initially show all products
      } else {
        setAllProducts([]);
        setAvailableProducts([]);
      }
    } catch (err) {
      console.error('Error fetching sold products:', err);
      setAllProducts([]);
      setAvailableProducts([]);
    }
  }, [dateFilter.startDate, dateFilter.endDate]);

  // Filter products based on selected category
  useEffect(() => {
    if (salesFilters.category_id) {
      // Filter products to show only those from the selected category
      const filtered = allProducts.filter(product => 
        product.category_id && parseInt(product.category_id) === parseInt(salesFilters.category_id)
      );
      setAvailableProducts(filtered);
      
      // Clear product and size filters if selected product doesn't belong to the new category
      if (salesFilters.product_id) {
        const selectedProduct = allProducts.find(p => p.id === parseInt(salesFilters.product_id));
        if (!selectedProduct || selectedProduct.category_id !== parseInt(salesFilters.category_id)) {
          setSalesFilters(prev => ({ ...prev, product_id: '', size: '' }));
        }
      }
    } else {
      // Show all products when no category is selected
      setAvailableProducts(allProducts);
    }
  }, [salesFilters.category_id, allProducts]);

  // Update available sizes when product is selected
  useEffect(() => {
    const currentProductId = salesFilters.product_id;
    
    // Only update if product_id actually changed
    if (prevProductIdRef.current === currentProductId) {
      return;
    }
    
    prevProductIdRef.current = currentProductId;
    
    if (currentProductId && salesData.orderItems) {
      const productId = parseInt(currentProductId);
      
      // Get unique sizes from sales data for the selected product
      const sizesFromSales = salesData.orderItems
        .filter(item => item.product_id === productId)
        .map(item => item.size)
        .filter(size => size && size !== null && size !== undefined && size !== 'NONE' && size !== 'N/A' && size !== '');
      
      const uniqueSizes = [...new Set(sizesFromSales)];
      
      if (uniqueSizes.length > 0) {
        setAvailableSizes(uniqueSizes.sort());
      } else {
        setAvailableSizes([]);
      }
      
      // Reset size filter when product changes
      setSalesFilters(prev => ({ ...prev, size: '' }));
    } else {
      setAvailableSizes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesFilters.product_id, salesData.orderItems]);

  // Fetch sales data (detailed order items)
  const fetchSalesData = useCallback(async () => {
    // Prevent duplicate concurrent fetches to avoid flickering
    if (salesFetchInProgressRef.current) {
      return;
    }
    
    salesFetchInProgressRef.current = true;
    
    // Use a ref to track if this is the initial load to prevent flickering
    const isInitialLoad = !dataLoaded.sales;
    
    // Only show full loading spinner on initial load
    if (isInitialLoad) {
      setTabLoading(prev => ({ ...prev, sales: true }));
    }
    
    try {
      setError('');
      
      // Fetch detailed order items for sales report
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('start_date', dateFilter.startDate);
      if (dateFilter.endDate) params.append('end_date', dateFilter.endDate);
      if (salesFilters.product_id) params.append('product_id', salesFilters.product_id);
      if (salesFilters.size) params.append('size', salesFilters.size);
      if (salesFilters.category_id) params.append('category_id', salesFilters.category_id);
      
      const response = await API.get(`/orders/detailed-sales-report?${params}`);
      
      // Update sales data smoothly without clearing existing data first
      setSalesData(response.data || {
        orderItems: [],
        summary: {
          total_orders: 0,
          total_revenue: 0,
          gcash_orders: 0,
          cash_orders: 0,
          gcash_revenue: 0,
          cash_revenue: 0
        }
      });
      
      // Mark as loaded after successful fetch
      setDataLoaded(prev => ({ ...prev, sales: true }));
    } catch (err) {
      console.error('Sales data error:', err);
      
      // Handle different error types gracefully
      if (isInitialLoad) {
        if (err.response?.status === 400) {
          setError('Invalid date parameters for sales data');
        } else if (err.response?.status === 401) {
          setError('Authentication required to access sales data');
        } else if (err.response?.status === 403) {
          setError('Admin access required for sales data');
        } else if (err.response?.status === 404) {
          setError('Sales report endpoint not found');
        } else if (err.response?.status >= 500) {
          setError('Server error while fetching sales data');
        } else {
          setError('Failed to fetch sales data');
        }
      }
      
      // Set fallback data structure for detailed report
      setSalesData({
        orderItems: [],
        summary: {
          total_orders: 0,
          total_revenue: 0,
          gcash_orders: 0,
          cash_orders: 0,
          gcash_revenue: 0,
          cash_revenue: 0
        }
      });
    } finally {
      // Only hide loading spinner if it was shown (initial load)
      if (isInitialLoad) {
        setTabLoading(prev => ({ ...prev, sales: false }));
      }
      salesFetchInProgressRef.current = false;
    }
  }, [dateFilter.startDate, dateFilter.endDate, salesFilters.product_id, salesFilters.size, salesFilters.category_id, dataLoaded.sales]);



  // Auto-refresh for reports
  useAdminAutoRefresh(() => {
    switch (activeTab) {
      case 'inventory':
        fetchInventoryData();
        break;
      case 'sales':
        fetchSalesData();
        break;
      default:
        break;
    }
  }, 'reports');

  // Reset data loaded flag when filters change (so we refetch with new filters)
  useEffect(() => {
    if (dateFilter.startDate || dateFilter.endDate) {
      setDataLoaded(prev => ({ ...prev, inventory: false, sales: false }));
    }
  }, [dateFilter.startDate, dateFilter.endDate]);

  // Note: Sales data fetching is handled by the main useEffect below
  // This prevents duplicate calls and flickering

  // Load data based on active tab - only show loading on first load
  useEffect(() => {
    switch (activeTab) {
      case 'inventory':
        fetchInventoryData();
        break;
      case 'sales':
        // Fetch all categories, sold products, then sales data
        fetchAllCategories();
        fetchSoldProducts();
        fetchSalesData();
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateFilter.startDate, dateFilter.endDate, salesFilters.product_id, salesFilters.size, salesFilters.category_id]);

  // Set up real-time socket listeners
  useEffect(() => {
    let isMounted = true;

    // Set up Socket.io listeners for real-time updates
    if (socket && isConnected) {
      // Join admin room for real-time updates
      joinAdminRoom();

      // Listen for product updates (affects inventory reports)
      const handleProductUpdate = (productData) => {
        console.log('📦 Real-time product update received in reports:', productData);
        if (isMounted && activeTab === 'inventory') {
          fetchInventoryData();
        }
      };

      // Listen for new products (affects inventory reports)
      const handleNewProduct = (productData) => {
        console.log('📦 Real-time new product received in reports:', productData);
        if (isMounted && activeTab === 'inventory') {
          fetchInventoryData();
        }
      };

      // Listen for product deletions (affects inventory reports)
      const handleProductDelete = (productData) => {
        console.log('🗑️ Real-time product deletion received in reports:', productData);
        if (isMounted && activeTab === 'inventory') {
          fetchInventoryData();
        }
      };

      // Listen for inventory updates (affects inventory reports)
      const handleInventoryUpdate = (inventoryData) => {
        console.log('📦 Real-time inventory update received in reports:', inventoryData);
        if (isMounted && activeTab === 'inventory') {
          fetchInventoryData();
        }
      };

      // Listen for order updates (affects sales reports)
      const handleOrderUpdate = (orderData) => {
        console.log('📦 Real-time order update received in reports:', orderData);
        if (isMounted && activeTab === 'sales') {
            fetchSalesData();
        }
      };

      // Listen for new orders (affects sales reports)
      const handleNewOrder = (orderData) => {
        console.log('🛒 Real-time new order received in reports:', orderData);
        if (isMounted && activeTab === 'sales') {
            fetchSalesData();
        }
      };

      // Listen for admin notifications (might indicate data changes)
      const handleAdminNotification = (notificationData) => {
        console.log('🔔 Real-time admin notification received in reports:', notificationData);
        if (isMounted) {
          // Refresh all reports when admin notifications arrive
          switch (activeTab) {
            case 'inventory':
              fetchInventoryData();
              break;
            case 'sales':
              fetchSalesData();
              break;
            default:
              break;
          }
        }
      };

      // Register socket event listeners
      socket.on('product-updated', handleProductUpdate);
      socket.on('new-product', handleNewProduct);
      socket.on('product-deleted', handleProductDelete);
      socket.on('inventory-updated', handleInventoryUpdate);
      socket.on('admin-order-updated', handleOrderUpdate);
      socket.on('new-order', handleNewOrder);
      socket.on('admin-notification', handleAdminNotification);

      return () => {
        socket.off('product-updated', handleProductUpdate);
        socket.off('new-product', handleNewProduct);
        socket.off('product-deleted', handleProductDelete);
        socket.off('inventory-updated', handleInventoryUpdate);
        socket.off('admin-order-updated', handleOrderUpdate);
        socket.off('new-order', handleNewOrder);
        socket.off('admin-notification', handleAdminNotification);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [socket, isConnected, joinAdminRoom, activeTab, fetchSalesData]);

  // Print function
  const handlePrint = () => {
    const printContent = generatePrintContent();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Download function
  const handleDownload = async () => {
    try {
      const reportData = getReportData();
      const pdf = generatePDFDocument(reportData);
      
      pdf.save(`${getReportTitle()}-${new Date().toISOString().split('T')[0]}.pdf`);
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

  // Generate PDF document
  const generatePDFDocument = (reportData) => {
    const reportTitle = getReportTitle();
    const reportDescription = getReportDescription();
    const currentDate = new Date().toLocaleString();
    
    // Create new PDF document
    const pdf = new jsPDF();
    
    // Set font
    pdf.setFont('helvetica');
    
    // Add title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(reportTitle, 20, 30);
    
    // Add description
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(reportDescription, 20, 45);
    
    // Add generation date
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${currentDate}`, 20, 60);
    
    // Add date filters
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Date Filters Applied:', 20, 80);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Start Date: ${dateFilter.startDate || 'Not specified'}`, 20, 95);
    pdf.text(`End Date: ${dateFilter.endDate || 'Not specified'}`, 20, 105);
    pdf.text(`Period: ${dateFilter.period || 'Not specified'}`, 20, 115);
    
    // Add report-specific content
    let yPosition = 135;
    
    switch (activeTab) {
      case 'inventory':
        yPosition = generateInventoryPDF(pdf, reportData, yPosition);
        break;
      case 'sales':
        yPosition = generateSalesPDF(pdf, reportData, yPosition);
        break;
      default:
        pdf.setFontSize(12);
        pdf.text('No data available for this report.', 20, yPosition);
    }
    
    return pdf;
  };

  // Generate DOC content (keeping for print functionality)
  const generateDocContent = (reportData) => {
    const reportTitle = getReportTitle();
    const reportDescription = getReportDescription();
    const currentDate = new Date().toLocaleString();
    
    let content = '';
    
    // Header
    content += `${reportTitle}\n`;
    content += `${reportDescription}\n`;
    content += `Generated on: ${currentDate}\n\n`;
    
    // Date Filters
    content += `Date Filters Applied:\n`;
    content += `Start Date: ${dateFilter.startDate || 'Not specified'}\n`;
    content += `End Date: ${dateFilter.endDate || 'Not specified'}\n`;
    content += `Period: ${dateFilter.period || 'Not specified'}\n\n`;
    
    // Report Content
    switch (activeTab) {
      case 'inventory':
        content += generateInventoryDoc(reportData);
        break;
      case 'sales':
        content += generateSalesDoc(reportData);
        break;
      default:
        content += 'No data available for this report.\n';
    }
    
    return content;
  };

  // Generate print/download content
  const generatePrintContent = () => {
    const reportData = getReportData();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${getReportTitle()} - ${new Date().toLocaleDateString()}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
            line-height: 1.4;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #000C50;
            padding-bottom: 20px;
        }
        .header h1 { 
            color: #000C50; 
            margin-bottom: 5px; 
            font-size: 28px;
            font-weight: bold;
        }
        .header p { 
            color: #666; 
            margin: 0; 
            font-size: 14px;
        }
        .report-date { 
            text-align: right; 
            margin-bottom: 20px; 
            color: #666; 
            font-size: 12px;
        }
        .date-filters {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #000C50;
        }
        .date-filters h3 {
            margin: 0 0 10px 0;
            color: #000C50;
            font-size: 16px;
        }
        .date-filters p {
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
            background-color: #f2f2f2; 
            font-weight: bold; 
            color: #000C50;
        }
        .summary-cards { 
            display: flex; 
            gap: 20px; 
            margin-bottom: 20px; 
            flex-wrap: wrap; 
        }
        .summary-card { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
            min-width: 150px; 
            border: 1px solid #ddd;
        }
        .summary-card h3 { 
            margin: 0 0 5px 0; 
            color: #000C50; 
            font-size: 24px;
            font-weight: bold;
        }
        .summary-card p { 
            margin: 0; 
            color: #666; 
            font-size: 12px;
        }
        .no-data { 
            text-align: center; 
            color: #666; 
            font-style: italic; 
            padding: 20px; 
            background: #f8f9fa;
            border-radius: 5px;
        }
        .product-image {
            width: 40px;
            height: 40px;
            object-fit: cover;
            border-radius: 4px;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        }
        .status-out-of-stock {
            background-color: #fee2e2;
            color: #dc2626;
        }
        .status-low-stock {
            background-color: #fef3c7;
            color: #d97706;
        }
        @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            table { page-break-inside: avoid; }
            .summary-cards { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${getReportTitle()}</h1>
        <p>${getReportDescription()}</p>
    </div>
    <div class="report-date">
        Generated on: ${new Date().toLocaleString()}
    </div>
    <div class="date-filters">
        <h3>Date Filters Applied</h3>
        <p><strong>Start Date:</strong> ${dateFilter.startDate || 'Not specified'}</p>
        <p><strong>End Date:</strong> ${dateFilter.endDate || 'Not specified'}</p>
        <p><strong>Period:</strong> ${dateFilter.period || 'Not specified'}</p>
    </div>
    ${generateReportHTML(reportData)}
</body>
</html>`;
  };

  // Helper functions for download
  const getReportTitle = () => {
    switch (activeTab) {
      case 'inventory': return 'Inventory Report';
      case 'sales': return 'Sales Report';
      default: return 'Business Report';
    }
  };

  const getReportDescription = () => {
    switch (activeTab) {
      case 'inventory': return 'Current stock levels of all products';
      case 'sales': return `Sales performance by ${dateFilter.period}`;
      default: return 'Business analytics report';
    }
  };

  const getReportData = () => {
    switch (activeTab) {
      case 'inventory': return inventoryData;
      case 'sales': return salesData;
      default: return {};
    }
  };

  const generateReportHTML = (data) => {
    switch (activeTab) {
      case 'inventory':
        return generateInventoryHTML(data);
      case 'sales':
        return generateSalesHTML(data);
      default:
        return '<div class="no-data">No data available</div>';
    }
  };

  const generateInventoryHTML = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return '<div class="no-data">No inventory data found</div>';
    }

    return `
      <table>
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Category</th>
            <th>Size/Variant</th>
            <th>Base Stock</th>
            <th>Current Stock</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              <td style="font-weight: 500;">${item.product_name}</td>
              <td>${item.category_name || 'N/A'}</td>
              <td>${item.size && item.size !== 'No sizes' ? item.size : 'N/A'}</td>
              <td style="text-align: center; color: #666;">${item.base_stock || 0}</td>
              <td style="text-align: center; font-weight: 500;">${item.current_stock || 0}</td>
              <td>
                <span class="status-badge ${item.stock_status === 'Out of Stock' ? 'status-out-of-stock' : item.stock_status === 'Low Stock' ? 'status-low-stock' : 'status-good'}">
                  ${item.stock_status}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const generateRestockHTML = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return '<div class="no-data">No restock data found</div>';
    }

    return `
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Product Name</th>
            <th>Size/Variant</th>
            <th>Quantity Added</th>
            <th>Stock Before</th>
            <th>Stock After</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              <td>
                <div style="font-weight: 500;">${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div style="font-size: 11px; color: #666;">${new Date(item.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
              </td>
              <td style="font-weight: 600;">${item.product_name}</td>
              <td>
                ${item.size 
                  ? `<span style="display: inline-block; padding: 4px 10px; background: #DBEAFE; color: #1E40AF; border-radius: 4px; font-size: 11px; font-weight: 600;">${item.size}</span>`
                  : '<span style="font-style: italic; color: #9CA3AF; font-size: 11px;">No size specified</span>'
                }
              </td>
              <td style="text-align: center;">
                <span style="display: inline-block; padding: 4px 10px; background: #D1FAE5; color: #065F46; border-radius: 12px; font-weight: bold; font-size: 12px;">+${item.quantity}</span>
              </td>
              <td style="text-align: center; color: #666;">${item.stock_before}</td>
              <td style="text-align: center; font-weight: 600;">${item.stock_after}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const generateSalesHTML = (data) => {
    if (!data.orderItems || !Array.isArray(data.orderItems) || data.orderItems.length === 0) {
      return '<div class="no-data">No sales data available for the selected period</div>';
    }

    return `
      ${data.summary ? `
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #000C50;">Summary</h3>
          <p style="margin: 5px 0;"><strong>Total Orders:</strong> ${data.summary.total_orders || 0}</p>
          <p style="margin: 5px 0;"><strong>Total Revenue:</strong> ${formatCurrency(data.summary.total_revenue || 0)}</p>
        </div>
      ` : ''}
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Product Name</th>
            <th>Size</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
            <th>Payment</th>
          </tr>
        </thead>
        <tbody>
          ${data.orderItems.map(item => `
            <tr>
              <td>${formatDate(item.order_date)}</td>
              <td style="font-weight: 500;">${item.product_name}</td>
              <td>${item.size || 'N/A'}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">${formatCurrency(item.unit_price)}</td>
              <td style="text-align: right; font-weight: 500;">${formatCurrency(item.item_total)}</td>
              <td style="text-align: center;">${item.payment_method?.toUpperCase() || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };


  const generateRevenueHTML = (data) => {
    if (data.salesData && Array.isArray(data.salesData) && data.salesData.length > 0) {
      return `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>Cost</th>
              <th>Profit</th>
              <th>Margin %</th>
            </tr>
          </thead>
          <tbody>
            ${data.salesData.map(item => `
              <tr>
                <td style="font-weight: 500;">${formatDate(item.date)}</td>
                <td style="text-align: center;">${item.total_orders}</td>
                <td style="text-align: right; font-weight: 500;">${formatCurrency(item.total_revenue)}</td>
                <td style="text-align: right;">${formatCurrency(item.total_cost)}</td>
                <td style="text-align: right; font-weight: 500;">${formatCurrency(item.total_profit)}</td>
                <td style="text-align: center;">${item.profit_margin_percent}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      return '<div class="no-data">No revenue data available</div>';
    }
  };

  // Generate PDF content for each report type
  const generateInventoryPDF = (pdf, data, yPosition) => {
    if (!Array.isArray(data) || data.length === 0) {
      pdf.setFontSize(12);
      pdf.text('No inventory data found.', 20, yPosition);
      return yPosition + 20;
    }

    // Add section title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Inventory Report', 20, yPosition);
    yPosition += 20;

    // Prepare table data
    const tableData = data.map(item => [
      item.product_name || 'N/A',
      item.category_name || 'N/A',
      item.size && item.size !== 'No sizes' ? item.size : 'N/A',
      item.base_stock?.toString() || '0',
      item.current_stock?.toString() || '0',
      item.stock_status || 'N/A'
    ]);

    // Create table
    autoTable(pdf, {
      startY: yPosition,
      head: [['Product Name', 'Category', 'Size', 'Base Stock', 'Current Stock', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 12, 80] },
      styles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 35 },
        2: { cellWidth: 20 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 26 }
      }
    });

    return pdf.lastAutoTable.finalY + 20;
  };


  const generateLowStockPDF = (pdf, data, yPosition) => {
    if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
      pdf.setFontSize(12);
      pdf.text('No low stock products found.', 20, yPosition);
      return yPosition + 20;
    }

    // Add section title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Low Stock Products', 20, yPosition);
    yPosition += 20;

    // Prepare table data
    const tableData = data.products.map(product => [
      product.name || 'N/A',
      product.category_name || 'N/A',
      product.stock?.toString() || '0',
      formatCurrency(product.price),
      product.stock === 0 ? 'Out of Stock' : 'Low Stock'
    ]);

    // Create table
    autoTable(pdf, {
      startY: yPosition,
      head: [['Product Name', 'Category', 'Current Stock', 'Price', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 12, 80] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 }
      }
    });

    return pdf.lastAutoTable.finalY + 20;
  };

  const generateSalesPDF = (pdf, data, yPosition) => {
    if (!data.orderItems || !Array.isArray(data.orderItems) || data.orderItems.length === 0) {
      pdf.setFontSize(12);
      pdf.text('No sales data available for the selected period.', 20, yPosition);
      return yPosition + 20;
    }

    // Add section title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Sales Report - Product Sales Details', 20, yPosition);
    yPosition += 10;

    // Add summary info
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Orders: ${data.summary?.total_orders || 0}`, 20, yPosition);
    yPosition += 7;
    pdf.text(`Total Revenue: ${formatCurrency(data.summary?.total_revenue || 0)}`, 20, yPosition);
    yPosition += 15;

    // Prepare table data
    const tableData = data.orderItems.map(item => [
      new Date(item.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      item.product_name || 'N/A',
      item.size || '—',
      item.quantity?.toString() || '0',
      formatCurrency(item.unit_price || 0),
      formatCurrency(item.item_total || 0),
      (item.payment_method?.toUpperCase() || 'N/A')
    ]);

    // Create table
    autoTable(pdf, {
      startY: yPosition,
      head: [['Date', 'Product Name', 'Size', 'Qty', 'Unit Price', 'Total', 'Payment']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 12, 80], fontSize: 8 },
      styles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 50 },
        2: { cellWidth: 20 },
        3: { cellWidth: 15 },
        4: { cellWidth: 24 },
        5: { cellWidth: 24 },
        6: { cellWidth: 22 }
      }
    });

    return pdf.lastAutoTable.finalY + 20;
  };


  const generateRevenuePDF = (pdf, data, yPosition) => {
    if (!data.salesData || !Array.isArray(data.salesData) || data.salesData.length === 0) {
      pdf.setFontSize(12);
      pdf.text('No revenue data available.', 20, yPosition);
      return yPosition + 20;
    }

    // Add section title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Revenue & Profit Report', 20, yPosition);
    yPosition += 20;

    // Prepare table data
    const tableData = data.salesData.map(item => [
      formatDate(item.date),
      item.total_orders?.toString() || '0',
      formatCurrency(item.total_revenue),
      formatCurrency(item.total_cost),
      formatCurrency(item.total_profit),
      `${item.profit_margin_percent || 0}%`
    ]);

    // Create table
    autoTable(pdf, {
      startY: yPosition,
      head: [['Date', 'Orders', 'Revenue', 'Cost', 'Profit', 'Margin %']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 12, 80] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 20 }
      }
    });

    return pdf.lastAutoTable.finalY + 20;
  };

  // Generate DOC content for each report type (keeping for print functionality)
  const generateInventoryDoc = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return 'No inventory data found.\n';
    }

    let content = 'INVENTORY REPORT\n';
    content += '================\n\n';
    
    data.forEach((item, index) => {
      content += `${index + 1}. ${item.product_name}\n`;
      content += `   Category: ${item.category_name || 'N/A'}\n`;
      content += `   Size/Variant: ${item.size && item.size !== 'No sizes' ? item.size : 'N/A'}\n`;
      content += `   Base Stock: ${item.base_stock || 0}\n`;
      content += `   Current Stock: ${item.current_stock || 0}\n`;
      content += `   Status: ${item.stock_status}\n\n`;
    });
    
    return content;
  };


  const generateSalesDoc = (data) => {
    if (!data.orderItems || !Array.isArray(data.orderItems) || data.orderItems.length === 0) {
      return 'No sales data available for the selected period.\n';
    }

    let content = 'SALES REPORT\n';
    content += '============\n\n';
    
    if (data.summary) {
      content += `Total Orders: ${data.summary.total_orders || 0}\n`;
      content += `Total Revenue: ${formatCurrency(data.summary.total_revenue || 0)}\n\n`;
    }
    
    content += 'Product Sales Details:\n\n';
    
    data.orderItems.forEach((item, index) => {
      content += `${index + 1}. ${item.product_name}\n`;
      content += `   Date: ${formatDate(item.order_date)}\n`;
      content += `   Size: ${item.size || 'N/A'}\n`;
      content += `   Quantity: ${item.quantity}\n`;
      content += `   Unit Price: ${formatCurrency(item.unit_price)}\n`;
      content += `   Total: ${formatCurrency(item.item_total)}\n`;
      content += `   Payment Method: ${item.payment_method?.toUpperCase() || 'N/A'}\n\n`;
    });
    
    return content;
  };



  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const tabs = [
    { id: 'inventory', label: 'Inventory Report', icon: CubeIcon },
    { id: 'sales', label: 'Sales Report', icon: ChartBarIcon }
  ];

  return (
    <div className="flex flex-col min-h-screen text-black admin-page">
      <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="flex flex-1 pt-16 lg:pt-20">
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 flex flex-col bg-gray-50 p-3 sm:p-6 overflow-auto lg:ml-64 ml-0">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Comprehensive business reports and analytics
                </p>
              </div>
            </div>
          </div>

          {/* Date Filters */}
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-900">Date Filters</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Period
                </label>
                <select
                  value={dateFilter.period}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, period: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
                >
                  <option value="day">Daily</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDateFilter({
                      startDate: '',
                      endDate: '',
                      period: 'month'
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-[#000C50] text-[#000C50]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Report Content */}
          <div id="report-content" className="bg-white rounded-lg shadow-sm border border-gray-200 relative">
            {/* Subtle loading overlay - only shows if tab is loading and no data exists */}
            {tabLoading[activeTab] && !dataLoaded[activeTab] && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#000C50] mx-auto mb-4"></div>
                  <div className="text-sm text-gray-600">Loading report...</div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              </div>
            )}

            {!error && (
              <>
                {/* Inventory Report */}
                {activeTab === 'inventory' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header Section */}
                    <div className="px-6 py-5 bg-white border-b border-gray-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">Inventory Report</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Search Input */}
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search products..."
                              className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                            />
                            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          {/* Download Button */}
                          <button
                            onClick={handleDownload}
                            className="px-4 py-2 text-sm bg-[#000C50] text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead style={{ backgroundColor: '#F6F6F6' }}>
                          <tr>
                            <th className="px-6 py-4 text-left">
                              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product Name</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Size/Variant</th>
                            <th className="px-6 py-4 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Base Stock</th>
                            <th className="px-6 py-4 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Current Stock</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {Array.isArray(inventoryData) && inventoryData.length > 0 ? (
                            inventoryData.map((item, index) => (
                              <tr key={item.id || index} className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : ''}`} style={index % 2 !== 0 ? { backgroundColor: '#F6F6F6' } : {}}>
                                <td className="px-6 py-4">
                                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-xs text-gray-900 uppercase">{item.product_name}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex px-2.5 py-1 text-xs rounded-full uppercase" style={{ backgroundColor: '#A5D8FF', color: '#0464C5' }}>
                                    {item.category_name || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  {item.size && item.size !== 'No sizes' ? (
                                    <span className="inline-flex px-2.5 py-1 text-xs text-black uppercase">
                                      {item.size}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-black">N/A</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-600 text-center">
                                  {item.base_stock || 0}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-900 text-center">
                                  {item.current_stock || 0}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex px-2.5 py-1 text-xs rounded-full" style={
                                    item.stock_status === 'Out of Stock'
                                      ? { backgroundColor: '#FEF2F2', color: '#991B1B' }
                                      : item.stock_status === 'Low Stock'
                                      ? { backgroundColor: '#F8E194', color: '#E2821D' }
                                      : { backgroundColor: '#ABE8BA', color: '#059C2B' }
                                  }>
                                    {item.stock_status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="7" className="px-6 py-12 text-center">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">No inventory data found</p>
                                    <p className="text-xs text-gray-500">No products available</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600">Rows per page:</span>
                          <select className="text-sm border border-gray-200 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option>10</option>
                            <option>25</option>
                            <option>50</option>
                            <option>100</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600">
                            {Array.isArray(inventoryData) && inventoryData.length > 0 ? `1-${Math.min(10, inventoryData.length)} of ${inventoryData.length}` : '0 of 0'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                  </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                {/* Sales Report */}
                {activeTab === 'sales' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header Section */}
                    <div className="px-6 py-5 border-b border-gray-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">Sales Report</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Download Button */}
                          <button
                            onClick={handleDownload}
                            className="px-4 py-2 text-sm bg-[#000C50] text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
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
                            value={salesFilters.category_id}
                            onChange={(e) => {
                              const newCategoryId = e.target.value;
                              // Only clear product_id if the selected product doesn't belong to the new category
                              const selectedProduct = allProducts.find(p => p.id === parseInt(salesFilters.product_id));
                              const shouldClearProduct = newCategoryId && selectedProduct && selectedProduct.category_id !== parseInt(newCategoryId);
                              
                              setSalesFilters(prev => ({
                                ...prev,
                                category_id: newCategoryId,
                                product_id: shouldClearProduct ? '' : prev.product_id,
                                size: shouldClearProduct ? '' : prev.size
                              }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">All Categories</option>
                            {availableCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="w-full sm:w-auto sm:min-w-[180px] sm:max-w-[250px]">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Product Name</label>
                          <select
                            value={salesFilters.product_id}
                            onChange={(e) => setSalesFilters({ ...salesFilters, product_id: e.target.value, size: '' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">All Products</option>
                            {availableProducts.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {salesFilters.product_id && (
                          <div className="w-full sm:w-auto sm:min-w-[120px] sm:max-w-[180px]">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Filter by Size
                              {availableSizes.length === 0 && (
                                <span className="text-gray-400 text-xs ml-1">(No sizes available)</span>
                              )}
                            </label>
                            {availableSizes.length > 0 ? (
                              <select
                                value={salesFilters.size}
                                onChange={(e) => setSalesFilters({ ...salesFilters, size: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">All Sizes</option>
                                {availableSizes.map((size) => (
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
                        
                        <div className="flex items-end">
                          <button
                            onClick={() => {
                              setSalesFilters({ product_id: '', size: '', category_id: '' });
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors whitespace-nowrap h-[38px]"
                          >
                            Clear Filters
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    {salesData.orderItems && Array.isArray(salesData.orderItems) && salesData.orderItems.length > 0 ? (
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
                              {salesData.orderItems.map((item, index) => (
                                <tr key={index} className={`hover:bg-green-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : ''}`} style={index % 2 !== 0 ? { backgroundColor: '#F6F6F6' } : {}}>
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
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Summary Footer */}
                        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                Showing {salesData.orderItems.length} item{salesData.orderItems.length !== 1 ? 's' : ''} from {salesData.summary?.total_orders || 0} order{salesData.summary?.total_orders !== 1 ? 's' : ''}
                              </span>
                              <div className="flex items-center gap-4">
                                <span className="text-gray-600">Total Revenue:</span>
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(salesData.summary?.total_revenue || 0)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Price Breakdown */}
                            {salesData.priceBreakdown && (
                              <div className="pt-3 border-t border-gray-200">
                                {/* Only show breakdown if there are historical prices */}
                                {(salesData.priceBreakdown.revenue_from_historical_prices || 0) > 0.01 ? (
                                  <>
                                    <div className="text-xs font-medium text-gray-700 mb-2">Revenue Breakdown by Price Point:</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                      <div className="bg-blue-50 p-3 rounded-lg">
                                        <div className="text-xs text-gray-600 mb-1">Revenue from Historical Prices</div>
                                        <div className="text-base font-semibold text-blue-700">
                                          {formatCurrency(salesData.priceBreakdown.revenue_from_historical_prices || 0)}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {salesData.priceBreakdown.items_at_historical_price || 0} item{salesData.priceBreakdown.items_at_historical_price !== 1 ? 's' : ''} sold at previous prices
                                        </div>
                                      </div>
                                      <div className="bg-green-50 p-3 rounded-lg">
                                        <div className="text-xs text-gray-600 mb-1">Revenue from Current Price</div>
                                        <div className="text-base font-semibold text-green-700">
                                          {formatCurrency(salesData.priceBreakdown.revenue_from_current_price || 0)}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {salesData.priceBreakdown.items_at_current_price || 0} item{salesData.priceBreakdown.items_at_current_price !== 1 ? 's' : ''} sold at current price
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500 italic">
                                      * Historical prices are locked at the time of purchase and never change, even if product prices are updated later.
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-xs font-medium text-gray-700">
                                    Total Revenue: {formatCurrency(salesData.summary?.total_revenue || 0)}
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
                              {dateFilter.startDate || dateFilter.endDate 
                                ? 'No product sales found for the selected date range'
                                : 'No product sales have been recorded yet. Sales are recorded when orders are marked as "claimed" or "completed".'}
                            </p>
                            {error && (
                              <p className="text-xs text-red-500 mt-2">{error}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* Revenue & Profit Report */}
                {activeTab === 'revenue' && (
                  <div className="p-6">
                    <div className="mb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Revenue & Profit Report</h2>
                          <p className="text-sm text-gray-600">Financial performance analysis</p>
                        </div>
                        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                          <button
                            onClick={handlePrint}
                            className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <PrinterIcon className="h-4 w-4" />
                            <span>Print</span>
                          </button>
                          <button
                            onClick={handleDownload}
                            className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    {revenueData.summary && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(revenueData.summary.total_revenue)}
                          </div>
                          <div className="text-sm text-green-800">Total Revenue</div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(revenueData.summary.total_cost)}
                          </div>
                          <div className="text-sm text-blue-800">Total Cost</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {formatCurrency(revenueData.summary.total_profit)}
                          </div>
                          <div className="text-sm text-purple-800">Total Profit</div>
                        </div>
                      </div>
                    )}
                    {revenueData.salesData && Array.isArray(revenueData.salesData) && revenueData.salesData.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Orders
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Revenue
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Cost
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Profit
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Margin %
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {revenueData.salesData.map((item, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatDate(item.date)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item.total_orders}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(item.total_revenue)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(item.total_cost)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(item.total_profit)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item.profit_margin_percent}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

