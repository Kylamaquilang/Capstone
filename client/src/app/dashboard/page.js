'use client';

import ProtectedRoute from '@/components/common/ProtectedRoute';
import Footer from '@/components/common/footer';
import Navbar from '@/components/common/nav-bar';
import { useAuth } from '@/context/auth-context';
import API from '@/lib/axios';
import Image from 'next/image';
import Link from 'next/link';
import { getProductImageUrl } from '@/utils/imageUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';

export default function UserDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const { socket, isConnected, joinUserRoom } = useSocket();
  const router = useRouter();
  const [products, setProducts] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();

      // Set up Socket.io listeners for real-time updates
      if (socket && isConnected && user?.id) {
        // Join user room for real-time updates
        joinUserRoom(user.id.toString());

        // Listen for order updates
        const handleOrderUpdate = (orderData) => {
          console.log('📦 Real-time order update received on dashboard:', orderData);
          // Refresh products when orders are updated (might affect stock)
          fetchProducts();
        };

        // Listen for new notifications (might indicate order changes)
        const handleNewNotification = (notificationData) => {
          console.log('🔔 Real-time notification received on dashboard:', notificationData);
          // Refresh products when notifications arrive (might be order-related)
          fetchProducts();
        };

        socket.on('order-status-updated', handleOrderUpdate);
        socket.on('new-notification', handleNewNotification);

        return () => {
          socket.off('order-status-updated', handleOrderUpdate);
          socket.off('new-notification', handleNewNotification);
        };
      }
    }
  }, [isAuthenticated, socket, isConnected, user?.id, joinUserRoom]);

  // Check for order completion from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderCompleted = urlParams.get('orderCompleted');
    const orderId = urlParams.get('orderId');
    
    if (orderCompleted === 'true' && orderId) {
      setCompletedOrderId(orderId);
      setShowThankYouModal(true);
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const { data } = await API.get('/products');
      
      // Define the specific order for categories
      const categoryOrder = ['POLO', 'LANYARD', 'TELA', 'PE', 'NSTP'];
      
      // Group products by category
      const groupedProducts = {};
      
      data.forEach(product => {
        // Ensure we have a valid image URL
        const imageUrl = getProductImageUrl(product.image || product.image_url);
        
        const productData = {
          id: product.id,
          name: product.name,
          src: imageUrl,
          price: `₱${product.price?.toFixed(2) || '0.00'}`,
          description: product.description,
          stock: product.stock
        };
        
        const categoryName = product.category || 'Other';
        
        if (!groupedProducts[categoryName]) {
          groupedProducts[categoryName] = [];
        }
        
        groupedProducts[categoryName].push(productData);
      });
      
      // Sort categories according to the specified order
      const sortedCategories = {};
      categoryOrder.forEach(category => {
        if (groupedProducts[category]) {
          sortedCategories[category] = groupedProducts[category];
        }
      });
      
      // Add any remaining categories that weren't in the specified order
      Object.keys(groupedProducts).forEach(category => {
        if (!categoryOrder.includes(category)) {
          sortedCategories[category] = groupedProducts[category];
        }
      });
      
      setProducts(sortedCategories);
    } catch (err) {
      console.log('Error fetching products (server might be starting):', err.message);
      setError('Failed to load products. Please try again in a moment.');
    } finally {
      setProductsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <Navbar />

  

        {/* Banner Section */}
        <section className="flex w-300 h-[400px] mt-15 mb-10 mt-15 rounded-sm overflow-hidden shadow-md">
          <div className="relative w-3/4">
            <Image
              src="/images/school.png"
              alt="School Background"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[#000C50]/80 flex flex-col justify-center px-10 text-white">
              <h2 className="text-8xl font-extrabold ml-30">CPC</h2>
              <h2 className="text-8xl font-extrabold ml-45">ESSEN</h2>
              <p className="mt-3 text-sm max-w-md ml-30">
                Equip yourself for success, find everything you need to thrive in school, from study tools to personal essentials, all in one place.
              </p>
            </div>
          </div>
          <div className="w-2/5 bg-[#000C50] flex justify-center items-center">
            <Image src="/images/cpc.png" alt="CPC Logo" width={250} height={250} className="object-contain" />
          </div>
        </section>

        {/* Products Section */}
        <div className="p-6 space-y-10">
          {productsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#000C50] mx-auto"></div>
              <p className="mt-4 text-lg text-gray-600">Loading products...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 text-lg">{error}</p>
              <button 
                onClick={fetchProducts}
                className="mt-4 px-6 py-2 bg-[#000C50] text-white rounded hover:bg-[#1a237e] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : Object.keys(products).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No products available at the moment.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(products).map(([categoryName, categoryProducts]) => (
                <div key={categoryName} className="space-y-6">
                  {/* Products Row for this Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-15">
                    {categoryProducts.map((item) => (
                      <Link
                        key={item.id}
                        href={`/products/${encodeURIComponent(item.name)}`}
                        className="block group"
                      >
                        <div className="bg-white rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                          {/* Product Image - Rectangular */}
                          <div className="relative h-63 mb-8 rounded-lg overflow-hidden">
                            <Image
                              src={item.src}
                              alt={item.name}
                              fill
                              className="object-contain p-3"
                              onError={(e) => {
                                e.target.src = '/images/polo.png';
                              }}
                            />
                            {/* Stock Badge */}
                            {item.stock <= 0 && (
                              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                Out of Stock
                              </div>
                            )}
                            {item.stock > 0 && item.stock <= 5 && (
                              <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                                Low Stock
                              </div>
                            )}
                          </div>
                          
                          {/* Product Info */}
                          <div className="text-center">
                            <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
                              {item.name}
                            </h3>
                            <p className="text-lg font-medium text-[#000C50]">
                              {item.price}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thank You Modal */}
        {showThankYouModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
                <p className="text-gray-600 mb-4">
                  Your order #{completedOrderId} has been successfully completed!
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Thank you for choosing CPC Essen. We hope you enjoy your purchase!
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowThankYouModal(false)}
                  className="flex-1 bg-[#000C50] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#000C50]/90 transition-colors"
                >
                  Continue Shopping
                </button>
                <Link
                  href="/user-profile"
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center"
                  onClick={() => setShowThankYouModal(false)}
                >
                  View Orders
                </Link>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
