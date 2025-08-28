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
        const allowed = new Set(['POLO', 'PE', 'NSTP', 'TELA', 'LANYARD']);
        const filtered = (data || []).filter((c) => c?.name && allowed.has(String(c.name).toUpperCase()));
        setCategories(filtered);
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

        {/* Right Column - Drag & Drop Upload */}
        <div
          className={`flex flex-col items-center justify-center rounded p-4 text-sm w-full h-full min-h-[220px] cursor-pointer transition border-2 ${dragActive ? 'border-[#000C50] bg-blue-50' : 'border-dashed border-gray-400'}`}
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

          {previewUrl ? (
            <div className="flex flex-col items-center">
              <img src={previewUrl} alt="Preview" className="w-40 h-40 object-cover rounded mb-2 border" />
              <span className="text-xs text-gray-600 max-w-[220px] truncate">{file?.name}</span>
              <span className="mt-2 text-xs text-gray-500">Click to choose another file</span>
            </div>
          ) : (
            <div className="text-center text-gray-600">
              <div className="font-semibold mb-1">PRODUCT IMAGE</div>
              <div>Drag & drop image here</div>
              <div className="text-xs mt-1">or click to browse</div>
            </div>
          )}
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
