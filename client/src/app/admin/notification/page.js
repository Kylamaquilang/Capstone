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

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/notifications');
      setNotifications(data.notifications || []);
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

  useEffect(() => {
    fetchNotifications();
    fetchLowStock();
  }, []);

  return (
    <div className="flex flex-col min-h-screen text-black">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto lg:ml-0 ml-0">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">NOTIFICATIONS</h2>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === 'orders'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📦 Order Notifications ({notifications.filter(n => n.type === 'admin_order').length})
              </button>
              <button
                onClick={() => setActiveTab('lowstock')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === 'lowstock'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ⚠️ Low Stock ({lowStock.length})
              </button>
            </div>

            {loading ? (
              <div className="text-gray-600">Loading notifications...</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : (
              <div>
                {activeTab === 'orders' ? (
                  <div className="space-y-4">
                    {notifications.filter(n => n.type === 'admin_order').length > 0 ? (
                      notifications
                        .filter(n => n.type === 'admin_order')
                        .map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 rounded-lg border-l-4 ${
                              notification.is_read
                                ? 'bg-gray-50 border-gray-300'
                                : 'bg-blue-50 border-blue-500'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">
                                  {notification.title}
                                </h3>
                                <p className="text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                  {new Date(notification.created_at).toLocaleString()}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                  NEW
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-gray-600 text-center py-8">
                        No order notifications yet.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2">Product</th>
                          <th className="px-4 py-2">Category</th>
                          <th className="px-4 py-2">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStock.map((p) => (
                          <tr key={p.id} className="border-b">
                            <td className="px-4 py-2">{p.name}</td>
                            <td className="px-4 py-2">{p.category_name || '—'}</td>
                            <td className="px-4 py-2 text-red-600 font-semibold">{p.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {lowStock.length === 0 && (
                      <div className="text-gray-600 mt-4 text-center py-8">
                        No low-stock notifications.
                      </div>
                    )}
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


