'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';

export default function AdminNotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const [processingOrder, setProcessingOrder] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/notifications');
      setNotifications(data.notifications || []);
      
      // Mark all unread notifications as read when admin views the page
      const unreadNotifications = data.notifications?.filter(n => !n.is_read) || [];
      if (unreadNotifications.length > 0) {
        await Promise.all(
          unreadNotifications.map(notification => 
            API.put(`/notifications/${notification.id}/read`)
          )
        );
        // Refresh notifications to get updated read status
        const { data: updatedData } = await API.get('/notifications');
        setNotifications(updatedData.notifications || []);
        
        // Dispatch custom event to notify navbar to refresh unread count
        window.dispatchEvent(new CustomEvent('notificationsMarkedAsRead'));
      }
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    try {
      const { data } = await API.get('/products/low-stock');
      setLowStock(data.products || []);
    } catch (err) {
      console.error('Failed to load low stock:', err);
    }
  };

  const handleOrderReceived = async (orderId) => {
    try {
      setProcessingOrder(orderId);
      await API.post(`/orders/${orderId}/confirm-receipt`, {
        action: 'received'
      });
      
      // Show success message
      alert('✅ Order receipt confirmed! Thank you message sent to customer.');
      
      // Refresh notifications
      fetchNotifications();
    } catch (err) {
      alert('❌ Failed to confirm order receipt');
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleOrderCancel = async (orderId) => {
    try {
      setProcessingOrder(orderId);
      await API.post(`/orders/${orderId}/cancel`, {
        reason: 'Admin cancelled'
      });
      
      // Show success message
      alert('❌ Order cancelled successfully.');
      
      // Refresh notifications
      fetchNotifications();
    } catch (err) {
      alert('❌ Failed to cancel order');
    } finally {
      setProcessingOrder(null);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchLowStock();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto lg:ml-0 ml-0">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">NOTIFICATIONS</h2>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8">
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'orders' 
                    ? 'bg-[#000C50] text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">📦</span>
                  <span>Order Notifications</span>
                  <span className="bg-white text-[#000C50] px-2 py-1 rounded-full text-xs font-bold">
                    {notifications.filter(n => n.type === 'admin_order' || n.type === 'delivered_confirmation').length}
                  </span>
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('lowStock')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'lowStock' 
                    ? 'bg-[#000C50] text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>Low Stock Alerts</span>
                  <span className="bg-white text-[#000C50] px-2 py-1 rounded-full text-xs font-bold">
                    {lowStock.length}
                  </span>
                </span>
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#000C50]"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Notifications</h3>
                <p className="text-red-600">{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTab === 'orders' ? (
                  notifications.filter(n => n.type === 'admin_order' || n.type === 'delivered_confirmation').length > 0 ? (
                    notifications
                      .filter(n => n.type === 'admin_order' || n.type === 'delivered_confirmation')
                      .map((notification) => {
                        // Extract order ID from the message
                        const orderIdMatch = notification.message.match(/Order #(\d+)/);
                        const orderId = orderIdMatch ? orderIdMatch[1] : null;
                        
                        return (
                          <div
                            key={notification.id}
                            className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                              notification.is_read
                                ? 'bg-gray-50 border-gray-200'
                                : 'bg-white border-gray-300 shadow-sm'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    notification.is_read ? 'bg-gray-400' : 'bg-green-500'
                                  }`}></div>
                                  <h3 className="font-medium text-gray-900 text-sm">
                                    {notification.title}
                                  </h3>
                                  {!notification.is_read && (
                                    <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                      NEW
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-600 text-sm mb-2 leading-relaxed">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mb-3">
                                  {new Date(notification.created_at).toLocaleString()}
                                </p>
                                
                                {/* Action Buttons for Delivered Confirmation Notifications */}
                                {notification.type === 'delivered_confirmation' && orderId && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleOrderReceived(orderId)}
                                      disabled={processingOrder === orderId}
                                      className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {processingOrder === orderId ? 'Processing...' : '✅ Order Received'}
                                    </button>
                                    <button
                                      onClick={() => handleOrderCancel(orderId)}
                                      disabled={processingOrder === orderId}
                                      className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {processingOrder === orderId ? 'Processing...' : '❌ Cancel Order'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-4xl mb-4">📦</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No order notifications</h3>
                      <p className="text-gray-500">Order notifications will appear here when customers place orders.</p>
                    </div>
                  )
                ) : (
                  <div className="bg-white border border-gray-300 overflow-hidden rounded-lg">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Product Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Current Stock
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {lowStock.map((p, index) => (
                            <tr key={p.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{p.name}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  {p.category_name || 'N/A'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                                  p.stock === 0 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {p.stock}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {lowStock.length === 0 && (
                        <div className="text-center py-12">
                          <div className="text-gray-400 text-4xl mb-4">⚠️</div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No low stock alerts</h3>
                          <p className="text-gray-500">All products have sufficient stock levels.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}