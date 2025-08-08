'use client';

import Footer from '@/components/common/footer';
import Navbar from '@/components/common/nav-bar';
import { products } from '@/data/products';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const decodedName = decodeURIComponent(params.name);

  const product = Object.values(products)
    .flat()
    .find((p) => p.name === decodedName);

  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  const sizes = ['S', 'M', 'L', 'XL'];
  const stockAvailable = 15;

  const noSizeOption =
    product?.label?.toLowerCase() === 'lanyard' ||
    product?.label?.toLowerCase() === 'tela';

  if (!product) {
    return (
      <div className="min-h-screen flex justify-center items-center text-red-500 text-xl">
        Product not found
      </div>
    );
  }

  const handleQuantityChange = (type) => {
    if (type === 'increase' && quantity < stockAvailable) {
      setQuantity(quantity + 1);
    }
    if (type === 'decrease' && quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');

    const newItem = {
      id: Date.now(), // unique id
      name: product.name,
      size: noSizeOption ? 'N/A' : selectedSize,
      quantity,
      price: parseFloat(product.price.replace('₱', '')), // Remove ₱ sign
      image: product.src,
    };

    localStorage.setItem('cart', JSON.stringify([...existingCart, newItem]));

    router.push('/cart'); // Redirect to cart page
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-6xl mx-auto py-12 px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Product Image */}
            <div className="flex justify-center">
              <Image
                src={product.src}
                alt={product.name}
                width={450}
                height={450}
                className="rounded-md shadow-lg object-cover"
              />
            </div>

            {/* Product Details */}
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">
                {product.name}
              </h1>
              <span className="inline-block bg-[#000C50] text-white px-3 py-1 rounded-full text-sm mb-4">
                {product.label}
              </span>
              <p className="text-2xl font-semibold text-gray-900 mb-6">
                {product.price}
              </p>

              <p className="text-green-600 mb-4">
                Stock Available: {stockAvailable}
              </p>

              {!noSizeOption && (
                <div className="mb-6">
                  <p className="font-bold mb-2">Select Size:</p>
                  <div className="flex gap-3">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 border rounded-md ${
                          selectedSize === size
                            ? 'bg-[#000C50] text-white'
                            : 'bg-white text-gray-800 border-gray-500'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <p className="font-semibold mb-2">Quantity:</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantityChange('decrease')}
                    className="px-3 py-1 border rounded-md bg-gray-200"
                  >
                    -
                  </button>
                  <span className="text-lg">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange('increase')}
                    className="px-3 py-1 border rounded-md bg-gray-200"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize && !noSizeOption}
                className={`px-8 py-3 rounded-lg transition ${
                  selectedSize || noSizeOption
                    ? 'bg-[#000C50] text-white hover:bg-blue-900'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
