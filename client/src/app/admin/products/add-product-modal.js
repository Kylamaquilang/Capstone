'use client';
import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';

export default function AddProductModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([{ size: 'S', stock: '', price: '' }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data } = await API.get('/categories');
        setCategories(data || []);
      } catch {
        setCategories([]);
      }
    };
    loadCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate required fields
      if (!name.trim()) {
        alert('Please enter a product name');
        setLoading(false);
        return;
      }
      if (!price || Number(price) <= 0) {
        alert('Please enter a valid selling price');
        setLoading(false);
        return;
      }
      
      if (!costPrice || Number(costPrice) <= 0) {
        alert('Please enter a valid cost price');
        setLoading(false);
        return;
      }
      
      if (Number(price) <= Number(costPrice)) {
        alert('Selling price must be higher than cost price');
        setLoading(false);
        return;
      }
      if (!stock || Number(stock) < 0) {
        alert('Please enter a valid stock quantity');
        setLoading(false);
        return;
      }

      let finalImageUrl = null;
      
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
        original_price: Number(costPrice),
        stock: Number(stock),
        category_id: categoryId ? Number(categoryId) : null,
        image: finalImageUrl,
        sizes: sizesData.length > 0 ? sizesData : undefined
      };

      await API.post('/products', productData);
      
      // Show success message
      alert('Product created successfully!');
      onSuccess();
    } catch (err) {
      console.error('Error creating product:', err);
      
      // Handle specific error cases
      if (err?.response?.status === 409) {
        const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Product name already exists';
        const suggestions = err?.response?.data?.suggestions || [];
        
        let suggestionText = '';
        if (suggestions.length > 0) {
          suggestionText = `\n\n💡 Suggested names:\n${suggestions.map(s => `• ${s}`).join('\n')}`;
        }
        
        alert(`❌ ${errorMessage}${suggestionText}\n\nPlease choose a different product name.`);
      } else if (err?.response?.status === 400) {
        const errorMessage = err?.response?.data?.error || 'Invalid product data';
        alert(`❌ ${errorMessage}\n\nPlease check your input and try again.`);
      } else {
        alert('❌ Failed to save product. Please try again.');
      }
    } finally {
      setLoading(false);
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

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Product</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20 resize-none"
                  placeholder="Enter product description (optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter cost price"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter selling price"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Stock</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Base quantity in stock"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Profit Analysis Display */}
              {costPrice && price && Number(costPrice) > 0 && Number(price) > 0 && (
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-800 font-medium">Profit Analysis:</span>
                    <div className="text-right">
                      <div className="text-green-600 font-bold">
                        Profit: ₱{(Number(price) - Number(costPrice)).toFixed(2)}
                      </div>
                      <div className="text-blue-600">
                        Margin: {(((Number(price) - Number(costPrice)) / Number(price)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Product Sizes */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Product Sizes</label>
                  <button
                    type="button"
                    onClick={addSize}
                    className="bg-[#000C50] text-white px-3 py-1 rounded-md text-xs hover:bg-green-700 transition-colors"
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
                        className="border border-gray-300 px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="border border-gray-300 px-2 py-1 rounded-md text-xs w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        value={sizeItem.price}
                        onChange={(e) => updateSize(index, 'price', e.target.value)}
                        placeholder="Price (optional)"
                        min="0"
                        step="0.01"
                        className="border border-gray-300 px-2 py-1 rounded-md text-xs w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {sizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSize(index)}
                          className="bg-red-600 text-white px-2 py-1 rounded-md text-xs hover:bg-red-700 transition-colors"
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
                <label className="block text-sm font-medium text-gray-700 mb-3">Product Image (Optional)</label>
                
                {/* File Input Button */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => document.getElementById('product-file-input')?.click()}
                    className="w-full bg-[#000C50] text-white py-2 px-4 rounded-md hover:bg-blue-800 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      setPreviewUrl(f ? URL.createObjectURL(f) : '');
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
                        <p className="text-xs font-medium text-gray-900">{file?.name}</p>
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

          {/* Modal Footer */}
          <div className="mt-6 flex space-x-3 justify-end">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {loading ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
