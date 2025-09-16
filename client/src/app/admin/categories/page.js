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
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto lg:ml-0 ml-0">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">CATEGORY MANAGEMENT</h2>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-[#000C50] text-white px-4 py-2 rounded hover:bg-blue-900 transition"
              >
                {showAddForm ? 'Cancel' : 'Add Category'}
              </button>
            </div>

            {/* Add Category Form */}
            {showAddForm && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
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

            {loading ? (
              <div className="text-gray-600">Loading categories...</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : (
              <div className="bg-white border border-gray-300 overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-800 text-white">
                      <tr>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-600">Category Name</th>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-600">Created</th>
                        <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                    {categories.map((category, index) => (
                      <tr key={category.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors border-b border-gray-200`}>
                        <td className="px-6 py-4 border-r border-gray-200">
                          {editingId === category.id ? (
                            <form onSubmit={handleEditCategory} className="flex gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                              <button
                                type="submit"
                                className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600 transition"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{category.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 border-r border-gray-200">
                          <div className="text-sm text-gray-900">
                            {category.created_at ? new Date(category.created_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
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
                {categories.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-4">🏷️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                    <p className="text-gray-500">Add your first category to get started.</p>
                  </div>
                )}
                </div>
              </div>
            )}

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
    </div>
  );
}