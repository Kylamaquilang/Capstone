'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';
import ActionMenu from '@/components/common/ActionMenu';
import { EyeIcon, PencilSquareIcon, UserMinusIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import AddStudentModal from '@/components/user/AddStudentModal';
import BulkUploadModal from '@/components/user/BulkUploadModal';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Pagination logic
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = users.slice(startIndex, endIndex);

  const handleModalSuccess = () => {
    fetchUsers(); // Refresh the users list
    setSelectedUsers(new Set()); // Clear selections
  };

  // Checkbox handlers
  const handleSelectUser = (userId) => {
    console.log('🔄 Individual checkbox clicked:', {
      userId,
      currentlySelected: selectedUsers.has(userId),
      totalSelected: selectedUsers.size
    });
    
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
        console.log('📝 User deselected:', userId);
      } else {
        newSet.add(userId);
        console.log('📝 User selected:', userId);
      }
      console.log('📊 New selection count:', newSet.size);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    console.log('🔄 Select All clicked:', {
      currentSelected: selectedUsers.size,
      totalUsers: users.length,
      allSelected: selectedUsers.size === users.length
    });
    
    if (selectedUsers.size === users.length) {
      // If all are selected, deselect all
      console.log('📝 Deselecting all users');
      setSelectedUsers(new Set());
    } else {
      // If not all are selected, select all
      console.log('📝 Selecting all users');
      const allUserIds = users.map(user => user.id);
      setSelectedUsers(new Set(allUserIds));
    }
  };

  // Bulk action handlers
  const handleBulkActivate = async () => {
    if (selectedUsers.size === 0) return;
    
    if (!confirm(`Are you sure you want to activate ${selectedUsers.size} user(s)?`)) {
      return;
    }

    try {
      setBulkActionLoading(true);
      const promises = Array.from(selectedUsers).map(userId => 
        API.patch(`/users/${userId}/status`, { is_active: true })
      );
      
      await Promise.all(promises);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          selectedUsers.has(user.id) 
            ? { ...user, is_active: true }
            : user
        )
      );
      
      setSelectedUsers(new Set());
      alert(`Successfully activated ${selectedUsers.size} user(s)`);
    } catch (err) {
      console.error('Failed to activate users:', err);
      alert(err?.response?.data?.error || 'Failed to activate users');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedUsers.size === 0) return;
    
    if (!confirm(`Are you sure you want to deactivate ${selectedUsers.size} user(s)?`)) {
      return;
    }

    try {
      setBulkActionLoading(true);
      const promises = Array.from(selectedUsers).map(userId => 
        API.patch(`/users/${userId}/status`, { is_active: false })
      );
      
      await Promise.all(promises);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          selectedUsers.has(user.id) 
            ? { ...user, is_active: false }
            : user
        )
      );
      
      setSelectedUsers(new Set());
      alert(`Successfully deactivated ${selectedUsers.size} user(s)`);
    } catch (err) {
      console.error('Failed to deactivate users:', err);
      alert(err?.response?.data?.error || 'Failed to deactivate users');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;
    
    const deleteCount = selectedUsers.size;
    
    if (!confirm(`Are you sure you want to delete ${deleteCount} user(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setBulkActionLoading(true);
      const promises = Array.from(selectedUsers).map(userId => 
        API.delete(`/users/${userId}`)
      );
      
      await Promise.all(promises);
      
      // Remove deleted users from local state completely
      setUsers(prevUsers => 
        prevUsers.filter(user => !selectedUsers.has(user.id))
      );
      
      // Clear selections
      setSelectedUsers(new Set());
      alert(`Successfully deleted ${deleteCount} user(s)`);
    } catch (err) {
      console.error('Failed to delete users:', err);
      alert(err?.response?.data?.error || 'Failed to delete users');
    } finally {
      setBulkActionLoading(false);
    }
  };

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
      
      // Remove user from local state completely
      setUsers(prevUsers => 
        prevUsers.filter(user => user.id !== userId)
      );
      
      // Also remove from selected users if it was selected
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      
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
    <div className="min-h-screen text-black admin-page">
      <Navbar />
      <div className="flex pt-16 lg:pt-20"> {/* Add padding-top for fixed navbar */}
        <Sidebar />
        <div className="flex-1 bg-gray-50 p-2 sm:p-3 overflow-auto lg:ml-64">
          {/* Main Container with Buttons and Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Header Section */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Users</h1>
                  {selectedUsers.size > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedUsers.size} user(s) selected
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Bulk Actions */}
                  {selectedUsers.size > 0 && (
                    <div className="flex items-center gap-2 mr-2">
                      <button 
                        onClick={handleBulkActivate}
                        disabled={bulkActionLoading}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        {bulkActionLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                        Activate Selected
                      </button>
                      <button 
                        onClick={handleBulkDeactivate}
                        disabled={bulkActionLoading}
                        className="bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        {bulkActionLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                        Deactivate Selected
                      </button>
                      <button 
                        onClick={handleBulkDelete}
                        disabled={bulkActionLoading}
                        className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        {bulkActionLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                        Delete Selected
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={() => setShowAddStudentModal(true)}
                    className="bg-[#000C50] text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                  >
                    Add Student
                  </button>
                  <button 
                    onClick={() => setShowBulkUploadModal(true)}
                    className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Bulk Upload
                  </button>
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
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={users.length > 0 && selectedUsers.size === users.length}
                            ref={(input) => {
                              if (input) {
                                input.indeterminate = selectedUsers.size > 0 && selectedUsers.size < users.length;
                              }
                            }}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-[#000C50] focus:ring-[#000C50] focus:ring-2"
                            title={selectedUsers.size === users.length ? "Deselect all users" : "Select all users"}
                          />
                          <span className="text-xs text-gray-500 hidden sm:inline">
                            {selectedUsers.size === users.length ? 'All' : 'Select All'}
                          </span>
                        </div>
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Stud ID</th>
                      <th className="px-2 sm:px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Name</th>
                      <th className="px-2 sm:px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Email</th>
                      <th className="px-2 sm:px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Role</th>
                      <th className="px-2 sm:px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Degree</th>
                      <th className="px-2 sm:px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Status</th>
                      <th className="px-2 sm:px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Active</th>
                      <th className="px-2 sm:px-4 py-3 text-xs font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user, index) => (
                      <tr key={user.id} className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } ${selectedUsers.has(user.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-2 sm:px-4 py-3 border-r border-gray-100">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                            className="rounded border-gray-300 text-[#000C50] focus:ring-[#000C50] focus:ring-2"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-3 border-r border-gray-100">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 font-mono">
                            {user.student_id || 'N/A'}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-3 border-r border-gray-100">
                          <div>
                            <div className="text-xs font-medium text-gray-900">{user.name || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-3 border-r border-gray-100">
                          <div className="text-xs text-gray-900">{user.email || 'N/A'}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-3 border-r border-gray-100">{getRoleBadge(user.role)}</td>
                        <td className="px-2 sm:px-4 py-3 border-r border-gray-100">
                          <div className="text-xs">
                            <div className="font-medium text-gray-900">{user.degree || 'N/A'}</div>
                      
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-3 border-r border-gray-100">{getStatusBadge(user.status)}</td>
                        <td className="px-2 sm:px-4 py-3 border-r border-gray-100">{getActiveStatusBadge(user.is_active)}</td>
                        <td className="px-2 sm:px-4 py-3">
                          <ActionMenu
                            actions={[
                              {
                                label: user.is_active ? 'Deactivate' : 'Activate',
                                icon: user.is_active ? UserMinusIcon : UserPlusIcon,
                                onClick: () => handleStatusToggle(user.id, user.is_active),
                                disabled: updatingStatus === user.id
                              },
                              {
                                label: 'Delete',
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
              {paginatedUsers.length === 0 && (
                <div className="p-8 text-center">
                  <div className="text-gray-300 text-3xl mb-4">👥</div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-500 text-xs">Users will appear here when they register.</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {users.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Records Info */}
                <div className="text-xs text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, users.length)} of {users.length} users
                </div>
                
                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                  {/* Previous Button */}
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || totalPages <= 1}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  >
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {/* First page */}
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => setCurrentPage(1)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          1
                        </button>
                        {currentPage > 4 && <span className="text-xs text-gray-400">...</span>}
                      </>
                    )}
                    
                    {/* Page numbers around current page */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      if (pageNum < 1 || pageNum > totalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-2 py-1 text-xs border rounded-md transition-colors ${
                            currentPage === pageNum
                              ? 'bg-[#000C50] text-white border-[#000C50]'
                              : 'border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    {/* Last page */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && <span className="text-xs text-gray-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages <= 1}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        onSuccess={handleModalSuccess}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}


