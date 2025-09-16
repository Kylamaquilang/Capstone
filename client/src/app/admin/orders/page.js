'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';
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

export default function AdminOrdersPage() {
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

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, paymentStatusFilter]);

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

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen text-black admin-page">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto lg:ml-0 ml-0">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">ORDER MANAGEMENT</h2>
              <div className="text-sm text-gray-600">
                Total Orders: {orders.length} | Showing: {filteredOrders.length}
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name, student ID, email, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Order Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="ready_for_pickup">Ready for Pickup</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div className="sm:w-48">
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Payment Statuses</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-gray-600">Loading orders...</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : (
              <div className="bg-white border-gray-800 overflow-hidden rounded-md">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-800 text-white">
                      <tr>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-600">Products</th>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-600">Customer</th>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-600">Items</th>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-600">Amount</th>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-600">Payment Method</th>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-600">Payment Status</th>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-600">Order Status</th>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-600">Created</th>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order, index) => (
                        <tr key={order.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors border-b border-gray-200`}>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="text-sm">
                            {order.items && order.items.length > 0 ? (
                              <div className="space-y-1">
                                {order.items.slice(0, 3).map((item, idx) => (
                                  <div key={idx} className="text-gray-900">
                                    <span className="font-medium">{item.quantity}x</span> {item.product_name}
                                    {item.size_name && (
                                      <span className="text-gray-600"> ({item.size_name})</span>
                                    )}
                                  </div>
                                ))}
                                {order.items.length > 3 && (
                                  <div className="text-gray-500 text-xs">
                                    +{order.items.length - 3} more items
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">No items</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{order.user_name}</div>
                            <div className="text-xs text-gray-500">ID: {order.student_id || 'N/A'}</div>
                            <div className="text-xs text-gray-400">{order.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {order.item_count || 0} items
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="text-sm font-medium text-gray-900">
                            ₱{Number(order.total_amount || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              {order.payment_method === 'gcash' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  GCash
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Cash
                                </span>
                              )}
                            </div>
                            <div className="text-xs">
                              {order.pay_at_counter ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Pay at Counter
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Online Payment
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="flex items-center space-x-2">
                            {order.payment_status === 'paid' ? (
                              <>
                                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Paid
                                </span>
                              </>
                            ) : order.payment_status === 'pending' ? (
                              <>
                                <ClockIcon className="h-4 w-4 text-yellow-600" />
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending
                                </span>
                              </>
                            ) : order.payment_status === 'failed' ? (
                              <>
                                <XCircleIcon className="h-4 w-4 text-red-600" />
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Failed
                                </span>
                              </>
                            ) : (
                              <>
                                <ClockIcon className="h-4 w-4 text-gray-600" />
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  Unpaid
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(order.status)}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="text-sm text-gray-900">{new Date(order.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(order.created_at).toLocaleTimeString()}</div>
                        </td>
                        <td className="px-6 py-4">
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
                                  onClick: () => window.location.href = `/admin/orders/${order.id}`
                                }
                              ]}
                            />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-4">📦</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {orders.length === 0 ? 'No orders found' : 'No orders match your search criteria'}
                    </h3>
                    <p className="text-gray-500">Orders will appear here when customers place them.</p>
                  </div>
                )}
                </div>
              </div>
            )}
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
                <option value="ready_for_pickup">Ready for Pickup</option>
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
    </div>
    </ErrorBoundary>
  );
}


