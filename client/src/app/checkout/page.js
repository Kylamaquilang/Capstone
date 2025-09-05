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
        const orderResponse = await API.post('/checkout', {
          payment_method: 'gcash',
          pay_at_counter: false
        });

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
        const response = await API.post('/checkout', {
          payment_method: 'cash',
          pay_at_counter: true
        });

        Swal.fire({
          icon: 'success',
          title: 'Order Placed Successfully!',
          text: `Order #${response.data.orderId} has been created. Please pay ${totalAmount.toFixed(2)} upon pickup.`,
          confirmButtonColor: '#000C50',
        }).then(() => {
          router.push('/user-profile');
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
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow px-5 py-8 pt-5">
        <h2 className="text-center font-bold text-2xl mb-6">CHECKOUT</h2>

        {/* Cart Items */}
        <div className="bg-white p-8 rounded-lg shadow-lg mb-6 max-w-4xl mx-auto">
          <h3 className="font-bold mb-6 text-lg">Order Summary</h3>
          <div className="space-y-6">
            {cartItems.map((item) => (
              <div key={item.id} className="flex gap-6 border-b pb-6">
                <Image
                  src={item.product_image || '/images/polo.png'}
                  alt={item.product_name}
                  width={100}
                  height={100}
                  className="rounded object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{item.product_name}</h4>
                  <p className="text-sm text-gray-600 mt-1">Size: {item.size || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  <p className="font-medium text-lg mt-2">{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-8 rounded-lg shadow-lg mb-6 max-w-4xl mx-auto">
          <h3 className="font-bold mb-6 text-lg">Payment Methods</h3>
          <div className="space-y-6">

            {/* PAY AT COUNTER */}
            <div 
              className={`flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 transition-colors ${
                selectedMethod === 'pickup' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleSelect('pickup')}
            >
              <div className="flex items-center gap-4">
                <BanknotesIcon className="h-6 w-6 text-[#000C50]" />
                <div>
                  <div className="font-semibold text-lg">Pay at Counter</div>
                  <div className="text-sm text-gray-600">Pay with cash when you pick up your order</div>
                </div>
              </div>
              <input
                type="radio"
                name="payment"
                value="pickup"
                checked={selectedMethod === 'pickup'}
                readOnly
                className="h-5 w-5 text-[#000C50] accent-[#000C50] rounded-full"
              />
            </div>

            {/* GCASH ONLINE PAYMENT */}
            <div 
              className={`flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 transition-colors ${
                selectedMethod === 'gcash' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleSelect('gcash')}
            >
              <div className="flex items-center gap-4">
                <DevicePhoneMobileIcon className="h-6 w-6 text-[#000C50]" />
                <div>
                  <div className="font-semibold text-lg">GCash Online Payment</div>
                  <div className="text-sm text-gray-600">Secure online payment via GCash</div>
                </div>
              </div>
              <input
                type="radio"
                name="payment"
                value="gcash"
                checked={selectedMethod === 'gcash'}
                readOnly
                className="h-5 w-5 text-[#000C50] accent-[#000C50] rounded-full"
              />
            </div>
          </div>
        </div>
      

                          {/* Total & Checkout */}
         <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
           <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
               <span className="text-lg font-medium">Total ({cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}):</span>
               <span className="text-lg font-bold text-[#000C50]">{totalAmount.toFixed(2)}</span>
             </div>
             <button 
               onClick={handleCheckout}
               disabled={!selectedMethod || processingPayment}
               className={`flex items-center justify-center py-3 px-8 rounded-lg text-sm transition-colors ${
                 !selectedMethod || processingPayment
                   ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                   : 'bg-[#000C50] text-white hover:bg-blue-900'
               }`}
             >
               {processingPayment ? (
                 <div className="flex items-center justify-center">
                   <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                   Processing...
                 </div>
               ) : (
                 'CHECKOUT'
               )}
             </button>
           </div>
         </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
