'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddProductForm() {
  const [productName, setProductName] = useState('');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState(null);
  const router = useRouter(); // ✅ useRouter hook

  const handleImageUpload = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: send data to backend
    console.log({ productName, size, price, category, image });
  };

  const handleCancel = () => {
    router.push('/admin/products'); // ✅ Navigate to product page
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-black p-8 rounded-md w-full max-w-4xl mx-auto"
    >
      <h2 className="text-xl font-bold mb-6">ADD PRODUCT</h2>

      <div className="grid grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">PRODUCT NAME:</label>
            <select
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full border border-gray-400 px-3 py-2 rounded"
              required
            >
              <option value="">Enter product name</option>
              <option value="Shirt">Shirt</option>
              <option value="PE Uniform">PE Uniform</option>
            </select>
          </div>

          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block font-semibold mb-1">SIZE:</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full border border-gray-400 px-3 py-2 rounded"
                required
              >
                <option value="">Select</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block font-semibold mb-1">PRICE:</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-gray-400 px-3 py-2 rounded"
                placeholder="Enter price"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">CATEGORY:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-400 px-3 py-2 rounded"
              required
            >
              <option value="">Select category</option>
              <option value="Tela">Tela</option>
              <option value="Polo">Polo</option>
              <option value="PE">PE</option>
              <option value="NSTP">NSTP</option>
              <option value="Lanyard">Lanyard</option>
            </select>
          </div>
        </div>

        {/* Right Column - File Upload */}
        <div className="flex flex-col items-center justify-center border border-gray-400 rounded p-4">
          <label className="font-semibold mb-2">PRODUCT IMAGE:</label>
          <div className="text-center text-sm text-gray-500 mb-2">
            Drag or drop files here <br /> OR
          </div>
          <label className="bg-[#000C50] text-white px-4 py-1 rounded cursor-pointer hover:bg-blue-900 text-sm">
            Browse File
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              required
            />
          </label>
          {image && (
            <p className="text-xs mt-2 text-gray-600 text-center truncate w-40">
              {image.name}
            </p>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-8 flex space-x-4">
        <button
          type="submit"
          className="bg-[#000C50] text-white px-4 py-2 rounded hover:bg-blue-900"
        >
          SAVE PRODUCT
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="bg-[#000C50] text-white px-6 py-2 rounded hover:bg-blue-900"
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}
