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
    <div className="flex flex-col h-screen text-black">
      <Navbar />
      <div className="flex flex-1">
        <div className="w-64" style={{ height: 'calc(100vh - 64px)' }}>
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">CANCELLED ORDERS</h2>
            </div>
            {loading ? (
              <div className="text-gray-600">Loading cancelled orders...</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2">Order ID</th>
                      <th className="px-4 py-2">User</th>
                      <th className="px-4 py-2">Amount</th>
                      <th className="px-4 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b">
                        <td className="px-4 py-2">{o.id}</td>
                        <td className="px-4 py-2">{o.user_name}</td>
                        <td className="px-4 py-2">₱{Number(o.total_amount).toFixed(2)}</td>
                        <td className="px-4 py-2">{new Date(o.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && (
                  <div className="text-gray-600 mt-4">No cancelled orders.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


