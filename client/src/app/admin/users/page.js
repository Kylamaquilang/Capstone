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
        <div className="flex-1 flex flex-col bg-gray-50 p-6 overflow-auto lg:ml-0 ml-0">
          {/* Main Container with Buttons and Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Header Section */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Users</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/admin/users/add-student">
                    <button className="bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-800 transition-colors text-sm font-medium">
                      Add Student
                    </button>
                  </Link>
                  <Link href="/admin/users/bulk-upload">
                    <button className="border border-[#000C50] text-[#000C50] px-4 py-2 rounded-md hover:bg-[#000C50] hover:text-white transition-colors text-sm font-medium">
                      Bulk Upload
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Users Table */}
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#000C50] mx-auto mb-3"></div>
                <p className="text-gray-600 text-sm">Loading users...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <div className="text-red-500 text-2xl mb-3">⚠️</div>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            ) : (
              <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Stud ID</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Name</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Email</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Role</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Degree</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Active</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Created</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={user.id} className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 font-mono">
                            {user.student_id || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <div>
                            <div className="text-xs font-medium text-gray-900">{user.name || 'N/A'}</div>
                            {user.first_name && user.last_name && (
                              <div className="text-xs text-gray-500">
                                {user.first_name} {user.middle_name ? user.middle_name + ' ' : ''}{user.last_name}{user.suffix ? ' ' + user.suffix : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <div className="text-xs text-gray-900">{user.email || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">{getRoleBadge(user.role)}</td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <div className="text-xs">
                            <div className="font-medium text-gray-900">{user.degree || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{getDegreeDisplayName(user.degree)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">{getStatusBadge(user.status)}</td>
                        <td className="px-4 py-3 border-r border-gray-100">{getActiveStatusBadge(user.is_active)}</td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <div className="text-xs text-gray-900">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
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
              </div>
              {users.length === 0 && (
                <div className="p-8 text-center">
                  <div className="text-gray-300 text-3xl mb-4">👥</div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-500 text-xs">Users will appear here when they register.</p>
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


