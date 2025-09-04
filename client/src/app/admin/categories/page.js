'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/common/side-bar';
import Navbar from '@/components/common/admin-navbar';
import API from '@/lib/axios';

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
    <div className="flex flex-col h-screen text-black">
      <Navbar />
      <div className="flex flex-1">
        <div className="w-64" style={{ height: 'calc(100vh - 64px)' }}>
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
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
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2">ID</th>
                      <th className="px-4 py-2">Category Name</th>
                      <th className="px-4 py-2">Created</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{category.id}</td>
                        <td className="px-4 py-2">
                          {editingId === category.id ? (
                            <form onSubmit={handleEditCategory} className="flex gap-2">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                              <button
                                type="submit"
                                className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600 transition"
                              >
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <span className="font-medium">{category.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {category.created_at ? new Date(category.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            {editingId !== category.id && (
                              <>
                                <button
                                  onClick={() => startEdit(category)}
                                  className="px-3 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(category.id, category.name)}
                                  className="px-3 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 transition"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {categories.length === 0 && (
                  <div className="text-gray-600 mt-4 text-center py-8">
                    No categories found. Add your first category to get started.
                  </div>
                )}
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