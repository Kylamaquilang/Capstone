'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';
import API from '@/lib/axios';
import Image from 'next/image';
import Swal from '@/lib/sweetalert-config';
import { getImageUrl } from '@/utils/imageUtils';
import { useUserAutoRefresh } from '@/hooks/useAutoRefresh';

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
      // Get all products (which includes grouped sizes)
      const { data: products } = await API.get('/products');
      const foundProduct = products.find(p => 
        p.name.toLowerCase() === decodeURIComponent(name).toLowerCase()
      );
      
      if (foundProduct) {
        // Use the grouped product data which includes all sizes
        setProduct(foundProduct);
        
        // Auto-select "NONE" size if it's the only option
        if (foundProduct.sizes && foundProduct.sizes.length === 1 && foundProduct.sizes[0].size === 'NONE') {
          setSelectedSize('NONE');
        }
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

  // Auto-refresh for product details
  useUserAutoRefresh(fetchProduct, 'products');

  // Helper function to get max quantity for selected size
  const getMaxQuantityForSelectedSize = () => {
    if (!product || !product.sizes || product.sizes.length === 0) {
      return product?.stock || 0;
    }
    
    // If only NONE size or no sizes, use product stock
    if (product.sizes.length === 1 && product.sizes[0].size === 'NONE') {
      return product.stock || 0;
    }
    
    // If no size selected, return 0
    if (!selectedSize) {
      return 0;
    }
    
    // Find the selected size and return its stock
    const selectedSizeData = product.sizes.find(size => size.size === selectedSize);
    return selectedSizeData ? selectedSizeData.stock : 0;
  };

  // Helper function to get the current price (size-specific or base price)
  const getCurrentPrice = () => {
    if (!product) return 0;
    
    // If no sizes or only NONE size, use base price
    if (!product.sizes || product.sizes.length === 0 || 
        (product.sizes.length === 1 && product.sizes[0].size === 'NONE')) {
      return parseFloat(product.price);
    }
    
    // If no size selected, show base price
    if (!selectedSize) {
      return parseFloat(product.price);
    }
    
    // Find the selected size and return its price
    const selectedSizeData = product.sizes.find(size => size.size === selectedSize);
    return selectedSizeData ? parseFloat(selectedSizeData.price) : parseFloat(product.price);
  };

  const handleAddToCart = async () => {
    // Only require size selection if the product has sizes available and not just "NONE"
    const hasMultipleSizes = product.sizes && product.sizes.length > 0 && 
      !(product.sizes.length === 1 && product.sizes[0].size === 'NONE');
    
    if (hasMultipleSizes && !selectedSize) {
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
      
      // Check stock for products with sizes
      if (product.sizes && product.sizes.length > 0) {
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
      } else {
        // Check stock for products without sizes (like lanyards)
        if (product.stock < quantity) {
          Swal.fire({
            icon: 'error',
            title: 'Out of Stock',
            text: 'Insufficient stock available',
            confirmButtonColor: '#000C50',
          });
          return;
        }
      }

      // Prepare cart data
      console.log('🔍 Product data:', product);
      console.log('🔍 Selected size:', selectedSize);
      console.log('🔍 Product sizes:', product.sizes);
      
      const cartData = {
        quantity: quantity,
        product_id: product.id // Always include product_id as fallback
      };

      // Handle size selection
      if (product.sizes && product.sizes.length > 0) {
        if (product.sizes.length === 1 && product.sizes[0].size === 'NONE') {
          // If only "NONE" size is available, use that size
          const sizeInfo = product.sizes[0];
          console.log('🔍 NONE size info:', sizeInfo);
          cartData.size_id = sizeInfo.id;
          cartData.product_id = sizeInfo.product_id || product.id;
        } else if (selectedSize) {
          // If user selected a size, use that size
          const sizeInfo = product.sizes.find(s => s.size === selectedSize);
          console.log('🔍 Size info for selected size:', sizeInfo);
          if (sizeInfo) {
            cartData.size_id = sizeInfo.id;
            cartData.product_id = sizeInfo.product_id || product.id;
          }
        } else {
          // Multiple sizes available but no size selected - this should not happen due to validation above
          console.log('❌ Multiple sizes available but no size selected');
          throw new Error('Please select a size');
        }
      }

      // Add to cart
      console.log('🛒 Sending cart data:', cartData);
      const response = await API.post('/cart', cartData);

      if (response.data.success) {
        // Cart count will be updated via Socket.io
        
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
        return true; // Return success for BUY NOW button
      }
    } catch (err) {
      console.log('Error adding to cart (server might be starting):', err.message);
      console.log('🛒 Error response:', err?.response?.data);
      
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Failed to add to cart. Please try again in a moment.';
      
      Swal.fire({
        icon: 'error',
        title: 'Add to Cart Failed',
        text: errorMessage,
        confirmButtonColor: '#000C50',
      });
      throw err; // Re-throw for BUY NOW button
    } finally {
      setAddingToCart(false);
    }
  };

  // Separate function for BUY NOW that doesn't show success message
  const handleBuyNow = async () => {
    // Only require size selection if the product has sizes available and not just "NONE"
    const hasMultipleSizes = product.sizes && product.sizes.length > 0 && 
      !(product.sizes.length === 1 && product.sizes[0].size === 'NONE');
    
    if (hasMultipleSizes && !selectedSize) {
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
      
      // Check stock for products with sizes
      if (product.sizes && product.sizes.length > 0) {
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
      } else {
        // Check stock for products without sizes (like lanyards)
        if (product.stock < quantity) {
          Swal.fire({
            icon: 'error',
            title: 'Out of Stock',
            text: 'Insufficient stock available',
            confirmButtonColor: '#000C50',
          });
          return;
        }
      }

      // For BUY NOW, don't add to cart - go directly to checkout
      // Create product data for direct checkout
      let sizeInfo = null;
      if (product.sizes && product.sizes.length > 0) {
        if (product.sizes.length === 1 && product.sizes[0].size === 'NONE') {
          sizeInfo = product.sizes[0];
        } else if (selectedSize) {
          sizeInfo = product.sizes.find(s => s.size === selectedSize);
        }
      }
      
      const productItem = {
        id: Date.now(), // Temporary ID for checkout
        product_id: sizeInfo ? sizeInfo.product_id : product.id,
        product_name: product.name,
        product_image: getImageUrl(product.image) || '/images/polo.png',
        price: getCurrentPrice(),
        quantity: quantity,
        size: sizeInfo ? sizeInfo.size : null,
        size_id: sizeInfo ? sizeInfo.id : null
      };
      
      console.log('🛒 Product item for checkout:', productItem);
      console.log('🔍 Size info used:', sizeInfo);
      
      // Pass the product item to checkout page
      const queryString = new URLSearchParams({
        items: JSON.stringify([productItem])
      }).toString();
      
      router.push(`/checkout?${queryString}`);
      return true;
    } catch (err) {
      console.log('Error adding to cart (server might be starting):', err.message);
      
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Failed to add to cart. Please try again in a moment.';
      
      Swal.fire({
        icon: 'error',
        title: 'Add to Cart Failed',
        text: errorMessage,
        confirmButtonColor: '#000C50',
      });
      throw err;
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
                <div className="flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
                <div className="text-center">
                  <p className="text-red-600 text-sm mb-6">{error}</p>
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="inline-block px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="container mx-auto px-2 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Product Image */}
                <div className="bg-white-100 p-8 flex items-center justify-center">
                  <div className="w-full max-w-sm">
                    <div className="aspect-square bg-white rounded-xl overflow-hidden">
                      <Image
                        src={getImageUrl(product.image) || '/images/polo.png'}
                        alt={product.name}
                        width={400}
                        height={400}
                        className="object-contain w-full h-full p-4"
                        onError={(e) => {
                          console.log('Image failed to load, using fallback');
                          e.target.src = '/images/polo.png';
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-8 space-y-6">
                  {/* Product Title */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wide">
                        {product.category || 'Product'}
                      </span>
                    </div>
                    <h1 className="text-xl font-medium text-gray-900 leading-tight">{product.name}</h1>
                    <div className="text-2xl font-medium text-gray-900">
                      ₱{getCurrentPrice().toFixed(2)}
                    </div>
                  </div>

                  {/* Description */}
                  {product.description && (
                    <div className="text-sm text-black-600 leading-relaxed">
                      {product.description}
                    </div>
                  )}

                  {/* Size Selection */}
                  {product.sizes && product.sizes.length > 0 && 
                   !(product.sizes.length === 1 && product.sizes[0].size === 'NONE') && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">Size</label>
                      <div className="flex gap-2 flex-wrap">
                        {product.sizes.map((size) => (
                          <button
                            key={size.id}
                            onClick={() => setSelectedSize(size.size)}
                            disabled={size.stock === 0}
                            className={`px-3 py-1 text-sm font-medium rounded-md border transition-colors ${
                              selectedSize === size.size
                                ? 'bg-gray-900 text-white border-gray-900'
                                : size.stock === 0
                                ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {size.size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Quantity:</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-6 h-6 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-xs font-medium bg-gray-50 border border-gray-300 rounded-md py-1">{quantity}</span>
                      <button
                        onClick={() => {
                          const maxQuantity = getMaxQuantityForSelectedSize();
                          setQuantity(Math.min(maxQuantity, quantity + 1));
                        }}
                        disabled={quantity >= getMaxQuantityForSelectedSize()}
                        className="w-6 h-6 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                    {selectedSize && (
                      <p className="text-xs text-gray-500">
                        Available: {getMaxQuantityForSelectedSize()} units
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleAddToCart}
                      disabled={addingToCart || getMaxQuantityForSelectedSize() <= 0 || (product.sizes && product.sizes.length > 0 && 
                        !(product.sizes.length === 1 && product.sizes[0].size === 'NONE') && !selectedSize)}
                      className={`w-full py-3 text-sm font-medium rounded-lg transition-colors ${
                        addingToCart || getMaxQuantityForSelectedSize() <= 0 || (product.sizes && product.sizes.length > 0 && 
                          !(product.sizes.length === 1 && product.sizes[0].size === 'NONE') && !selectedSize)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-[#000C50] text-white hover:bg-gray-800'
                      }`}
                    >
                      {addingToCart ? 'Adding to Cart...' : 
                       getMaxQuantityForSelectedSize() <= 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    
                    <button
                      onClick={handleBuyNow}
                      disabled={addingToCart || getMaxQuantityForSelectedSize() <= 0 || (product.sizes && product.sizes.length > 0 && 
                        !(product.sizes.length === 1 && product.sizes[0].size === 'NONE') && !selectedSize)}
                      className={`w-full py-3 text-sm font-medium rounded-lg transition-colors ${
                        addingToCart || getMaxQuantityForSelectedSize() <= 0 || (product.sizes && product.sizes.length > 0 && 
                          !(product.sizes.length === 1 && product.sizes[0].size === 'NONE') && !selectedSize)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-white text-gray-900 border border-bg[#000C50] hover:bg-gray-100'
                      }`}
                    >
                      {addingToCart ? 'Adding to Cart...' : 
                       getMaxQuantityForSelectedSize() <= 0 ? 'Out of Stock' : 'Buy Now'}
                    </button>
                  </div>

                  {/* Stock Info */}
                  <div className="text-xs text-gray-500">
                    {selectedSize ? 
                      `${getMaxQuantityForSelectedSize()} available in ${selectedSize} size` : 
                      `${product.stock} available in stock`
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-block px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
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
