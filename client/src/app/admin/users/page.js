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
      // Try to get students from the new endpoint first
      const { data } = await API.get('/students/all');
      setUsers(data.students || []);
      setError('');
    } catch (err) {
      // Fallback to dashboard users if student endpoint is unavailable
      try {
        const { data } = await API.get('/dashboard/users');
        setUsers(data.users || []);
        setError('');
      } catch (e2) {
        // Fallback to test endpoint if admin users is unavailable
        try {
          const { data } = await API.get('/auth/test-db');
          setUsers(data.users || []);
          setError('');
        } catch (e3) {
          const message = err?.response?.data?.error || err?.response?.data?.message || 'Failed to load users';
          setError(message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getDegreeDisplayName = (degree) => {
    const degreeNames = {
      'BEED': 'Bachelor of Elementary Education',
      'BSED': 'Bachelor of Secondary Education',
      'BSIT': 'Bachelor of Science in Information Technology',
      'BSHM': 'Bachelor of Science in Hospitality Management'
    };
    return degreeNames[degree] || degree;
  };

  const getStatusBadge = (status) => {
    const statusClasses = status === 'regular' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-yellow-100 text-yellow-800';
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

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
              <h2 className="text-2xl font-bold">STUDENTS</h2>
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
              <div className="text-gray-600">Loading students...</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2">ID</th>
                      <th className="px-4 py-2">Student ID</th>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Degree</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{user.id}</td>
                        <td className="px-4 py-2 font-mono text-sm">{user.student_id}</td>
                        <td className="px-4 py-2">
                          <div>
                            <div className="font-medium">{user.name}</div>
                            {user.first_name && user.last_name && (
                              <div className="text-xs text-gray-500">
                                {user.first_name} {user.middle_name ? user.middle_name + ' ' : ''}{user.last_name}{user.suffix ? ' ' + user.suffix : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm">{user.email}</td>
                        <td className="px-4 py-2">
                          <div className="text-sm">
                            <div className="font-medium">{user.degree}</div>
                            <div className="text-xs text-gray-500">{getDegreeDisplayName(user.degree)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2">{getStatusBadge(user.status)}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="text-gray-600 mt-4 text-center py-8">
                    No students found.
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


