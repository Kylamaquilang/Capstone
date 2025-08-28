'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';
import Link from 'next/link';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/dashboard/users');
      setUsers(data.users || []);
    } catch (err) {
      // Fallback to test endpoint if admin users is unavailable
      try {
        const { data } = await API.get('/auth/test-db');
        setUsers(data.users || []);
        setError('');
      } catch (e2) {
        const message = err?.response?.data?.error || err?.response?.data?.message || 'Failed to load users';
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
              <h2 className="text-2xl font-bold">USERS</h2>
              <div className="flex items-center gap-2">
                <Link href="/admin/users/add-student">
                  <button className="bg-[#000C50] text-white px-4 py-2 rounded hover:bg-blue-900 transition">
                    Add Student
                  </button>
                </Link>
                <Link href="/admin/users/bulk-upload">
                  <button className="border border-[#000C50] text-[#000C50] px-4 py-2 rounded hover:bg-[#000C50] hover:text-white transition">
                    Bulk Upload
                  </button>
                </Link>
              </div>
            </div>
            {loading ? (
              <div className="text-gray-600">Loading users...</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2">ID</th>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Student ID</th>
                      <th className="px-4 py-2">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b">
                        <td className="px-4 py-2">{u.id}</td>
                        <td className="px-4 py-2">{u.name}</td>
                        <td className="px-4 py-2">{u.student_id}</td>
                        <td className="px-4 py-2 capitalize">{u.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="text-gray-600 mt-4">No users found.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


