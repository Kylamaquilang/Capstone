'use client';
import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';
import Swal from '@/lib/sweetalert-config';

export default function EditProductModal({ isOpen, onClose, productId, onSuccess }) {
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedSizes, setSelectedSizes] = useState([]);

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
      setCostPrice(data.original_price || '');
      setStock(data.stock || '');
      setCategoryId(data.category_id || '');
      setDescription(data.description || '');
      setPreviewUrl(data.image || '');
      
      // Handle sizes
      if (data.sizes && data.sizes.length > 0) {
        setSelectedSizes(data.sizes.map(size => size.size));
      } else {
        setSelectedSizes([]);
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

  // Available size options
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  // Handle size selection
  const handleSizeChange = (size) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
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
        setError('Please enter a valid selling price');
        setSaving(false);
        return;
      }
      // Removed cost price validation - only selling price is required
      // Stock validation removed - stock is auto-managed by inventory

      // Size stock validation removed - stock is auto-managed by inventory

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
      const sizesData = selectedSizes.map(size => ({
        size: size,
        stock: 0, // Auto-set to 0, managed by inventory
        price: Number(price) // Use base price
      }));

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        original_price: Number(costPrice), // Use the actual cost price
        // stock field removed - auto-managed by inventory
        category_id: categoryId ? Number(categoryId) : null,
        image: finalImageUrl,
        sizes: sizesData.length > 0 ? sizesData : undefined
      };

      await API.put(`/products/${productId}`, productData);
      
      // Show SweetAlert success message
      await Swal.fire({
        title: 'Success!',
        text: 'Product updated successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#000C50',
        timer: 2000,
        timerProgressBar: true
      });
      
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

  // Remove unused functions - sizes are now handled with checkboxes

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-xm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto scrollbar-hide">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Product</h2>
          <button
            onClick={handleClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4">
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
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Top Row - Left: Product Info, Right: Product Sizes */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left Column - Product Info */}
                    <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter product name"
                        required
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20 resize-none"
                        placeholder="Enter product description (optional)"
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter selling price"
                        min="0"
                        step="0.01"
                        required
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={saving}
                      >
                        <option value="" disabled>Select category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* Stock Display */}
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <div className="text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-700 font-medium">Base Stock:</span>
                          <span className="text-gray-900 font-bold">{stock || 0} (read-only)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">Size Stocks:</span>
                          <span className="text-gray-900 font-bold">Auto-managed (read-only)</span>
                        </div>
                      </div>
                    </div>
                    </div>

                    {/* Right Column - Product Sizes */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sizes</label>
                        <div className="grid grid-cols-3 gap-2">
                          {availableSizes.map((size) => (
                            <label key={size} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedSizes.includes(size)}
                                onChange={() => handleSizeChange(size)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                disabled={saving}
                              />
                              <span className="text-sm text-gray-700">{size}</span>
                            </label>
                          ))}
                        </div>
                        {selectedSizes.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Selected sizes: {selectedSizes.join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Image Upload Section */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Product Image</label>
                        
                        {/* File Input Button */}
                        <div className="mb-4">
                          <input
                            id="product-file-input"
                            type="file"
                            accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg"
                            className="hidden"
                            multiple={false}
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              setFile(f);
                              setPreviewUrl(f ? URL.createObjectURL(f) : product?.image || '');
                            }}
                          />
                        </div>

                        {/* Drag & Drop Area */}
                        <div
                          className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${
                            dragActive 
                              ? 'border-[#000C50] bg-blue-50 border-solid' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                          onDragLeave={() => setDragActive(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragActive(false);
                            const f = e.dataTransfer.files?.[0];
                            if (f) {
                              setFile(f);
                              setPreviewUrl(URL.createObjectURL(f));
                            }
                          }}
                          onClick={() => document.getElementById('product-file-input')?.click()}
                        >
                          {previewUrl ? (
                            <div className="space-y-2">
                              <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover rounded-lg mx-auto border-2 border-gray-200" />
                              <div>
                                <p className="text-xs font-medium text-gray-900">{file?.name || 'Current image'}</p>
                                <p className="text-xs text-gray-500">Click to change image</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <div>
                                <p className="text-xs text-gray-900">Upload an image</p>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* File Info */}
                        {file && (
                          <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">File size:</span>
                              <span className="font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                            <div className="flex items-center justify-between text-xs mt-1">
                              <span className="text-gray-600">File type:</span>
                              <span className="font-medium">{file.type}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="mt-4 flex space-x-4">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    {saving ? 'Updating...' : 'Update Product'}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
        </div>
      </div>
    </div>
  );
}
