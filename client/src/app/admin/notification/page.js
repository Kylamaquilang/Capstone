'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';

export default function AdminNotificationPage() {
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLowStock = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/products/low-stock');
      setLowStock(data.products || []);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStock();
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
              <h2 className="text-2xl font-bold">NOTIFICATIONS</h2>
            </div>
            {loading ? (
              <div className="text-gray-600">Loading notifications...</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
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
                        <td className="px-4 py-2">{p.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {lowStock.length === 0 && (
                  <div className="text-gray-600 mt-4">No low-stock notifications.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


