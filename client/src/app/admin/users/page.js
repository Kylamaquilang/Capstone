'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';
import Link from 'next/link';
import ActionMenu from '@/components/common/ActionMenu';
import { EyeIcon, PencilSquareIcon, UserMinusIcon, UserPlusIcon } from '@heroicons/react/24/outline';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Try to get users from the new user management endpoint
      const { data } = await API.get('/users/all');
      setUsers(data.users || []);
      setError('');
    } catch (err) {
      // Fallback to students endpoint if user management is unavailable
      try {
        const { data } = await API.get('/students/all');
        setUsers(data.students || []);
        setError('');
      } catch (e2) {
        // Fallback to dashboard users if students endpoint is unavailable
        try {
          const { data } = await API.get('/dashboard/users');
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

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      setUpdatingStatus(userId);
      await API.patch(`/users/${userId}/status`, {
        is_active: !currentStatus
      });
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, is_active: !currentStatus }
            : user
        )
      );
    } catch (err) {
      console.error('Failed to update user status:', err);
      alert(err?.response?.data?.error || 'Failed to update user status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"?`)) {
      return;
    }

    try {
      await API.delete(`/users/${userId}`);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, is_active: false }
            : user
        )
      );
      
      alert('User deleted successfully');
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert(err?.response?.data?.error || 'Failed to delete user');
    }
  };

  const getDegreeDisplayName = (degree) => {
    // Handle null, undefined, or empty degree
    if (!degree) {
      return 'N/A';
    }

    const degreeNames = {
      'BEED': 'Bachelor of Elementary Education',
      'BSED': 'Bachelor of Secondary Education',
      'BSIT': 'Bachelor of Science in Information Technology',
      'BSHM': 'Bachelor of Science in Hospitality Management'
    };
    return degreeNames[degree] || degree;
  };

  const getStatusBadge = (status) => {
    // Handle null, undefined, or empty status
    if (!status) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          N/A
        </span>
      );
    }

    const statusClasses = status === 'regular' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-yellow-100 text-yellow-800';
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getActiveStatusBadge = (isActive) => {
    const statusClasses = isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    // Handle null, undefined, or empty role
    if (!role) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          N/A
        </span>
      );
    }

    const roleClasses = role === 'admin' 
      ? 'bg-purple-100 text-purple-800' 
      : 'bg-blue-100 text-blue-800';
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleClasses}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen text-black admin-page">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto lg:ml-0 ml-0">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">USER MANAGEMENT</h2>
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
              <div className="bg-white border-gray-600 overflow-hidden rounded-md">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-800 text-white">
                      <tr>
                        <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Stud ID</th>
                        <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Degree</th>
                        <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Active</th>
                        <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Created</th>
                        <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, index) => (
                        <tr key={user.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 font-mono">
                            {user.student_id || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name || 'N/A'}</div>
                            {user.first_name && user.last_name && (
                              <div className="text-xs text-gray-500">
                                {user.first_name} {user.middle_name ? user.middle_name + ' ' : ''}{user.last_name}{user.suffix ? ' ' + user.suffix : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{user.email || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{user.degree || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{getDegreeDisplayName(user.degree)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                        <td className="px-6 py-4">{getActiveStatusBadge(user.is_active)}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <ActionMenu
                            actions={[
                              {
                                label: user.is_active ? 'Deactivate User' : 'Activate User',
                                icon: user.is_active ? UserMinusIcon : UserPlusIcon,
                                onClick: () => handleStatusToggle(user.id, user.is_active),
                                disabled: updatingStatus === user.id
                              },
                              {
                                label: 'Delete User',
                                icon: PencilSquareIcon,
                                onClick: () => handleDeleteUser(user.id, user.name),
                                danger: true
                              }
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-4">👥</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                    <p className="text-gray-500">Users will appear here when they register.</p>
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


