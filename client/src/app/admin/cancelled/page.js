'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';

export default function AdminCancelledPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCancelled = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/orders/admin');
      const cancelled = (data || []).filter(o => o.status?.toLowerCase() === 'cancelled');
      setOrders(cancelled);
    } catch (err) {
      setError('Failed to load cancelled orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancelled();
  }, []);

  return (
    <div className="flex flex-col min-h-screen text-black admin-page">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto lg:ml-0 ml-0">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">CANCELLED ORDERS</h2>
            </div>
            {loading ? (
              <div className="text-gray-600">Loading cancelled orders...</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : (
              <div className="bg-white border-gray-300 overflow-hidden rounded">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[000C50]-800 text-[000C50]-500">
                      <tr>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o, index) => (
                        <tr key={o.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{o.user_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              ₱{Number(o.total_amount).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{new Date(o.created_at).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">{new Date(o.created_at).toLocaleTimeString()}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {orders.length === 0 && (
                    <div className="p-8 text-center">
                      <div className="text-gray-400 text-4xl mb-4">❌</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No cancelled orders</h3>
                      <p className="text-gray-500">Cancelled orders will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


