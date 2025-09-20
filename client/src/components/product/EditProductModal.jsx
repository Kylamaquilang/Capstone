'use client';
import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';

export default function EditProductModal({ isOpen, onClose, productId, onSuccess }) {
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [sizes, setSizes] = useState([{ size: 'S', stock: '', price: '' }]);

  useEffect(() => {
    if (isOpen && productId) {
      loadProduct();
      loadCategories();
    }
  }, [isOpen, productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await API.get(`/products/${productId}`);
      setProduct(data);
      
      // Set form values
      setName(data.name || '');
      setPrice(data.price || '');
      setStock(data.stock || '');
      setCategoryId(data.category_id || '');
      setDescription(data.description || '');
      setPreviewUrl(data.image || '');
      
      // Handle sizes
      if (data.sizes && data.sizes.length > 0) {
        setSizes(data.sizes.map(size => ({
          size: size.size,
          stock: size.stock.toString(),
          price: size.price ? size.price.toString() : ''
        })));
      } else {
        setSizes([{ size: 'S', stock: data.stock?.toString() || '', price: '' }]);
      }
    } catch (err) {
      setError('Failed to load product');
      console.error('Load product error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await API.get('/categories');
      setCategories(data || []);
    } catch (err) {
      console.error('Load categories error:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      // Validate required fields
      if (!name.trim()) {
        setError('Please enter a product name');
        setSaving(false);
        return;
      }
      if (!price || Number(price) <= 0) {
        setError('Please enter a valid price');
        setSaving(false);
        return;
      }
      if (!stock || Number(stock) < 0) {
        setError('Please enter a valid stock quantity');
        setSaving(false);
        return;
      }

      let finalImageUrl = product?.image || null;
      
      // Upload image if provided
      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        const uploadRes = await API.post('/products/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalImageUrl = uploadRes.data.url;
      }

      // Prepare sizes data
      const sizesData = sizes.filter(sizeItem => 
        sizeItem.size && sizeItem.stock && Number(sizeItem.stock) >= 0
      ).map(sizeItem => ({
        size: sizeItem.size,
        stock: Number(sizeItem.stock),
        price: sizeItem.price ? Number(sizeItem.price) : Number(price)
      }));

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        stock: Number(stock),
        category_id: categoryId ? Number(categoryId) : null,
        image: finalImageUrl,
        sizes: sizesData.length > 0 ? sizesData : undefined
      };

      await API.put(`/products/${productId}`, productData);
      
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error updating product:', err);
      
      // Handle specific error cases
      if (err?.response?.status === 409) {
        const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Product name already exists';
        setError(errorMessage);
      } else if (err?.response?.status === 400) {
        const errorMessage = err?.response?.data?.error || 'Invalid product data';
        setError(errorMessage);
      } else {
        setError('Failed to update product. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setError('');
      onClose();
    }
  };

  const addSize = () => {
    setSizes([...sizes, { size: 'S', stock: '', price: '' }]);
  };

  const removeSize = (index) => {
    if (sizes.length > 1) {
      setSizes(sizes.filter((_, i) => i !== index));
    }
  };

  const updateSize = (index, field, value) => {
    const updatedSizes = sizes.map((size, i) => 
      i === index ? { ...size, [field]: value } : size
    );
    setSizes(updatedSizes);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-medium text-gray-900">Edit Product</h2>
            <button
              onClick={handleClose}
              disabled={saving}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900"></div>
              </div>
            ) : error && !product ? (
              <div className="text-center py-8">
                <p className="text-red-600 text-sm mb-4">{error}</p>
                <button
                  onClick={loadProduct}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Product Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Enter product name"
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price (₱)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Stock */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        required
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="0"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={saving}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Enter product description"
                      />
                    </div>

                    {/* Product Sizes */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">Product Sizes</label>
                        <button
                          type="button"
                          onClick={addSize}
                          disabled={saving}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          + Add Size
                        </button>
                      </div>
                      <div className="space-y-2">
                        {sizes.map((sizeItem, index) => (
                          <div key={index} className="flex space-x-2 items-center">
                            <select
                              value={sizeItem.size}
                              onChange={(e) => updateSize(index, 'size', e.target.value)}
                              disabled={saving}
                              className="border border-gray-300 px-2 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {['XS','S','M','L','XL','XXL'].map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={sizeItem.stock}
                              onChange={(e) => updateSize(index, 'stock', e.target.value)}
                              placeholder="Stock"
                              min="0"
                              disabled={saving}
                              className="border border-gray-300 px-2 py-1 rounded text-sm w-20 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <input
                              type="number"
                              value={sizeItem.price}
                              onChange={(e) => updateSize(index, 'price', e.target.value)}
                              placeholder="Price (optional)"
                              min="0"
                              step="0.01"
                              disabled={saving}
                              className="border border-gray-300 px-2 py-1 rounded text-sm w-24 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            {sizes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSize(index)}
                                disabled={saving}
                                className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Leave price empty to use base price. Stock is required for each size.
                      </p>
                    </div>
                  </div>

                  {/* Right Column - Image Upload */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Product Image</label>
                      
                      {/* File Input Button */}
                      <div className="mb-4">
                        <button
                          type="button"
                          onClick={() => document.getElementById('product-file-input')?.click()}
                          disabled={saving}
                          className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span>Browse Files</span>
                        </button>
                        <input
                          id="product-file-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setFile(f);
                            setPreviewUrl(f ? URL.createObjectURL(f) : product?.image || '');
                          }}
                        />
                      </div>

                      {/* Drag & Drop Area */}
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                          dragActive 
                            ? 'border-gray-900 bg-gray-50 border-solid' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          setDragActive(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setDragActive(false);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragActive(false);
                          const droppedFile = e.dataTransfer.files[0];
                          if (droppedFile && droppedFile.type.startsWith('image/')) {
                            setFile(droppedFile);
                            setPreviewUrl(URL.createObjectURL(droppedFile));
                          }
                        }}
                        onClick={() => document.getElementById('product-file-input')?.click()}
                      >
                        {previewUrl ? (
                          <div className="space-y-2">
                            <img 
                              src={previewUrl} 
                              alt="Preview" 
                              className="w-32 h-32 object-cover rounded-lg mx-auto"
                            />
                            <p className="text-sm text-gray-600">Click to change image</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <div>
                              <p className="text-sm text-gray-600">Drag and drop an image here</p>
                              <p className="text-xs text-gray-500">or click to browse</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
