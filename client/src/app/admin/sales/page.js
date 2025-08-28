'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';

export default function AdminSalesPage() {
  const [stats, setStats] = useState({ totalSales: 0, totalOrders: 0, totalUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/dashboard/admin');
      setStats({
        totalSales: Number(data.totalSales || 0),
        totalOrders: Number(data.totalOrders || 0),
        totalUsers: Number(data.totalUsers || 0)
      });
    } catch (err) {
      setError('Failed to load sales stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
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
              <h2 className="text-2xl font-bold">SALES</h2>
            </div>
            {loading ? (
              <div className="text-gray-600">Loading sales stats...</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded">
                  <div className="text-sm text-gray-500">Total Sales</div>
                  <div className="text-2xl font-bold">₱{stats.totalSales.toFixed(2)}</div>
                </div>
                <div className="p-4 border rounded">
                  <div className="text-sm text-gray-500">Total Orders</div>
                  <div className="text-2xl font-bold">{stats.totalOrders}</div>
                </div>
                <div className="p-4 border rounded">
                  <div className="text-sm text-gray-500">Total Users</div>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


