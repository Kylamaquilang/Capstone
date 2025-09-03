'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/NotificationContext';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';
import API from '@/lib/axios';
import Image from 'next/image';
import Swal from 'sweetalert2';

export default function ProductDetailPage() {
  const { name } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { incrementCartCount } = useNotifications();
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
      console.log('Error fetching product (server might be starting):', err.message);
      setError('Failed to load product. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedSize) {
      Swal.fire({
        icon: 'warning',
        title: 'Size Required',
        text: 'Please select a size before adding to cart',
        confirmButtonColor: '#000C50',
      });
      return;
    }

    if (quantity < 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Quantity',
        text: 'Please select a valid quantity (at least 1)',
        confirmButtonColor: '#000C50',
      });
      return;
    }

    try {
      setAddingToCart(true);
      
      // Find the selected size info
      const sizeInfo = product.sizes.find(s => s.size === selectedSize);
      if (!sizeInfo || sizeInfo.stock < quantity) {
        Swal.fire({
          icon: 'error',
          title: 'Out of Stock',
          text: 'Selected size is out of stock or insufficient quantity',
          confirmButtonColor: '#000C50',
        });
        return;
      }

      // Add to cart (backend expects POST /api/cart with body)
      const response = await API.post('/cart', {
        product_id: product.id,
        size_id: sizeInfo.id,
        quantity: quantity
      });

      if (response.data.success) {
        // Increment cart count
        incrementCartCount();
        
        Swal.fire({
          icon: 'success',
          title: 'Added to Cart!',
          text: response.data.message,
          confirmButtonColor: '#000C50',
          showCancelButton: true,
          confirmButtonText: 'View Cart',
          cancelButtonText: 'Continue Shopping'
        }).then((result) => {
          if (result.isConfirmed) {
            router.push('/cart');
          }
        });
      }
    } catch (err) {
      console.log('Error adding to cart (server might be starting):', err.message);
      
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Failed to add to cart. Please try again in a moment.';
      
      Swal.fire({
        icon: 'error',
        title: 'Add to Cart Failed',
        text: errorMessage,
        confirmButtonColor: '#000C50',
      });
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

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Product Image */}
            <div className="relative">
              <Image
                src={product.image || '/images/polo.png'}
                alt={product.name}
                width={500}
                height={500}
                className="w-full h-auto rounded-lg border"
              />
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              
              <p className="text-2xl font-bold text-[#000C50]">
                ₱{parseFloat(product.price).toFixed(2)}
              </p>

              {product.description && (
                <p className="text-gray-600">{product.description}</p>
              )}

              {/* Size Selection */}
              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Select Size</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setSelectedSize(size.size)}
                        disabled={size.stock === 0}
                        className={`px-4 py-2 border rounded ${
                          selectedSize === size.size
                            ? 'border-[#000C50] bg-[#000C50] text-white'
                            : size.stock === 0
                            ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                            : 'border-gray-300 hover:border-[#000C50]'
                        }`}
                      >
                        {size.size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Quantity</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={!selectedSize || addingToCart}
                className={`w-full py-3 px-6 rounded font-semibold ${
                  !selectedSize || addingToCart
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#000C50] text-white hover:bg-[#1a237e]'
                }`}
              >
                {addingToCart ? 'Adding to Cart...' : 'Add to Cart'}
              </button>

              {/* Stock Info */}
              <div className="text-sm text-gray-600">
                <p>Stock: {product.stock}</p>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 border border-[#000C50] text-[#000C50] rounded hover:bg-[#000C50] hover:text-white transition-colors"
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


