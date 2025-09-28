'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';
import { useSocket } from '@/context/SocketContext';
import { 
  ClockIcon, 
  CogIcon, 
  CubeIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  EyeIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import ActionMenu from '@/components/common/ActionMenu';
import OrderDetailsModal from '@/components/order/OrderDetailsModal';

export default function AdminOrdersPage() {
  const { socket, isConnected, joinAdminRoom } = useSocket();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', notes: '' });
  const [updating, setUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await API.get('/orders/admin');
      setOrders(data || []);
      setFilteredOrders(data || []);
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on search term and status filter
  useEffect(() => {
    let filtered = orders;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm)
      );
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filter by payment status
    if (paymentStatusFilter) {
      filtered = filtered.filter(order => order.payment_status === paymentStatusFilter);
    }

    // Filter by payment method
    if (paymentMethodFilter) {
      filtered = filtered.filter(order => order.payment_method === paymentMethodFilter);
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, paymentStatusFilter, paymentMethodFilter]);

  const handleViewDetails = (orderId) => {
    setSelectedOrderId(orderId);
    setShowDetailsModal(true);
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder || !statusUpdate.status) return;
    
    try {
      setUpdating(true);
      const response = await API.patch(`/orders/${selectedOrder.id}/status`, statusUpdate);
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === selectedOrder.id 
          ? { 
              ...order, 
              status: statusUpdate.status,
              payment_status: response.data.paymentStatus || order.payment_status
            }
          : order
      ));
      
      // Show success message with additional info
      let successMessage = `Order #${selectedOrder.id} status updated to ${statusUpdate.status}`;
      
      if (response.data.paymentStatusUpdated) {
        successMessage += '\n\n✅ Payment status automatically updated to PAID';
      }
      
      if (response.data.inventoryUpdated) {
        successMessage += '\n\n📦 Stock restored for cancelled order';
      }
      
      if (response.data.salesLogged) {
        successMessage += '\n\n💰 Sale logged in system';
      }
      
      alert(successMessage);
      
      setShowStatusModal(false);
      setSelectedOrder(null);
      setStatusUpdate({ status: '', notes: '' });
    } catch (err) {
      alert('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      ready_for_pickup: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const iconProps = { className: "h-5 w-5" };
    const icons = {
      pending: <ClockIcon {...iconProps} className="h-5 w-5 text-yellow-500" />,
      processing: <CogIcon {...iconProps} className="h-5 w-5 text-blue-500" />,
      ready_for_pickup: <CubeIcon {...iconProps} className="h-5 w-5 text-purple-500" />,
      delivered: <CheckCircleIcon {...iconProps} className="h-5 w-5 text-green-500" />,
      cancelled: <XCircleIcon {...iconProps} className="h-5 w-5 text-red-500" />,
      refunded: <ArrowPathIcon {...iconProps} className="h-5 w-5 text-gray-500" />
    };
    return icons[status] || <ClockIcon {...iconProps} className="h-5 w-5 text-gray-500" />;
  };

  useEffect(() => {
    let isMounted = true;
    
    // Reset state when component mounts
    setOrders([]);
    setFilteredOrders([]);
    setError('');
    setSelectedOrder(null);
    setShowStatusModal(false);
    setStatusUpdate({ status: '', notes: '' });
    setUpdating(false);
    setSearchTerm('');
    setStatusFilter('');
    setPaymentStatusFilter('');
    
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await API.get('/orders/admin');
        if (isMounted) {
          setOrders(data || []);
          setFilteredOrders(data || []);
        }
      } catch (err) {
        console.error('Fetch orders error:', err);
        if (isMounted) {
          setError('Failed to load orders');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    // Set up Socket.io listeners for real-time updates
    if (socket && isConnected) {
      // Join admin room for real-time updates
      joinAdminRoom();

      // Listen for new orders
      const handleNewOrder = (orderData) => {
        console.log('🛒 Real-time new order received:', orderData);
        if (isMounted) {
          setOrders(prev => [orderData, ...prev]);
          setFilteredOrders(prev => [orderData, ...prev]);
        }
      };

      // Listen for order updates
      const handleOrderUpdate = (orderData) => {
        console.log('📦 Real-time order update received:', orderData);
        if (isMounted) {
          setOrders(prev => prev.map(order => 
            order.id === orderData.orderId 
              ? { ...order, status: orderData.status }
              : order
          ));
          setFilteredOrders(prev => prev.map(order => 
            order.id === orderData.orderId 
              ? { ...order, status: orderData.status }
              : order
          ));
        }
      };

      // Listen for admin notifications
      const handleAdminNotification = (notificationData) => {
        console.log('🔔 Real-time admin notification received:', notificationData);
        // Refresh orders when new admin notifications arrive
        if (isMounted) {
          loadOrders();
        }
      };

      socket.on('admin-order-updated', handleOrderUpdate);
      socket.on('admin-notification', handleAdminNotification);
      socket.on('new-order', handleNewOrder);

      return () => {
        socket.off('admin-order-updated', handleOrderUpdate);
        socket.off('admin-notification', handleAdminNotification);
        socket.off('new-order', handleNewOrder);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [socket, isConnected, joinAdminRoom]);

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentStatusFilter, paymentMethodFilter]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen text-black admin-page">
        <Navbar />
        <div className="flex pt-16 lg:pt-20"> {/* Add padding-top for fixed navbar */}
          <Sidebar />
        <div className="flex-1 bg-gray-50 p-2 sm:p-3 overflow-auto lg:ml-64">
          {/* Main Container with Controls and Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Header Section */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">Orders</h1>
                </div>
                <div className="text-sm text-gray-600">
                  Total Orders: {orders.length} | Showing: {filteredOrders.length}
                </div>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex flex-col gap-3">
                {/* Search Bar */}
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by name, student ID, email, or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="sm:w-48">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Order Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="ready_for_pickup">For Pickup</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                  <div className="sm:w-48">
                    <select
                      value={paymentStatusFilter}
                      onChange={(e) => setPaymentStatusFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Payment Statuses</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="sm:w-48">
                    <select
                      value={paymentMethodFilter}
                      onChange={(e) => setPaymentMethodFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Payment Methods</option>
                      <option value="gcash">GCash</option>
                      <option value="cash">Pay at Counter</option>
                    </select>
                  </div>
                  <div className="sm:w-32">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('');
                        setPaymentStatusFilter('');
                        setPaymentMethodFilter('');
                      }}
                      className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#000C50] mx-auto mb-3"></div>
                <p className="text-gray-600 text-sm">Loading orders...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <div className="text-red-500 text-2xl mb-3">⚠️</div>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            ) : (
              <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium text-black-700 border-r border-gray-200">Products</th>
                      <th className="px-4 py-3 text-xs font-medium text-black-700 border-r border-gray-200">Customer</th>
                      <th className="px-4 py-3 text-xs font-medium text-black-700 border-r border-gray-200">Quantity</th>
                      <th className="px-4 py-3 text-xs font-medium text-black-700 border-r border-gray-200">Amount</th>
                      <th className="px-4 py-3 text-xs font-medium text-black-700 border-r border-gray-200">Payment Method</th>
                      <th className="px-4 py-3 text-xs font-medium text-black-700 border-r border-gray-200">Payment Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-black-700 border-r border-gray-200">Order Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-black-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((order, index) => (
                      <tr key={order.id} className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <div className="text-xs">
                            {order.items && order.items.length > 0 ? (
                              <div className="space-y-1">
                                {(() => {
                                  // Get unique product names only
                                  const uniqueProducts = [...new Set(order.items.map(item => item.product_name))];
                                  
                                  return uniqueProducts.slice(0, 3).map((productName, idx) => (
                                    <div key={idx} className="text-gray-900">
                                      <span className="font-medium">{productName}</span>
                                    </div>
                                  ));
                                })()}
                                {(() => {
                                  // Count unique products
                                  const uniqueProductCount = [...new Set(order.items.map(item => item.product_name))].length;
                                  
                                  return uniqueProductCount > 3 && (
                                    <div className="text-gray-500 text-xs">
                                      +{uniqueProductCount - 3} more products
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <span className="text-gray-500">No items</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <div>
                            <div className="text-xs font-medium text-gray-900">{order.user_name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <div className="text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600">
                              {order.total_quantity || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <div className="text-xs font-medium text-gray-900">
                            ₱{Number(order.total_amount || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              {order.payment_method === 'gcash' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600">
                                  GCash
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600">
                                  Cash
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <div className="flex items-center space-x-2">
                            {order.payment_status === 'paid' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                                Paid
                              </span>
                            ) : order.payment_status === 'pending' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700">
                                Pending
                              </span>
                            ) : order.payment_status === 'failed' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                                Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600">
                                Unpaid
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status === 'ready_for_pickup' ? 'For Pickup' : order.status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ActionMenu
                            actions={[
                              {
                                label: 'Update Status',
                                icon: PencilSquareIcon,
                                onClick: () => {
                                  setSelectedOrder(order);
                                  setStatusUpdate({ status: order.status, notes: '' });
                                  setShowStatusModal(true);
                                }
                              },
                              {
                                label: 'View Details',
                                icon: EyeIcon,
                                onClick: () => handleViewDetails(order.id)
                              }
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {paginatedOrders.length === 0 && (
                <div className="p-8 text-center">
                  <div className="text-gray-300 text-3xl mb-4">📦</div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    {orders.length === 0 ? 'No orders found' : 'No orders match your search criteria'}
                  </h3>
                  <p className="text-gray-500 text-xs">Orders will appear here when customers place them.</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {filteredOrders.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Records Info */}
                <div className="text-xs text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
                </div>
                
                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || totalPages <= 1}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  >
                    &lt;
                  </button>
                  
                  <span className="px-3 py-1 text-xs border border-gray-300 rounded-md bg-[#000C50] text-white">
                    {currentPage}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages <= 1}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>

      {/* Status Update Modal */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Update Order #{selectedOrder.id} Status
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <select
                value={statusUpdate.status}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="ready_for_pickup">For Pickup</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
              
              {/* Show automatic actions for delivered status */}
              {statusUpdate.status === 'delivered' && selectedOrder?.payment_status !== 'paid' && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">ℹ️</span>
                    <div className="text-sm text-green-800">
                      <strong>Automatic Actions:</strong>
                      <ul className="mt-1 ml-4 list-disc">
                        <li>Payment status will be updated to <strong>PAID</strong></li>
                        <li>Sale will be logged in the system</li>
                        <li>Customer will be notified</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={statusUpdate.notes}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                placeholder="Add any notes about this status change..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={updateOrderStatus}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        orderId={selectedOrderId}
      />
    </ErrorBoundary>
  );
}


