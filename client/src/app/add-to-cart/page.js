'use client';

import ProtectedRoute from '@/components/common/ProtectedRoute';
import Footer from '@/components/common/footer';
import Navbar from '@/components/common/nav-bar';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/NotificationContext';
import API from '@/lib/axios';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

export default function ProductPage() {
  const { user, isAuthenticated } = useAuth();
  const { incrementCartCount } = useNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [product, setProduct] = useState(null);
  const [sizes, setSizes] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const productName = searchParams.get('name');

  useEffect(() => {
    if (productName) {
      fetchProduct();
    }
  }, [productName]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/products/${encodeURIComponent(productName)}`);
      setProduct(data);
      
      // Fetch available sizes for this product
      if (data.id) {
        const sizesResponse = await API.get(`/products/${data.id}/sizes`);
        setSizes(sizesResponse.data);
        if (sizesResponse.data.length > 0) {
          setSelectedSize(sizesResponse.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrease = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedSize) {
      Swal.fire({
        icon: 'warning',
        title: 'Size Required',
        text: 'Please select a size before adding to cart.',
        confirmButtonColor: '#000C50'
      });
      return;
    }

    if (quantity > product.stock) {
      Swal.fire({
        icon: 'warning',
        title: 'Insufficient Stock',
        text: `Only ${product.stock} items available in stock.`,
        confirmButtonColor: '#000C50'
      });
      return;
    }

    try {
      const response = await API.post('/cart', {
        product_id: product.id,
        size_id: selectedSize,
        quantity: quantity
      });

      if (response.data.success) {
        incrementCartCount();
        Swal.fire({
          icon: 'success',
          title: 'Added to Cart!',
          text: response.data.message || 'Product added to cart successfully.',
          confirmButtonColor: '#000C50'
        });
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Failed to add product to cart.',
        confirmButtonColor: '#000C50'
      });
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-white">
          <Navbar />
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#000C50]"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !product) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-white">
          <Navbar />
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-center">
              <p className="text-red-600 text-lg mb-4">{error || 'Product not found'}</p>
              <Link 
                href="/dashboard"
                className="px-6 py-2 bg-[#000C50] text-white rounded hover:bg-[#1a237e] transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Ensure we have a valid image URL
  let imageUrl = '/images/polo.png'; // default fallback
  if (product.image && product.image.startsWith('/')) {
    imageUrl = product.image;
  } else if (product.image && product.image.startsWith('http')) {
    imageUrl = product.image;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <Navbar />

        {/* Product Content */}
        <div className="min-h-screen p-10 bg-white flex justify-center items-center">
          <div className="flex flex-col md:flex-row gap-10">
            {/* Product Image */}
            <div className="border rounded-md shadow-md p-6">
              <Image
                src={imageUrl}
                alt={product.name}
                width={300}
                height={300}
                className="object-contain"
                onError={(e) => {
                  e.target.src = '/images/polo.png';
                }}
              />
            </div>

            {/* Product Info */}
            <div className="max-w-md space-y-4">
              <h1 className="text-2xl font-extrabold">{product.name}</h1>

              <span className="inline-block text-white bg-[#000C50] text-xs font-semibold px-3 py-1 rounded-full">
                {product.category || 'PRODUCT'}
              </span>

              <p className="text-xl font-bold">₱{product.price?.toFixed(2) || '0.00'}</p>

              {product.description && (
                <p className="text-sm text-gray-600">{product.description}</p>
              )}

              {/* Quantity */}
              <div className="mt-4">
                <p className="font-semibold mb-1">QUANTITY:</p>
                <div className="flex items-center gap-2">
                  <button
                    className="w-8 h-8 border text-lg font-bold hover:bg-gray-100"
                    onClick={handleDecrease}
                    disabled={quantity <= 1}
                  >
                    –
                  </button>
                  <span className="w-8 text-center">{quantity}</span>
                  <button
                    className="w-8 h-8 border text-lg font-bold hover:bg-gray-100"
                    onClick={handleIncrease}
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Stock */}
              <p className="text-sm mt-2">
                AVAILABLE STOCK: <strong>{product.stock}</strong>
              </p>

              {/* Size Selector */}
              {sizes.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold mb-1">CHOOSE A SIZE:</p>
                  <div className="flex gap-2 flex-wrap">
                    {sizes.map((size) => (
                      <button
                        key={size.id}
                        className={`border px-4 py-1 font-semibold ${
                          selectedSize === size.id
                            ? 'bg-[#000C50] text-white'
                            : 'bg-white text-black hover:bg-gray-100'
                        }`}
                        onClick={() => setSelectedSize(size.id)}
                      >
                        {size.size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to Cart Button */}
              <button 
                className="bg-[#000C50] text-white w-full py-3 mt-6 font-bold hover:bg-blue-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
              >
                {product.stock <= 0 ? 'OUT OF STOCK' : 'ADD TO CART'}
              </button>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
