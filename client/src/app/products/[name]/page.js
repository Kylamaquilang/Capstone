'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Navbar from '@/components/Navbar';
import Footer from '@/components/common/footer';
import API from '@/lib/axios';
import Image from 'next/image';

export default function ProductDetailPage() {
  const { name } = useParams();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProduct();
    }
  }, [isAuthenticated, name]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      // First try to find by name
      const { data: products } = await API.get('/products');
      const foundProduct = products.find(p => 
        p.name.toLowerCase() === decodeURIComponent(name).toLowerCase()
      );
      
      if (foundProduct) {
        // Get detailed product info including sizes
        const { data: detailedProduct } = await API.get(`/products/${foundProduct.id}`);
        setProduct(detailedProduct);
      } else {
        setError('Product not found');
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedSize) {
      alert('Please select a size');
      return;
    }

    if (quantity < 1) {
      alert('Please select a valid quantity');
      return;
    }

    try {
      setAddingToCart(true);
      
      // Find the selected size info
      const sizeInfo = product.sizes.find(s => s.size === selectedSize);
      if (!sizeInfo || sizeInfo.stock < quantity) {
        alert('Selected size is out of stock or insufficient quantity');
        return;
      }

      // Add to cart
      await API.post('/cart/add', {
        product_id: product.id,
        size_id: sizeInfo.id,
        quantity: quantity
      });

      alert('Product added to cart successfully!');
      router.push('/cart');
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert(err?.response?.data?.error || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-white">
          <Navbar />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#000C50] mx-auto"></div>
              <p className="mt-4 text-lg text-gray-600">Loading product...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-white">
          <Navbar />
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <p className="text-red-600 text-lg mb-4">{error}</p>
              <button 
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 bg-[#000C50] text-white rounded hover:bg-[#1a237e] transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <Navbar />
        
        <div className="container mx-auto px-6 py-8 mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Image */}
            <div className="space-y-4">
              <div className="relative h-96 lg:h-[500px] rounded-lg overflow-hidden shadow-lg">
                <Image
                  src={product.image || '/images/polo.png'}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
                <p className="text-lg text-gray-600">{product.description}</p>
              </div>

              {/* Price */}
              <div className="text-3xl font-bold text-[#000C50]">
                ₱{parseFloat(product.price).toFixed(2)}
              </div>

              {/* Category */}
              {product.category_name && (
                <div>
                  <span className="inline-block bg-[#000C50] text-white text-sm font-semibold px-3 py-1 rounded-full">
                    {product.category_name}
                  </span>
                </div>
              )}

              {/* Size Selection */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Select Size</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {product.sizes.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setSelectedSize(size.size)}
                        disabled={size.stock === 0}
                        className={`p-3 border-2 rounded-lg text-center transition-colors ${
                          selectedSize === size.size
                            ? 'border-[#000C50] bg-[#000C50] text-white'
                            : size.stock === 0
                            ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                            : 'border-gray-300 hover:border-[#000C50] cursor-pointer'
                        }`}
                      >
                        <div className="font-semibold">{size.size}</div>
                        <div className="text-sm">
                          {size.stock > 0 ? `${size.stock} in stock` : 'Out of stock'}
                        </div>
                        {size.price && size.price !== product.price && (
                          <div className="text-xs">₱{parseFloat(size.price).toFixed(2)}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Quantity</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-[#000C50] transition-colors"
                  >
                    -
                  </button>
                  <span className="text-lg font-semibold w-16 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-[#000C50] transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize || addingToCart}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                  !selectedSize || addingToCart
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#000C50] text-white hover:bg-[#1a237e]'
                }`}
              >
                {addingToCart ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Adding to Cart...
                  </div>
                ) : (
                  'Add to Cart'
                )}
              </button>

              {/* Stock Info */}
              <div className="text-sm text-gray-600">
                <p>Total Stock: {product.stock}</p>
                {product.sizes && product.sizes.length > 0 && (
                  <p>Available in multiple sizes</p>
                )}
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 border-2 border-[#000C50] text-[#000C50] rounded-lg hover:bg-[#000C50] hover:text-white transition-colors"
            >
              ← Back to Products
            </button>
          </div>
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
