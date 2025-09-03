'use client';
import Footer from '@/components/common/footer';
import Navbar from '@/components/common/nav-bar';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import API from '@/lib/axios';
import Swal from 'sweetalert2';

export default function CartPage() {
  const { updateCartCount } = useNotifications();
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load cart from API
  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await API.get('/cart');
      if (response.data.success) {
        setCartItems(response.data.items || []);
      } else {
        setError('Failed to load cart');
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      const result = await Swal.fire({
        title: 'Remove Item',
        text: 'Are you sure you want to remove this item from your cart?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#000C50',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        const response = await API.delete(`/cart/${id}`);
        if (response.data.success) {
          setCartItems(prev => prev.filter(item => item.id !== id));
          setSelectedItems(prev => prev.filter(itemId => itemId !== id));
          
          // Update cart count
          updateCartCount(cartItems.length - 1);
          
          Swal.fire({
            icon: 'success',
            title: 'Item Removed',
            text: response.data.message,
            confirmButtonColor: '#000C50',
          });
        }
      }
    } catch (err) {
      console.error('Error removing item:', err);
      const errorMessage = err?.response?.data?.message || 'Failed to remove item';
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#000C50',
      });
    }
  };

  const toggleSelect = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map((item) => item.id));
    }
  };

  const handleClearCart = async () => {
    try {
      const result = await Swal.fire({
        title: 'Clear Cart',
        text: 'Are you sure you want to clear your entire cart?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#000C50',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, clear it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        const response = await API.delete('/cart');
        if (response.data.success) {
          setCartItems([]);
          setSelectedItems([]);
          
          // Update cart count to 0
          updateCartCount(0);
          
          Swal.fire({
            icon: 'success',
            title: 'Cart Cleared',
            text: response.data.message,
            confirmButtonColor: '#000C50',
          });
        }
      }
    } catch (err) {
      console.error('Error clearing cart:', err);
      const errorMessage = err?.response?.data?.message || 'Failed to clear cart';
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#000C50',
      });
    }
  };

  const total = cartItems
    .filter((item) => selectedItems.includes(item.id))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-grow px-6 py-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#000C50] mx-auto"></div>
              <p className="mt-4 text-lg text-gray-600">Loading cart...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-grow px-6 py-10 max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <button 
              onClick={fetchCart}
              className="px-6 py-2 bg-[#000C50] text-white rounded hover:bg-[#1a237e] transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-grow px-6 py-10 max-w-4xl mx-auto pb-32">
        <h2 className="text-3xl font-bold mb-8 ml-80 text-[#000C50]">MY CART</h2>

        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">Your cart is empty.</p>
            <button 
              onClick={() => window.location.href = '/products'}
              className="px-6 py-2 bg-[#000C50] text-white rounded hover:bg-[#1a237e] transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="relative bg-white rounded-lg shadow-lg p-6 flex items-center gap-6 border border-gray-200 w-200"
              >
                {/* Delete Button */}
                <button
                  onClick={() => handleRemove(item.id)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>

                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="w-5 h-5 mt-1"
                />

                {/* Product Info */}
                <Image
                  src={item.product_image || '/images/polo.png'}
                  alt={item.product_name}
                  width={100}
                  height={100}
                  className="rounded-md"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-xl">{item.product_name}</h3>
                  <p className="text-sm text-gray-600">Size: {item.size || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  <p className="text-md font-bold text-[#000C50] mt-2">
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Fixed Bottom Section */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="text-[#000C50] hover:underline font-medium"
                >
                  {selectedItems.length === cartItems.length ? 'Deselect All' : 'Select All'}
                </button>
                
                {selectedItems.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="text-red-600 hover:underline font-medium"
                  >
                    Clear Selected
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-semibold">Total: ₱{total.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">
                    {selectedItems.length} item(s) selected
                  </p>
                </div>
                
                <button
                  disabled={selectedItems.length === 0}
                  className={`px-8 py-3 rounded-lg font-semibold ${
                    selectedItems.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#000C50] text-white hover:bg-[#1a237e] transition-colors'
                  }`}
                  onClick={() => {
                    const selectedItemsData = cartItems.filter(item => selectedItems.includes(item.id));
                    const queryString = new URLSearchParams({
                      items: JSON.stringify(selectedItemsData)
                    }).toString();
                    window.location.href = `/checkout?${queryString}`;
                  }}
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
