'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSocket } from '@/context/SocketContext';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';
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
  
  // Date filters
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    period: 'month' // day, month, year
  });

  // Report data states
  const [inventoryData, setInventoryData] = useState([]);
  const [restockData, setRestockData] = useState([]);
  const [salesData, setSalesData] = useState({});

  // Fetch inventory data
  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching inventory data for reports...');
      
      // Get all products with detailed information
      let allProducts = [];
      let productsWithSizes = [];
      
      // Step 1: Get all products
      try {
        console.log('Fetching all products...');
        const productsRes = await API.get('/products');
        allProducts = productsRes.data || [];
        
        if (allProducts.length === 0) {
          console.log('No products found in database');
          setInventoryData([]);
          setError('No products found. Add some products to see inventory data.');
          return;
        }
        
        console.log(`Found ${allProducts.length} products`);
      } catch (productsErr) {
        console.error('Failed to fetch products:', productsErr.message);
        throw productsErr;
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
      
      console.log('Setting inventory data for reports:', productsWithSizes.length);
      setInventoryData(productsWithSizes);
      
    } catch (err) {
      console.error('Inventory error:', err);
      setError('Failed to fetch inventory data');
      setInventoryData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch restock data
  const fetchRestockData = async () => {
    try {
      setLoading(true);
      setError('');
      // For now, we'll use a placeholder since restock history endpoint doesn't exist yet
      setRestockData([]);
    } catch (err) {
      console.error('Restock error:', err);
      setError('Failed to fetch restock data');
      setRestockData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sales data
  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use URLSearchParams like the working sales page
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('start_date', dateFilter.startDate);
      if (dateFilter.endDate) params.append('end_date', dateFilter.endDate);
      if (dateFilter.period) params.append('group_by', dateFilter.period);
      
      const response = await API.get(`/orders/sales-performance/public?${params}`);
      setSalesData(response.data || {});
    } catch (err) {
      console.error('Sales data error:', err);
      
      // Handle different error types gracefully
      if (err.response?.status === 400) {
        setError('Invalid date parameters for sales data');
      } else if (err.response?.status === 401) {
        setError('Authentication required to access sales data');
      } else if (err.response?.status === 403) {
        setError('Admin access required for sales data');
      } else if (err.response?.status === 404) {
        setError('Sales performance endpoint not found');
      } else if (err.response?.status >= 500) {
        setError('Server error while fetching sales data');
      } else {
        setError('Failed to fetch sales data');
      }
      
      // Set fallback data structure
      setSalesData({
        salesData: [],
        topProducts: [],
        paymentBreakdown: [],
        inventorySummary: [],
        salesLogsSummary: {},
        summary: {
          total_orders: 0,
          total_revenue: 0,
          avg_order_value: 0,
          gcash_orders: 0,
          cash_orders: 0,
          gcash_revenue: 0,
          cash_revenue: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };



  // Auto-refresh for reports
  useAdminAutoRefresh(() => {
    switch (activeTab) {
      case 'inventory':
        fetchInventoryData();
        break;
      case 'restock':
        fetchRestockData();
        break;
      case 'sales':
        fetchSalesData();
        break;
      default:
        break;
    }
  }, 'reports');

  // Load data based on active tab
  useEffect(() => {
    switch (activeTab) {
      case 'inventory':
        fetchInventoryData();
        break;
      case 'restock':
        fetchRestockData();
        break;
      case 'sales':
        // Set default start date to 2025-01-01 for sales report
        if (!dateFilter.startDate) {
          setDateFilter(prev => ({ ...prev, startDate: '2025-01-01' }));
        }
        fetchSalesData();
        break;
      default:
        break;
    }
  }, [activeTab, dateFilter]);

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
        if (isMounted && (activeTab === 'inventory' || activeTab === 'restock')) {
          if (activeTab === 'inventory') {
            fetchInventoryData();
          }
          if (activeTab === 'restock') {
            fetchRestockData();
          }
        }
      };

      // Listen for new products (affects inventory reports)
      const handleNewProduct = (productData) => {
        console.log('📦 Real-time new product received in reports:', productData);
        if (isMounted && (activeTab === 'inventory' || activeTab === 'restock')) {
          if (activeTab === 'inventory') {
            fetchInventoryData();
          }
          if (activeTab === 'restock') {
            fetchRestockData();
          }
        }
      };

      // Listen for product deletions (affects inventory reports)
      const handleProductDelete = (productData) => {
        console.log('🗑️ Real-time product deletion received in reports:', productData);
        if (isMounted && (activeTab === 'inventory' || activeTab === 'restock')) {
          if (activeTab === 'inventory') {
            fetchInventoryData();
          }
          if (activeTab === 'restock') {
            fetchRestockData();
          }
        }
      };

      // Listen for inventory updates (affects inventory reports)
      const handleInventoryUpdate = (inventoryData) => {
        console.log('📦 Real-time inventory update received in reports:', inventoryData);
        if (isMounted && (activeTab === 'inventory' || activeTab === 'restock')) {
          if (activeTab === 'inventory') {
            fetchInventoryData();
          }
          if (activeTab === 'restock') {
            fetchRestockData();
          }
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
            case 'restock':
              fetchRestockData();
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
  }, [socket, isConnected, joinAdminRoom, activeTab]);

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
  const handleDownload = () => {
    try {
      const reportData = getReportData();
      const pdf = generatePDFDocument(reportData);
      
      pdf.save(`${getReportTitle()}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
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
      case 'low-stock':
        yPosition = generateLowStockPDF(pdf, reportData, yPosition);
        break;
      case 'sales':
        yPosition = generateSalesPDF(pdf, reportData, yPosition);
        break;
      case 'revenue':
        yPosition = generateRevenuePDF(pdf, reportData, yPosition);
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
      case 'low-stock':
        content += generateLowStockDoc(reportData);
        break;
      case 'sales':
        content += generateSalesDoc(reportData);
        break;
      case 'revenue':
        content += generateRevenueDoc(reportData);
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
      case 'restock': return 'Restock Report';
      case 'sales': return 'Sales Report';
      default: return 'Business Report';
    }
  };

  const getReportDescription = () => {
    switch (activeTab) {
      case 'inventory': return 'Current stock levels of all products';
      case 'restock': return 'History of restocked items';
      case 'sales': return `Sales performance by ${dateFilter.period}`;
      default: return 'Business analytics report';
    }
  };

  const getReportData = () => {
    switch (activeTab) {
      case 'inventory': return inventoryData;
      case 'restock': return restockData;
      case 'sales': return salesData;
      default: return {};
    }
  };

  const generateReportHTML = (data) => {
    switch (activeTab) {
      case 'inventory':
        return generateInventoryHTML(data);
      case 'restock':
        return generateRestockHTML(data);
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
            <th>Product ID</th>
            <th>Product Name</th>
            <th>Category</th>
            <th>Size/Variant</th>
            <th>Unit</th>
            <th>Qty in Stock</th>
            <th>Reorder Level</th>
            <th>Cost Price</th>
            <th>Selling Price</th>
            <th>Supplier</th>
            <th>Status</th>
            <th>Date Added</th>
            <th>Last Restock</th>
            <th>Updated By</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(product => `
            <tr>
              <td style="font-family: monospace;">${product.product_code || `PRD${String(product.id).padStart(3, '0')}`}</td>
              <td style="font-weight: 500;">${product.name}</td>
              <td>${product.category_name || product.category || 'N/A'}</td>
              <td>${product.sizes && product.sizes.length > 0 ? product.sizes.map(size => size.size).join(', ') : 'N/A'}</td>
              <td>${product.unit_of_measure || 'pcs'}</td>
              <td style="text-align: center; font-weight: 500;">${product.stock || 0}</td>
              <td style="text-align: center;">${product.reorder_level || 5}</td>
              <td style="text-align: right;">${formatCurrency(product.original_price || 0)}</td>
              <td style="text-align: right;">${formatCurrency(product.price || 0)}</td>
              <td>${product.supplier || 'N/A'}</td>
              <td>
                <span class="status-badge ${product.stock === 0 ? 'status-out-of-stock' : product.stock <= (product.reorder_level || 5) ? 'status-low-stock' : 'status-good'}">
                  ${product.stock === 0 ? 'Out of Stock' : product.stock <= (product.reorder_level || 5) ? 'Low Stock' : 'In Stock'}
                </span>
              </td>
              <td>${product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}</td>
              <td>${product.last_restock_date ? new Date(product.last_restock_date).toLocaleDateString() : 'N/A'}</td>
              <td>${product.updated_by || 'N/A'}</td>
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
            <th>Date</th>
            <th>Product</th>
            <th>Quantity</th>
            <th>Supplier</th>
            <th>Admin</th>
            <th>Stock Before</th>
            <th>Stock After</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              <td>${formatDate(item.date)}</td>
              <td>${item.product_name}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td>${item.supplier || 'N/A'}</td>
              <td>${item.admin_name || 'N/A'}</td>
              <td style="text-align: center;">${item.stock_before}</td>
              <td style="text-align: center;">${item.stock_after}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const generateSalesHTML = (data) => {
    if (!data.salesData || !Array.isArray(data.salesData) || data.salesData.length === 0) {
      return '<div class="no-data">No sales data available for the selected period</div>';
    }

    return `
      <table>
        <thead>
          <tr>
            <th>Period</th>
            <th>Orders</th>
            <th>Revenue</th>
            <th>Avg Order Value</th>
            <th>GCash Orders</th>
            <th>Cash Orders</th>
          </tr>
        </thead>
        <tbody>
          ${data.salesData.map(item => `
            <tr>
              <td style="font-weight: 500;">${item.period}</td>
              <td style="text-align: center;">${item.orders}</td>
              <td style="text-align: right; font-weight: 500;">${formatCurrency(item.revenue)}</td>
              <td style="text-align: right;">${formatCurrency(item.avg_order_value)}</td>
              <td style="text-align: center;">${item.gcash_orders}</td>
              <td style="text-align: center;">${item.cash_orders}</td>
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
    if (!data.salesData || !Array.isArray(data.salesData) || data.salesData.length === 0) {
      pdf.setFontSize(12);
      pdf.text('No sales data available for the selected period.', 20, yPosition);
      return yPosition + 20;
    }

    // Add section title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Sales Report', 20, yPosition);
    yPosition += 20;

    // Prepare table data
    const tableData = data.salesData.map(item => [
      item.period || 'N/A',
      item.orders?.toString() || '0',
      formatCurrency(item.revenue),
      formatCurrency(item.avg_order_value),
      item.gcash_orders?.toString() || '0',
      item.cash_orders?.toString() || '0'
    ]);

    // Create table
    autoTable(pdf, {
      startY: yPosition,
      head: [['Period', 'Orders', 'Revenue', 'Avg Order Value', 'GCash Orders', 'Cash Orders']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 12, 80] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 }
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
    
    data.forEach((product, index) => {
      content += `${index + 1}. ${product.name}\n`;
      content += `   Product ID: ${product.product_code || `PRD${String(product.id).padStart(3, '0')}`}\n`;
      content += `   Category: ${product.category_name || product.category || 'N/A'}\n`;
      content += `   Size/Variant: ${product.sizes && product.sizes.length > 0 ? product.sizes.map(size => size.size).join(', ') : 'N/A'}\n`;
      content += `   Unit: ${product.unit_of_measure || 'pcs'}\n`;
      content += `   Qty in Stock: ${product.stock || 0}\n`;
      content += `   Reorder Level: ${product.reorder_level || 5}\n`;
      content += `   Cost Price: ${formatCurrency(product.original_price || 0)}\n`;
      content += `   Selling Price: ${formatCurrency(product.price || 0)}\n`;
      content += `   Supplier: ${product.supplier || 'N/A'}\n`;
      content += `   Status: ${product.stock === 0 ? 'Out of Stock' : product.stock <= (product.reorder_level || 5) ? 'Low Stock' : 'In Stock'}\n`;
      content += `   Date Added: ${product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}\n`;
      content += `   Last Restock: ${product.last_restock_date ? new Date(product.last_restock_date).toLocaleDateString() : 'N/A'}\n`;
      content += `   Updated By: ${product.updated_by || 'N/A'}\n\n`;
    });
    
    return content;
  };

  const generateRestockDoc = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return 'No restock data found.\n';
    }

    let content = 'RESTOCK REPORT\n';
    content += '==============\n\n';
    
    data.forEach((item, index) => {
      content += `${index + 1}. ${item.product_name}\n`;
      content += `   Date: ${formatDate(item.date)}\n`;
      content += `   Quantity: ${item.quantity}\n`;
      content += `   Supplier: ${item.supplier || 'N/A'}\n`;
      content += `   Admin: ${item.admin_name || 'N/A'}\n`;
      content += `   Stock Before: ${item.stock_before}\n`;
      content += `   Stock After: ${item.stock_after}\n\n`;
    });
    
    return content;
  };

  const generateSalesDoc = (data) => {
    if (!data.salesData || !Array.isArray(data.salesData) || data.salesData.length === 0) {
      return 'No sales data available for the selected period.\n';
    }

    let content = 'SALES REPORT\n';
    content += '============\n\n';
    
    data.salesData.forEach((item, index) => {
      content += `${index + 1}. ${item.period}\n`;
      content += `   Orders: ${item.orders}\n`;
      content += `   Revenue: ${formatCurrency(item.revenue)}\n`;
      content += `   Average Order Value: ${formatCurrency(item.avg_order_value)}\n`;
      content += `   GCash Orders: ${item.gcash_orders}\n`;
      content += `   Cash Orders: ${item.cash_orders}\n\n`;
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
    { id: 'restock', label: 'Restock Report', icon: ExclamationTriangleIcon },
    { id: 'sales', label: 'Sales Report', icon: ChartBarIcon }
  ];

  return (
    <div className="flex flex-col min-h-screen text-black admin-page">
      <Navbar />
      <div className="flex flex-1 pt-16 lg:pt-20">
        <Sidebar />
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
                    const today = new Date();
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    setDateFilter({
                      startDate: firstDay.toISOString().split('T')[0],
                      endDate: today.toISOString().split('T')[0],
                      period: 'month'
                    });
                  }}
                  className="w-full px-3 py-2 bg-[#000C50] text-white rounded-md text-sm font-medium hover:bg-[#000C50]/90 transition-colors"
                >
                  This Month
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
          <div id="report-content" className="bg-white rounded-lg shadow-sm border border-gray-200">
            {loading && (
              <div className="flex items-center justify-center py-12">
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

            {!loading && !error && (
              <>
                {/* Inventory Report */}
                {activeTab === 'inventory' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header Section */}
                    <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">Inventory Report</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Current stock levels of all products
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Search Input */}
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search products..."
                              className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                            />
                            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          {/* Download Button */}
                          <button
                            onClick={handleDownload}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-6 py-4 text-left">
                              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product ID</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product Name</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Size/Variant</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Unit</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty in Stock</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reorder Level</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cost Price</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Selling Price</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Supplier</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date Added</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Restock</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Updated By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {Array.isArray(inventoryData) && inventoryData.length > 0 ? (
                            inventoryData.map((product, index) => (
                              <tr key={product.id} className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                <td className="px-6 py-4">
                                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                </td>
                                <td className="px-6 py-4 text-sm font-mono text-gray-900">
                                  {product.product_code || `PRD${String(product.id).padStart(3, '0')}`}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm font-medium text-gray-900 uppercase">{product.name}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full uppercase">
                                    {product.category_name || product.category || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {product.sizes && product.sizes.length > 0 
                                    ? product.sizes.map(size => size.size).join(', ') 
                                    : 'N/A'
                                  }
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {product.unit_of_measure || 'pcs'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 text-center font-medium">
                                  {product.stock || 0}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 text-center">
                                  {product.reorder_level || 5}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">₱{Number(product.original_price || 0).toFixed(2)}</td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">₱{Number(product.price || 0).toFixed(2)}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {product.supplier || 'N/A'}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                                    product.stock === 0 
                                      ? 'bg-red-100 text-red-800' 
                                      : product.stock <= (product.reorder_level || 5)
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {product.stock === 0 
                                      ? 'Out of Stock' 
                                      : product.stock <= (product.reorder_level || 5)
                                      ? 'Low Stock'
                                      : 'In Stock'
                                    }
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {product.last_restock_date ? new Date(product.last_restock_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {product.updated_by || 'N/A'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="15" className="px-6 py-12 text-center">
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

                {/* Restock Report */}
                {activeTab === 'restock' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header Section */}
                    <div className="px-6 py-5 bg-gradient-to-r from-orange-50 to-red-50 border-b border-gray-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">Restock Report</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            History of restocked items
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Download Button */}
                          <button
                            onClick={handleDownload}
                            className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 shadow-sm"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Supplier</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Admin</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock Before</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock After</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {Array.isArray(restockData) && restockData.length > 0 ? (
                            restockData.map((item, index) => (
                              <tr key={index} className={`hover:bg-orange-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                <td className="px-6 py-4 text-sm text-gray-900">{formatDate(item.date)}</td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 uppercase">{item.product_name}</td>
                                <td className="px-6 py-4 text-sm text-gray-900 text-center">{item.quantity}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{item.supplier || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{item.admin_name || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm text-gray-900 text-center">{item.stock_before}</td>
                                <td className="px-6 py-4 text-sm text-gray-900 text-center">{item.stock_after}</td>
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
                                    <p className="text-sm font-medium text-gray-900">No restock data found</p>
                                    <p className="text-xs text-gray-500">No restock history available</p>
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
                          <select className="text-sm border border-gray-200 rounded-lg px-3 py-1 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                            <option>10</option>
                            <option>25</option>
                            <option>50</option>
                            <option>100</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600">
                            {Array.isArray(restockData) && restockData.length > 0 ? `1-${Math.min(10, restockData.length)} of ${restockData.length}` : '0 of 0'}
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
                    <div className="px-6 py-5 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">Sales Report</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Products sold, quantities, and revenue within a specific period
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Year/Month Dropdown */}
                          <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                            <option>2024</option>
                            <option>2023</option>
                            <option>2022</option>
                          </select>
                          {/* Search Input */}
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search periods..."
                              className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-48"
                            />
                            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          {/* Download Button */}
                          <button
                            onClick={handleDownload}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    {salesData.salesData && Array.isArray(salesData.salesData) && salesData.salesData.length > 0 ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50/50">
                              <tr>
                                <th className="px-6 py-4 text-left">
                                  <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Period</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Orders</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Revenue</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Avg Order Value</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GCash Orders</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cash Orders</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {salesData.salesData.map((item, index) => (
                                <tr key={index} className={`hover:bg-green-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                  <td className="px-6 py-4">
                                    <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">{item.period}</div>
                                        <div className="text-xs text-gray-500">Sales period</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                      {item.orders}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatCurrency(item.revenue)}</td>
                                  <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(item.avg_order_value)}</td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex px-2.5 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                                      {item.gcash_orders}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex px-2.5 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                                      {item.cash_orders}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-600">Rows per page:</span>
                              <select className="text-sm border border-gray-200 rounded-lg px-3 py-1 focus:ring-2 focus:ring-green-500 focus:border-transparent">
                                <option>10</option>
                                <option>25</option>
                                <option>50</option>
                                <option>100</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-600">
                                1-{Math.min(10, salesData.salesData.length)} of {salesData.salesData.length}
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
                            <p className="text-xs text-gray-500">No sales data for the selected period</p>
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
