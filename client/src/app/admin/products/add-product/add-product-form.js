'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/axios';
import ImageUpload from '@/components/product/ImageUpload';

export default function AddProductForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([{ size: 'S', stock: '', price: '' }]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Check if sizes should be disabled based on category
  const isSizeDisabled = () => {
    if (!categoryId) return false;
    const selectedCategory = categories.find(c => c.id === Number(categoryId));
    if (!selectedCategory) return false;
    
    const categoryName = selectedCategory.name.toLowerCase();
    return categoryName === 'lanyard' || categoryName === 'tela';
  };

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
        alert('Please enter a valid price');
        setLoading(false);
        return;
      }
      if (!stock || Number(stock) < 0) {
        alert('Please enter a valid stock quantity');
        setLoading(false);
        return;
      }

      let finalImageUrl = null;
      
      // Handle image URL (already uploaded via ImageUpload component)
      if (file && typeof file === 'object' && file.url) {
        finalImageUrl = file.url;
      } else if (file && typeof file === 'string') {
        finalImageUrl = file;
      }

      // Prepare sizes data (only if sizes are not disabled)
      let sizesData = [];
      if (!isSizeDisabled()) {
        sizesData = sizes.filter(sizeItem => 
          sizeItem.size && sizeItem.stock && Number(sizeItem.stock) >= 0
        ).map(sizeItem => ({
          size: sizeItem.size,
          stock: Number(sizeItem.stock),
          price: sizeItem.price ? Number(sizeItem.price) : Number(price)
        }));
      }

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        stock: Number(stock),
        category_id: categoryId ? Number(categoryId) : null,
        image: finalImageUrl,
        sizes: sizesData.length > 0 ? sizesData : undefined
      };

      await API.post('/products', productData);
      
      // Show success message
      alert('Product created successfully!');
      router.push('/admin/products');
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

  const handleCancel = () => {
    router.push('/admin/products');
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
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-sm w-full max-w-2xl mx-auto">
      <h2 className="text-l font-bold mb-6">ADD PRODUCT</h2>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">PRODUCT NAME:</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-400 px-3 py-2 rounded"
              placeholder="Enter product name"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">DESCRIPTION:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-400 px-3 py-2 rounded h-20 resize-none"
              placeholder="Enter product description (optional)"
            />
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm mb-1">BASE PRICE:</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-gray-400 px-3 py-2 rounded"
                placeholder="Enter base price"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm mb-1">BASE STOCK:</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full border border-gray-400 px-3 py-2 rounded"
                placeholder="Base quantity in stock"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">CATEGORY:</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-400 px-3 py-2 rounded"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* PRODUCT SIZES */}
          <div className={isSizeDisabled() ? 'opacity-50 pointer-events-none' : ''}>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm">PRODUCT SIZES:</label>
              {!isSizeDisabled() && (
                <button
                  type="button"
                  onClick={addSize}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  + Add Size
                </button>
              )}
            </div>
            
            {isSizeDisabled() ? (
              <div className="p-3 bg-gray-100 rounded border border-gray-300">
                <p className="text-sm text-gray-600 text-center">
                  Sizes are not available for this category
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sizes.map((sizeItem, index) => (
                  <div key={index} className="flex space-x-2 items-center">
                    <select
                      value={sizeItem.size}
                      onChange={(e) => updateSize(index, 'size', e.target.value)}
                      className="border border-gray-400 px-2 py-1 rounded text-sm"
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
                      className="border border-gray-400 px-2 py-1 rounded text-sm w-20"
                    />
                    <input
                      type="number"
                      value={sizeItem.price}
                      onChange={(e) => updateSize(index, 'price', e.target.value)}
                      placeholder="Price (optional)"
                      min="0"
                      step="0.01"
                      className="border border-gray-400 px-2 py-1 rounded text-sm w-24"
                    />
                    {sizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSize(index)}
                        className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {!isSizeDisabled() && (
              <p className="text-xs text-gray-500 mt-1">
                Leave price empty to use base price. Stock is required for each size.
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Enhanced Image Upload */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-3">PRODUCT IMAGE (Optional):</label>
            
            {/* File Input Button */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => document.getElementById('product-file-input')?.click()}
                className="w-full bg-[#000C50] text-white py-3 px-4 rounded-md hover:bg-blue-900 transition-colors font-medium flex items-center justify-center space-x-2"
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
                  setPreviewUrl(f ? URL.createObjectURL(f) : '');
                }}
              />
            </div>

            {/* Drag & Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
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
                <div className="space-y-3">
                  <img src={previewUrl} alt="Preview" className="w-32 h-32 object-cover rounded-lg mx-auto border-2 border-gray-200" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file?.name}</p>
                    <p className="text-xs text-gray-500">Click to change image</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-900">Upload an image</p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* File Info */}
            {file && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">File size:</span>
                  <span className="font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">File type:</span>
                  <span className="font-medium">{file.type}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex space-x-4">
        <button type="submit" disabled={loading} className="bg-[#000C50] text-white px-4 py-2 rounded hover:bg-blue-900">
          {loading ? 'Saving...' : 'SAVE PRODUCT'}
        </button>
        <button type="button" onClick={handleCancel} className="bg-[#000C50] text-white px-6 py-2 rounded hover:bg-blue-900">
          CANCEL
        </button>
      </div>
    </form>
  );
}
