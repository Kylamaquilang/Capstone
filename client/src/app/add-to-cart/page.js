'use client';
import Image from 'next/image';
import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  BellIcon,
  ShoppingCartIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

export default function ProductPage() {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('S');

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrease = () => {
    setQuantity(quantity + 1);
  };

  const sizes = ['XS', 'S', 'M', 'L', 'XL'];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-[#000C50] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/images/cpc.png" alt="Logo" width={40} height={40} />
        </div>
        <div className="flex justify-center items-center">
          <Image src="/images/logo1.png" alt="Logo" width={100} height={100} />
        </div>
        <div className="flex gap-4 items-center">
          <button><MagnifyingGlassIcon className="h-6 w-6 text-white" /></button>
          <button><BellIcon className="h-6 w-6 text-white" /></button>
          <button><ShoppingCartIcon className="h-6 w-6 text-white" /></button>
          <button><UserCircleIcon className="h-6 w-6 text-white" /></button>
        </div>
      </nav>

      {/* Product Content */}
      <div className="min-h-screen p-10 bg-white flex justify-center items-center">
        <div className="flex flex-col md:flex-row gap-10">
          {/* Product Image */}
          <div className="border rounded-md shadow-md p-6 mb-14">
            <Image
              src="/images/polo.png"
              alt="IT Polo Shirt"
              width={350}
              height={350}
              className="object-contain"
            />
          </div>

          {/* Product Info */}
          <div className="max-w-md space-y-4">
            <h1 className="text-2xl font-extrabold">IT POLO SHIRT</h1>

            <span className="inline-block text-white bg-[#000C50] text-xs font-semibold px-3 py-1 rounded-full">
              POLO
            </span>

            <p className="text-xl font-bold">₱450.00</p>

            {/* Quantity */}
            <div className="mt-4">
              <p className="font-semibold mb-1">QUANTITY:</p>
              <div className="flex items-center gap-2">
                <button
                  className="w-8 h-8 border text-lg font-bold"
                  onClick={handleDecrease}
                >
                  –
                </button>
                <span className="w-8 text-center">{quantity}</span>
                <button
                  className="w-8 h-8 border text-lg font-bold"
                  onClick={handleIncrease}
                >
                  +
                </button>
              </div>
            </div>

            {/* Stock */}
            <p className="text-sm mt-2">
              AVAILABLE STOCK: <strong>100</strong>
            </p>

            {/* Size Selector */}
            <div className="mt-4">
              <p className="font-semibold mb-1">CHOOSE A SIZE:</p>
              <div className="flex gap-2 flex-wrap">
                {sizes.map((size) => (
                  <button
                    key={size}
                    className={`border px-4 py-1 font-semibold ${
                      selectedSize === size
                        ? 'bg-[#000C50] text-white'
                        : 'bg-white text-black'
                    }`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Add to Cart Button */}
            <button className="bg-[#000C50] text-white w-full py-3 mt-6 font-bold hover:bg-blue-900">
              ADD TO CART
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
