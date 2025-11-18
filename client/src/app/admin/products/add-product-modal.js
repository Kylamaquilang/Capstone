'use client';
import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';
import Swal from '@/lib/sweetalert-config';

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
  const [sizes, setSizes] = useState([{ size: 'NONE', stock: '', price: '' }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data } = await API.get('/categories');
        setCategories(data);
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

      // Validate that total size stock matches base stock exactly
      if (!isSizeStockValid()) {
        const totalSizeStock = getTotalSizeStock();
        const baseStock = Number(stock);
        
        // Only warn if total size stock exceeds base stock
        if (totalSizeStock > baseStock) {
          await Swal.fire({
            title: 'Stock Mismatch Warning!',
            text: `Total size stock (${totalSizeStock}) exceeds base stock (${baseStock}). The total size stock should not exceed the base stock.`,
            icon: 'warning',
            confirmButtonText: 'OK',
            confirmButtonColor: '#F59E0B'
          });
          setLoading(false);
          return;
        }
        
        // If sizes have no stock specified (totalSizeStock = 0), they will use base stock automatically
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
        sizeItem.size && sizeItem.size.trim() !== ''
      ).map(sizeItem => ({
        size: sizeItem.size,
        stock: sizeItem.stock ? Number(sizeItem.stock) : 0,
        price: sizeItem.price ? Number(sizeItem.price) : Number(price)
      }));

      console.log('🔍 Form sizes:', sizes);
      console.log('🔍 Processed sizes data:', sizesData);

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        original_price: Number(costPrice),
        stock: Number(stock) || 0, // Allow setting initial stock
        category_id: categoryId ? Number(categoryId) : null,
        image: finalImageUrl,
        sizes: sizesData.length > 0 ? sizesData : undefined
      };

      console.log('🔍 Product data being sent:', productData);

      await API.post('/products', productData);
      
      // Show SweetAlert success message
      await Swal.fire({
        title: 'Success!',
        text: 'Product created successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#000C50',
        timer: 2000,
        timerProgressBar: true
      });
      
      onSuccess();
      
      // Reset form
      setName('');
      setDescription('');
      setPrice('');
      setCostPrice('');
      setStock('');
      setCategoryId('');
      setFile(null);
      setPreviewUrl('');
      setSizes([{ size: 'NONE', stock: '', price: '' }]);
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
    setSizes([...sizes, { size: 'NONE', stock: '', price: '' }]);
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

  // Calculate total size stock
  const getTotalSizeStock = () => {
    return sizes.reduce((total, sizeItem) => {
      const sizeStock = Number(sizeItem.stock) || 0;
      return total + sizeStock;
    }, 0);
  };

  // Check if total size stock matches base stock exactly
  // Also valid if totalSizeStock is 0 (sizes will use base stock automatically)
  const isSizeStockValid = () => {
    const baseStock = Number(stock) || 0;
    const totalSizeStock = getTotalSizeStock();
    return totalSizeStock === baseStock || totalSizeStock === 0;
  };

  // Get remaining stock available for sizes
  const getRemainingStock = () => {
    const baseStock = Number(stock) || 0;
    const totalSizeStock = getTotalSizeStock();
    return Math.max(0, baseStock - totalSizeStock);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto scrollbar-hide">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Product</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
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
                    type=""
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
                    type=""
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
                    type=""
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Base stock"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                    ))}
                  </select>
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
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* Right Column - Product Sizes */}
              <div className="space-y-4">
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
                  
                  {/* Stock Summary */}
                  {stock && (
                    <div className="mb-3 p-2 bg-gray-50 rounded-md">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Base Stock:</span>
                        <span className="font-medium">{stock}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Total Size Stock:</span>
                        <span className={`font-medium ${getTotalSizeStock() !== Number(stock) ? 'text-red-600' : 'text-green-600'}`}>
                          {getTotalSizeStock()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Remaining:</span>
                        <span className={`font-medium ${getRemainingStock() !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {getRemainingStock()}
                        </span>
                      </div>
                      {!isSizeStockValid() && (
                        <div className="mt-1 text-xs text-red-600 font-medium">
                          ⚠️ Total size stock must match base stock exactly
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    {sizes.map((sizeItem, index) => (
                      <div key={index} className="flex space-x-2 items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
                          <select
                            value={sizeItem.size}
                            onChange={(e) => updateSize(index, 'size', e.target.value)}
                            className="w-full border border-gray-300 px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 h-8"
                          >
                            {['NONE','XXS','XS','S','M','L','XL','XXL','XXXL'].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
                          <input
                            type=""
                            value={sizeItem.stock}
                            onChange={(e) => updateSize(index, 'stock', e.target.value)}
                            className={`w-full border px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              getTotalSizeStock() !== Number(stock) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="0"
                            min="0"
                            max={getRemainingStock() + (Number(sizeItem.stock) || 0)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Price</label>
                          <input
                            type=""
                            value={sizeItem.price}
                            onChange={(e) => updateSize(index, 'price', e.target.value)}
                            className="w-full border border-gray-300 px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        {sizes.length > 1 && (
                          <button
                            type=""
                            onClick={() => removeSize(index)}
                            className="text-red-600 hover:text-red-800 transition-colors text-sm font-semibold px-1"
                          >
                            X
                          </button>
                        )}
                      </div>
                    ))}
              </div>
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

          </div>

          {/* Modal Footer */}
          <div className="mt-4 flex space-x-4">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {loading ? 'Saving...' : 'Save Product'}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
