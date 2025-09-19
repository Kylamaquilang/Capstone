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
      const { data } = await API.get(`/products/name/${encodeURIComponent(productName)}`);
      setProduct(data);
      
      // Fetch available sizes for this product
      if (data.id) {
        try {
          const sizesResponse = await API.get(`/products/${data.id}/sizes`);
          setSizes(sizesResponse.data);
          if (sizesResponse.data.length > 0) {
            setSelectedSize(sizesResponse.data[0].id);
          }
        } catch (sizeError) {
          console.log('No sizes available for this product');
          setSizes([]);
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
    if (sizes.length > 0 && !selectedSize) {
      Swal.fire({
        icon: 'warning',
        title: 'Size Required',
        text: 'Please select a size before adding to cart.',
        confirmButtonColor: '#000C50'
      });
      throw new Error('Size required');
    }

    if (quantity > product.stock) {
      Swal.fire({
        icon: 'warning',
        title: 'Insufficient Stock',
        text: `Only ${product.stock} items available in stock.`,
        confirmButtonColor: '#000C50'
      });
      throw new Error('Insufficient stock');
    }

    try {
      const cartData = {
        product_id: product.id,
        quantity: quantity
      };

      if (sizes.length > 0 && selectedSize) {
        cartData.size_id = selectedSize;
      }

      const response = await API.post('/cart', cartData);

      if (response.data.success) {
        incrementCartCount();
        Swal.fire({
          icon: 'success',
          title: 'Added to Cart!',
          text: response.data.message || 'Product added to cart successfully.',
          confirmButtonColor: '#000C50'
        });
        return true;
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Failed to add product to cart.',
        confirmButtonColor: '#000C50'
      });
      throw err;
    }
  };

  const handleBuyNow = async () => {
    if (sizes.length > 0 && !selectedSize) {
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
      const cartData = {
        product_id: product.id,
        quantity: quantity
      };

      if (sizes.length > 0 && selectedSize) {
        cartData.size_id = selectedSize;
      }

      const response = await API.post('/cart', cartData);

      if (response.data.success) {
        incrementCartCount();

        const cartItem = {
          id: Date.now(),
          product_id: product.id,
          product_name: product.name,
          product_image: product.image || '/images/polo.png',
          price: parseFloat(product.price),
          quantity: quantity,
          size: selectedSize || null
        };
        
        const queryString = new URLSearchParams({
          items: JSON.stringify([cartItem])
        }).toString();
        
        router.push(`/checkout?${queryString}`);
        return true;
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Failed to add product to cart.',
        confirmButtonColor: '#000C50'
      });
      throw err;
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

  let imageUrl = '/images/polo.png';
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
            <div className="border rounded-lg shadow-sm p-4">
              <Image
                src={imageUrl}
                alt={product.name}
                width={280}
                height={280}
                className="object-contain max-w-xs mx-auto"
                onError={(e) => {
                  e.target.src = '/images/polo.png';
                }}
              />
            </div>

            {/* Product Info */}
            <div className="max-w-sm space-y-3">
              <h1 className="text-xl font-bold">{product.name}</h1>

              <span className="inline-block text-white bg-[#000C50] text-xs font-medium px-2 py-0.5 rounded-full">
                {product.category || 'PRODUCT'}
              </span>

              <p className="text-lg font-semibold">₱{product.price?.toFixed(2) || '0.00'}</p>

              {product.description && (
                <p className="text-sm text-gray-600">{product.description}</p>
              )}

              {/* Quantity */}
              <div className="mt-3">
                <p className="font-medium text-sm mb-1">QUANTITY:</p>
                <div className="flex items-center gap-2">
                  <button
                    className="w-7 h-7 border text-base font-semibold hover:bg-gray-100"
                    onClick={handleDecrease}
                    disabled={quantity <= 1}
                  >
                    –
                  </button>
                  <span className="w-6 text-center text-sm">{quantity}</span>
                  <button
                    className="w-7 h-7 border text-base font-semibold hover:bg-gray-100"
                    onClick={handleIncrease}
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Stock */}
              <p className="text-xs mt-1 text-gray-500">
                AVAILABLE STOCK: <strong>{product.stock}</strong>
              </p>

              {/* Size Selector */}
              {sizes.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium text-sm mb-1">CHOOSE A SIZE:</p>
                  <div className="flex gap-2 flex-wrap">
                    {sizes.map((size) => (
                      <button
                        key={size.id}
                        className={`border px-3 py-0.5 text-sm font-medium rounded ${
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

              {/* Action Buttons */}
              <div className="mt-5 space-y-2">
                <button 
                  className="bg-[#000C50] text-white w-40 py-2 text-sm font-medium rounded-md hover:bg-blue-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                >
                  {product.stock <= 0 ? 'OUT OF STOCK' : 'ADD TO CART'}
                </button>
                
                <button 
                  className="bg-green-600 text-white w-40 py-2 text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleBuyNow}
                  disabled={product.stock <= 0}
                >
                  {product.stock <= 0 ? 'OUT OF STOCK' : 'BUY NOW'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
