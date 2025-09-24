'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/common/side-bar';
import Navbar from '@/components/common/admin-navbar';
import API from '@/lib/axios';

export default function OrderDetailPage() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', notes: '' });
  const [updating, setUpdating] = useState(false);
  const router = useRouter();
  const params = useParams();
  const orderId = params.id;

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/orders/${orderId}`);
      setOrder(data);
      setStatusUpdate({ status: data.status, notes: '' });
    } catch (err) {
      setError('Failed to load order details');
      console.error('Load order error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async () => {
    if (!order || !statusUpdate.status) return;
    
    try {
      setUpdating(true);
      await API.patch(`/orders/${orderId}/status`, statusUpdate);
      
      // Reload order to get updated data
      await loadOrder();
      
      setShowStatusModal(false);
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
    const icons = {
      pending: '⏳',
      processing: '⚙️',
      ready_for_pickup: '📦',
      delivered: '✅',
      cancelled: '❌',
      refunded: '↩️'
    };
    return icons[status] || '❓';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen text-black admin-page">
        <Navbar />
        <div className="flex flex-1">
          <div className="w-64" style={{ height: 'calc(100vh - 64px)' }}>
            <Sidebar />
          </div>
          <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto lg:ml-0 ml-0">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center">Loading order details...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col h-screen text-black admin-page">
        <Navbar />
        <div className="flex flex-1">
          <div className="w-64" style={{ height: 'calc(100vh - 64px)' }}>
            <Sidebar />
          </div>
          <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto lg:ml-0 ml-0">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center text-red-600">{error || 'Order not found'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen text-black admin-page">
      <Navbar />
      <div className="flex flex-1">
        <div className="w-64" style={{ height: 'calc(100vh - 64px)' }}>
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Order #{order.id}</h2>
                <p className="text-gray-600">Order Details</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/admin/orders')}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition"
                >
                  Back to Orders
                </button>
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Update Status
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Name:</span> {order.user_name}
                  </div>
                  <div>
                    <span className="font-medium">Student ID:</span> {order.student_id || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {order.email}
                  </div>
                  <div>
                    <span className="font-medium">User ID:</span> {order.user_id}
                  </div>
                </div>
              </div>

              {/* Order Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Order Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Order ID:</span> #{order.id}
                  </div>
                  <div>
                    <span className="font-medium">Total Amount:</span> 
                    <span className="font-semibold text-green-600 ml-1">{Number(order.total_amount).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Payment Method:</span> {order.payment_method}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)} {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(order.created_at)}
                  </div>
                  {order.updated_at && order.updated_at !== order.created_at && (
                    <div>
                      <span className="font-medium">Last Updated:</span> {formatDate(order.updated_at)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="mt-6">
              <h3 className="text-xs font-semibold mb-3">Order Items</h3>
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-left">Size</th>
                      <th className="px-4 py-2 text-left">Quantity</th>
                      <th className="px-4 py-2 text-left">Price</th>
                      <th className="px-4 py-2 text-left">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items && order.items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            {item.image && (
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="w-12 h-12 object-cover rounded mr-3"
                              />
                            )}
                            <div>
                              <div className="font-medium">{item.product_name || item.name || 'Unknown Product'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{item.size_name || item.size || 'N/A'}</td>
                        <td className="px-4 py-3">{item.quantity}</td>
                        <td className="px-4 py-3">{Number(item.price).toFixed(2)}</td>
                        <td className="px-4 py-3 font-medium">
                          {(Number(item.price) * Number(item.quantity)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!order.items || order.items.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No items found for this order
                  </div>
                )}
              </div>
            </div>

            {/* Status History */}
            {order.status_history && order.status_history.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Status History</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-3">
                    {order.status_history.map((status, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.new_status)}`}>
                              {status.new_status.replace('_', ' ')}
                            </span>
                            {status.old_status && (
                              <span className="text-gray-500">← {status.old_status.replace('_', ' ')}</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(status.created_at)}
                          </div>
                        </div>
                        {status.notes && (
                          <div className="ml-4 text-sm text-gray-600 bg-white p-2 rounded">
                            <span className="font-medium">Notes:</span> {status.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Update Order #{order.id} Status
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <select
                value={statusUpdate.status}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                className="w-full rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="ready_for_pickup">Ready for Pickup</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
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
  );
}
