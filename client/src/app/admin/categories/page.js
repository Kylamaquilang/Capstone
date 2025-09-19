'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/common/side-bar';
import Navbar from '@/components/common/admin-navbar';
import API from '@/lib/axios';
import ActionMenu from '@/components/common/ActionMenu';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/categories');
      setCategories(data || []);
    } catch (err) {
      setError('Failed to load categories');
      console.error('Load categories error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      await API.post('/categories', { name: newCategoryName.trim() });
      setNewCategoryName('');
      setShowAddForm(false);
      loadCategories();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to add category');
    }
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      await API.put(`/categories/${editingId}`, { name: editName.trim() });
      setEditingId(null);
      setEditName('');
      loadCategories();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!confirm(`Are you sure you want to delete the category "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await API.delete(`/categories/${id}`);
      loadCategories();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete category');
    }
  };

  const startEdit = (category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
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
                  <h1 className="text-xl font-semibold text-gray-900">Categories</h1>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-800 transition-colors text-sm font-medium"
                >
                  {showAddForm ? 'Cancel' : 'Add Category'}
                </button>
              </div>
            </div>

            {/* Add Category Form */}
            {showAddForm && (
              <div className="p-4 border-b border-gray-200 bg-blue-50">
                <h3 className="font-medium text-blue-800 mb-3">Add New Category</h3>
                <form onSubmit={handleAddCategory} className="flex gap-3">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name (e.g., POLO, LANYARD, PE, NSTP)"
                    className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                  >
                    Add
                  </button>
                </form>
              </div>
            )}

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
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Category Name</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Created</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category, index) => (
                      <tr key={category.id} className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}>
                        <td className="px-4 py-3 border-r border-gray-100">
                          {editingId === category.id ? (
                            <form onSubmit={handleEditCategory} className="flex gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                              />
                              <button
                                type="submit"
                                className="bg-green-600 text-white px-3 py-2 rounded-md text-xs hover:bg-green-700 transition"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="bg-gray-500 text-white px-3 py-2 rounded-md text-xs hover:bg-gray-600 transition"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <span className="text-xs font-medium text-gray-900">{category.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <div className="text-xs text-gray-900">
                            {category.created_at ? new Date(category.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {editingId !== category.id && (
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
                          )}
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
    </div>
  );
}