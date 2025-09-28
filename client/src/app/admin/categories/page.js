'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/common/side-bar';
import Navbar from '@/components/common/admin-navbar';
import API from '@/lib/axios';
import ActionMenu from '@/components/common/ActionMenu';
import { PencilSquareIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import AddCategoryModal from '@/components/admin/AddCategoryModal';
import Swal from 'sweetalert2';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/categories');
      setCategories(data);
    } catch (err) {
      setError('Failed to load categories');
      console.error('Load categories error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh for categories
  useAdminAutoRefresh(loadCategories, 'categories');

  const handleAddCategorySuccess = () => {
    loadCategories();
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      await API.put(`/categories/${editingId}`, { name: editName.trim() });
      setShowEditModal(false);
      setEditingId(null);
      setEditName('');
      setNewSubcategoryName('');
      setEditingCategory(null);
      loadCategories();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update category');
    }
  };



  const handleDeleteCategory = async (id, name) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `This will delete "${name}". This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await API.delete(`/categories/${id}`);
        
        // Update the categories state immediately
        setCategories(prevCategories => prevCategories.filter(cat => cat.id !== id));
        
        Swal.fire(
          'Deleted!',
          'The category has been deleted.',
          'success'
        );
        
        // Also reload from server to ensure consistency
        loadCategories();
      } catch (err) {
        Swal.fire(
          'Error!',
          err?.response?.data?.error || 'Failed to delete category',
          'error'
        );
      }
    }
  };

  const startEdit = (category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditingCategory(category);
    setShowEditModal(true);
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setEditingId(null);
    setEditName('');
    setEditingCategory(null);
  };

  const handleSelectCategory = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map(cat => cat.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkDelete = async () => {
    if (selectedCategories.length === 0) {
      Swal.fire('No Selection', 'Please select categories to delete.', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `This will delete ${selectedCategories.length} categor${selectedCategories.length > 1 ? 'ies' : 'y'}. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete them!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        // Delete all selected categories
        await Promise.all(
          selectedCategories.map(id => API.delete(`/categories/${id}`))
        );

        // Update state immediately
        setCategories(prevCategories => 
          prevCategories.filter(cat => !selectedCategories.includes(cat.id))
        );

        // Clear selection
        setSelectedCategories([]);
        setSelectAll(false);

        Swal.fire(
          'Deleted!',
          `${selectedCategories.length} categor${selectedCategories.length > 1 ? 'ies' : 'y'} deleted successfully.`,
          'success'
        );

        // Reload from server to ensure consistency
        loadCategories();
      } catch (err) {
        Swal.fire(
          'Error!',
          err?.response?.data?.error || 'Failed to delete categories',
          'error'
        );
      }
    }
  };

  return (
    <div className="min-h-screen text-black admin-page">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col bg-gray-50 p-2 sm:p-3 pt-32 overflow-auto lg:ml-64">
          {/* Main Container with Buttons and Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mt-20">
            {/* Header Section */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-lg sm:text-2xl font-semibold text-gray-900">Categories</h1>
                </div>
                <div className="flex gap-2">
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Delete Selected ({selectedCategories.length})
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-800 transition-colors text-sm font-medium"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </div>


            {/* Categories Table */}
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#000C50] mx-auto mb-3"></div>
                <p className="text-gray-600 text-sm">Loading categories...</p>
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
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Category Name</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category, index) => (
                      <tr key={category.id} className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => handleSelectCategory(category.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <span className="text-xs font-medium text-gray-900">
                            {category.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ActionMenu
                            actions={[
                              {
                                label: 'Edit Category',
                                icon: PencilSquareIcon,
                                onClick: () => startEdit(category)
                              },
                              {
                                label: 'Delete Category',
                                icon: TrashIcon,
                                onClick: () => handleDeleteCategory(category.id, category.name),
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
              {categories.length === 0 && (
                <div className="p-8 text-center">
                  <div className="text-gray-300 text-3xl mb-4">🏷️</div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No categories found</h3>
                  <p className="text-gray-500 text-xs">Add your first category to get started.</p>
                </div>
              )}
            </div>
          )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 p-4 rounded-lg mt-6">
            <h3 className="font-medium text-blue-800 mb-2">Category Information</h3>
            <p className="text-sm text-blue-700">
              • Categories help organize products (e.g., POLO, LANYARD, PE, NSTP)<br/>
              • Categories are used when adding new products<br/>
              • You can edit or delete categories at any time<br/>
              • Deleting a category will not affect existing products
            </p>
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <AddCategoryModal 
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddCategorySuccess}
        />
      )}

      {/* Edit Category Modal */}
      {showEditModal && editingCategory && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Edit Category</h2>
              <button
                onClick={cancelEdit}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Forms */}
            <div className="space-y-4">
              {/* Edit Category Form */}
              <form onSubmit={handleEditCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-900 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}