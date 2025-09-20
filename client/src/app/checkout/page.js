'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';
import Swal from 'sweetalert2';
import API from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { BanknotesIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

const CheckoutPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedMethod, setSelectedMethod] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  // Get selected items from URL parameters
  useEffect(() => {
    const itemsParam = searchParams.get('items');
    if (itemsParam) {
      try {
        const selectedItems = JSON.parse(itemsParam);
        setCartItems(selectedItems);
        
        // Calculate total from selected items
        const total = selectedItems.reduce((sum, item) => {
          return sum + (item.price * item.quantity);
        }, 0);
        setTotalAmount(total);
      } catch (err) {
        console.error('Failed to parse selected items:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load selected items'
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback: fetch all cart items if no selected items provided
      const fetchCart = async () => {
        try {
          const { data } = await API.get('/cart');
          setCartItems(data.items || []);
          
          // Calculate total
          const total = data.items?.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
          }, 0) || 0;
          setTotalAmount(total);
        } catch (err) {
          console.error('Failed to fetch cart:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load cart items'
          });
        } finally {
          setLoading(false);
        }
      };

      fetchCart();
    }
  }, [searchParams]);

  const handleSelect = (method) => {
    if (method === 'gcash') {
      Swal.fire({
        title: 'Proceed with GCash?',
        text: 'You will be redirected to PayMongo for secure payment.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#000C50',
        cancelButtonColor: '#aaa',
        confirmButtonText: 'Yes, proceed',
      }).then((result) => {
        if (result.isConfirmed) {
          setSelectedMethod('gcash');
        }
      });
    } else {
      setSelectedMethod(method);
    }
  };

  const handleCheckout = async () => {
    if (!selectedMethod) {
      Swal.fire({
        icon: 'warning',
        title: 'Payment Method Required',
        text: 'Please select a payment method'
      });
      return;
    }

    if (cartItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Empty Cart',
        text: 'Your cart is empty'
      });
      return;
    }

    try {
      setProcessingPayment(true);

      if (selectedMethod === 'gcash') {
        // Create order first
        // Check if we have real cart item IDs or temporary ones from BUY NOW
        const hasRealCartIds = cartItems.every(item => typeof item.id === 'number' && item.id < 1000000000000); // Real DB IDs are smaller
        
        const checkoutData = {
          payment_method: 'gcash',
          pay_at_counter: false
        };

        if (hasRealCartIds) {
          // Use existing cart items
          checkoutData.cart_item_ids = cartItems.map(item => item.id);
        } else {
          // Create order directly from product data (BUY NOW flow)
          checkoutData.products = cartItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            size_id: item.size_id || null
          }));
        }

        const orderResponse = await API.post('/checkout', checkoutData);

        const orderId = orderResponse.data.orderId;

        // Create GCash payment
        const paymentResponse = await API.post('/payments/gcash/create', {
          orderId: orderId,
          amount: totalAmount,
          description: `Order #${orderId} - CPC Store`
        });

        if (paymentResponse.data.payment_url) {
          // Redirect to PayMongo payment page
          window.location.href = paymentResponse.data.payment_url;
        } else {
          throw new Error('Payment URL not received');
        }

      } else if (selectedMethod === 'pickup') {
        // Create order for cash payment
        // Check if we have real cart item IDs or temporary ones from BUY NOW
        const hasRealCartIds = cartItems.every(item => typeof item.id === 'number' && item.id < 1000000000000); // Real DB IDs are smaller
        
        const checkoutData = {
          payment_method: 'cash',
          pay_at_counter: true
        };

        if (hasRealCartIds) {
          // Use existing cart items
          checkoutData.cart_item_ids = cartItems.map(item => item.id);
        } else {
          // Create order directly from product data (BUY NOW flow)
          checkoutData.products = cartItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            size_id: item.size_id || null
          }));
        }

        const response = await API.post('/checkout', checkoutData);

        // Create product summary
        const productSummary = cartItems.length === 1 
          ? cartItems[0].product_name
          : `${cartItems[0].product_name} and ${cartItems.length - 1} other item${cartItems.length - 1 !== 1 ? 's' : ''}`;

        Swal.fire({
          icon: 'success',
          title: 'Order Placed Successfully!',
          text: `${productSummary} - Please pay ₱${totalAmount.toFixed(2)} upon pickup.`,
          confirmButtonColor: '#000C50',
          customClass: {
            title: 'text-lg font-medium',
            content: 'text-sm font-normal',
            confirmButton: 'text-sm font-medium'
          }
        }).then(() => {
          router.push('/cart');
        });
      }

    } catch (error) {
      console.error('Checkout error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Checkout Failed',
        text: error.response?.data?.error || 'An error occurred during checkout'
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-xl">Loading cart...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold mb-2">Your Cart is Empty</h2>
            <p className="text-gray-600 mb-4">Add some items to your cart to proceed with checkout</p>
            <button 
              onClick={() => router.push('/products')}
              className="bg-[#000C50] text-white px-6 py-2 rounded hover:bg-blue-900"
            >
              Browse Products
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in your order</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>
              
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-b-0">
                    {/* Product Image */}
                    <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={item.product_image || '/images/polo.png'}
                        alt={item.product_name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-base mb-1 truncate">{item.product_name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        <span>{item.size || 'One Size'}</span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        ₱{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Total */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-1xl font-medium text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-gray-900">₱{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Payment Method & Checkout */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Method</h2>
              
              <div className="space-y-4 mb-8">
                {/* Pay at Counter */}
                <div 
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedMethod === 'pickup' 
                      ? 'border-[#000C50] bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelect('pickup')}
                >
                  <div className="flex items-center gap-3">
                    <BanknotesIcon className="h-5 w-5 text-[#000C50]" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Pay at Counter</div>
                      <div className="text-sm text-gray-600">Cash payment upon pickup</div>
                    </div>
                    <input
                      type="radio"
                      name="payment"
                      value="pickup"
                      checked={selectedMethod === 'pickup'}
                      readOnly
                      className="h-4 w-4 text-[#000C50] accent-[#000C50]"
                    />
                  </div>
                </div>

                {/* GCash Online Payment */}
                <div 
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    selectedMethod === 'gcash' 
                      ? 'border-[#000C50] bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelect('gcash')}
                >
                  <div className="flex items-center gap-3">
                    <DevicePhoneMobileIcon className="h-5 w-5 text-[#000C50]" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">GCash Online</div>
                      <div className="text-sm text-gray-600">Secure online payment</div>
                    </div>
                    <input
                      type="radio"
                      name="payment"
                      value="gcash"
                      checked={selectedMethod === 'gcash'}
                      readOnly
                      className="h-4 w-4 text-[#000C50] accent-[#000C50]"
                    />
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button 
                onClick={handleCheckout}
                disabled={!selectedMethod || processingPayment}
                className={`w-full h-12 py-2 rounded-lg font-medium text-base transition-all duration-200 ${
                  !selectedMethod || processingPayment
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#000C50] text-white hover:bg-gray-800 shadow-sm hover:shadow-md'
                }`}
              >
                {processingPayment ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  'Complete Order'
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
