'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUserAutoRefresh } from '@/hooks/useAutoRefresh';
import { 
  ShoppingBagIcon, 
  ClockIcon, 
  XMarkIcon,
  EyeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import API from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import Swal from '@/lib/sweetalert-config';
import { getProductImageUrl } from '@/utils/imageUtils';
import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function ActiveOrdersPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Fetch user's orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data: ordersData } = await API.get('/orders/student');
      setOrders(ordersData || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err?.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh for orders
  useUserAutoRefresh(fetchOrders, 'orders');

  // Add manual refresh capability
  const refreshOrders = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
  };

  const handleCancelOrder = async (orderId) => {
    const result = await Swal.fire({
      title: 'Cancel Order',
      text: 'Are you sure you want to cancel this order? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, cancel order',
      cancelButtonText: 'Keep order'
    });

    if (result.isConfirmed) {
      try {
        setActionLoading(prev => ({ ...prev, [orderId]: true }));
        
        await API.post(`/orders/${orderId}/cancel`);
        
        await Swal.fire({
          title: 'Order Cancelled',
          text: 'Your order has been cancelled successfully.',
          icon: 'success',
          confirmButtonColor: '#000C50',
          timer: 2000,
          timerProgressBar: true
        });

        // Refresh orders
        await fetchOrders();
      } catch (err) {
        console.error('Failed to cancel order:', err);
        await Swal.fire({
          title: 'Error',
          text: err?.response?.data?.error || 'Failed to cancel order',
          icon: 'error',
          confirmButtonColor: '#000C50'
        });
      } finally {
        setActionLoading(prev => ({ ...prev, [orderId]: false }));
      }
    }
  };

  const handleConfirmReceipt = async (orderId) => {
    const result = await Swal.fire({
      title: 'Order Claimed',
      text: 'Please confirm that you have claimed your order and it is in good condition.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, I claimed it',
      cancelButtonText: 'Not yet'
    });

    if (result.isConfirmed) {
      try {
        setActionLoading(prev => ({ ...prev, [orderId]: true }));
        
        await API.post(`/orders/${orderId}/user-confirm`);
        
        await Swal.fire({
          title: 'Order Claimed!',
          text: 'Thank you for claiming your order. We appreciate your business!',
          icon: 'success',
          confirmButtonColor: '#000C50',
          timer: 3000,
          timerProgressBar: true
        });

        // Refresh orders
        await fetchOrders();
      } catch (err) {
        console.error('Failed to confirm order receipt:', err);
        await Swal.fire({
          title: 'Error',
          text: err?.response?.data?.error || 'Failed to confirm order receipt',
          icon: 'error',
          confirmButtonColor: '#000C50'
        });
      } finally {
        setActionLoading(prev => ({ ...prev, [orderId]: false }));
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready_for_pickup':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'claimed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'processing':
        return <TruckIcon className="h-4 w-4" />;
      case 'ready_for_pickup':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'claimed':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'cancelled':
        return <XMarkIcon className="h-4 w-4" />;
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending':
        return 'Your order is being reviewed';
      case 'processing':
        return 'Your order is being prepared';
      case 'ready_for_pickup':
        return 'Your order is ready for pickup!';
      case 'claimed':
        return 'Your order has been claimed';
      case 'cancelled':
        return 'Your order has been cancelled';
      case 'completed':
        return 'Order completed successfully';
      default:
        return 'Order status unknown';
    }
  };

  const canCancelOrder = (status) => {
    return status === 'pending';
  };

  const canConfirmReceipt = (status) => {
    return status === 'claimed';
  };

  const activeOrders = orders.filter(order => 
    ['pending', 'processing', 'ready_for_pickup', 'claimed'].includes(order.status)
  );

  // Debug logging
  console.log('All orders:', orders);
  console.log('Active orders:', activeOrders);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-grow pt-20 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg p-6">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />

        <main className="flex-grow pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
                  <p className="text-gray-600">Track and manage your orders</p>
                </div>
                <button
                  onClick={refreshOrders}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Orders */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ShoppingBagIcon className="h-5 w-5 mr-2 text-blue-600" />
                Active Orders ({activeOrders.length})
              </h2>

              {activeOrders.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <ShoppingBagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Orders</h3>
                  <p className="text-gray-600 mb-4">You don't have any active orders at the moment.</p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="bg-[#000C50] text-white px-6 py-2 rounded-lg hover:bg-[#000C50]/90 transition-colors"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOrders.map((order) => (
                    <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {order.items && order.items.length > 0 
                                ? order.items[0].product_name
                                : `Order #${order.id}`
                              }
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{getStatusMessage(order.status)}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              {new Date(order.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="flex items-center gap-1">
                              <CurrencyDollarIcon className="h-4 w-4" />
                              ₱{Number(order.total_amount).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOrderClick(order)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Order Items Preview */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-700">Items:</span>
                          <span className="text-sm text-gray-600">
                            {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {order.items?.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                              {item.image && (
                                <Image
                                  src={getProductImageUrl(item.image)}
                                  alt={item.product_name}
                                  width={32}
                                  height={32}
                                  className="rounded object-cover"
                                />
                              )}
                              <span className="text-sm text-gray-700">
                                {item.quantity}x {item.product_name}
                                {item.size_name && ` (${item.size_name})`}
                              </span>
                            </div>
                          ))}
                          {order.items?.length > 3 && (
                            <div className="bg-gray-50 rounded-lg px-3 py-2">
                              <span className="text-sm text-gray-500">
                                +{order.items.length - 3} more
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3">
                        {canCancelOrder(order.status) && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={actionLoading[order.id]}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <XMarkIcon className="h-4 w-4" />
                            {actionLoading[order.id] ? 'Cancelling...' : 'Cancel Order'}
                          </button>
                        )}
                        
                        {canConfirmReceipt(order.status) && (
                          <button
                            onClick={() => handleConfirmReceipt(order.id)}
                            disabled={actionLoading[order.id]}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            {actionLoading[order.id] ? 'Claiming...' : 'Order Claimed'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </main>

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedOrder.items && selectedOrder.items.length > 0 
                      ? selectedOrder.items[0].product_name
                      : `Order #${selectedOrder.id}`
                    }
                  </h2>
                  <button
                    onClick={closeOrderModal}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Order Status */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusIcon(selectedOrder.status)}
                      {selectedOrder.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600">{getStatusMessage(selectedOrder.status)}</p>
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Order Date:</span>
                    <p className="text-gray-600">
                      {new Date(selectedOrder.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Total Amount:</span>
                    <p className="text-gray-600">₱{Number(selectedOrder.total_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Payment Method:</span>
                    <p className="text-gray-600 capitalize">{selectedOrder.payment_method}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Payment Status:</span>
                    <p className="text-gray-600 capitalize">{selectedOrder.payment_status || 'N/A'}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        {item.image && (
                          <Image
                            src={getProductImageUrl(item.image)}
                            alt={item.product_name}
                            width={60}
                            height={60}
                            className="rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                          {item.size_name && (
                            <p className="text-sm text-gray-600">Size: {item.size_name}</p>
                          )}
                          <p className="text-sm text-gray-600">
                            Quantity: {item.quantity} × ₱{Number(item.unit_price).toFixed(2)} = ₱{Number(item.total_price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  {canCancelOrder(selectedOrder.status) && (
                    <button
                      onClick={() => {
                        closeOrderModal();
                        handleCancelOrder(selectedOrder.id);
                      }}
                      disabled={actionLoading[selectedOrder.id]}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      {actionLoading[selectedOrder.id] ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}
                  
                  {canConfirmReceipt(selectedOrder.status) && (
                    <button
                      onClick={() => {
                        closeOrderModal();
                        handleConfirmReceipt(selectedOrder.id);
                      }}
                      disabled={actionLoading[selectedOrder.id]}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      {actionLoading[selectedOrder.id] ? 'Claiming...' : 'Order Claimed'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
