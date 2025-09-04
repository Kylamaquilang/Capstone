'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/axios';

export default function AddProductForm() {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [categories, setCategories] = useState([]);
  const [size, setSize] = useState('S');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      if (!file) {
        alert('Please choose an image file');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('image', file);
      const uploadRes = await API.post('/products/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const finalImageUrl = uploadRes.data.url; // e.g. /uploads/filename.jpg

      await API.post('/products', {
        name,
        description: '',
        price: Number(price),
        stock: Number(stock),
        category_id: categoryId ? Number(categoryId) : null,
        image: finalImageUrl
      });
      router.push('/admin/products');
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/products');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-black p-8 rounded-md w-full max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-6">ADD PRODUCT</h2>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">PRODUCT NAME:</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-400 px-3 py-2 rounded"
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block font-semibold mb-1">PRICE:</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-gray-400 px-3 py-2 rounded"
                placeholder="Enter price"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="flex-1">
              <label className="block font-semibold mb-1">STOCK:</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full border border-gray-400 px-3 py-2 rounded"
                placeholder="Quantity in stock"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">CATEGORY:</label>
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

          {/* SIZE */}
          <div>
            <label className="block font-semibold mb-1">SIZE:</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full border border-gray-400 px-3 py-2 rounded"
            >
              {['XS','S','M','L','XL','XXL'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column - Enhanced Image Upload */}
        <div className="space-y-4">
          <div>
            <label className="block font-semibold mb-3">PRODUCT IMAGE:</label>
            
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
                    <p className="text-sm font-medium text-gray-900">Upload an image</p>
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
