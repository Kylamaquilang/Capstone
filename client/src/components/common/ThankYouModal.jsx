'use client';
import { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';

export default function ThankYouModal({ isOpen, onClose, orderId }) {
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/orders/user/${orderId}`);
      setOrderDetails(response.data);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-200 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <h2 className="text-xl font-medium text-gray-900">Thank You!</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading order details...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={handleClose}
                  className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : orderDetails ? (
              <div className="space-y-6">
                {/* Thank You Message */}
                <div className="text-center">
                  <div className="text-green-500 text-6xl mb-4">🎉</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Order Placed Successfully!
                  </h3>
                  <p className="text-gray-600 text-lg">
                    Thank you for your order. Your order has been placed and will be processed shortly.
                  </p>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h4>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Order Number</p>
                      <p className="font-semibold text-gray-900">#{orderDetails.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-semibold text-gray-900 capitalize">{orderDetails.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="font-semibold text-gray-900">₱{Number(orderDetails.total_amount).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Payment Method</p>
                      <p className="font-semibold text-gray-900 capitalize">{orderDetails.payment_method}</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  {orderDetails.items && orderDetails.items.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Items Ordered:</h5>
                      <div className="space-y-2">
                        {orderDetails.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">
                              {item.quantity}x {item.product_name}
                            </span>
                            <span className="font-medium text-gray-900">
                              ₱{Number(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h5 className="text-sm font-medium text-blue-800">What's Next?</h5>
                      <p className="text-sm text-blue-700 mt-1">
                        {orderDetails.payment_method === 'gcash' && orderDetails.payment_status === 'unpaid' 
                          ? "Please proceed to the counter to complete your GCash payment. Your order will be processed after payment confirmation."
                          : orderDetails.payment_method === 'cash' && orderDetails.pay_at_counter
                          ? "Please proceed to the counter to pay for your order. Your order will be processed after payment confirmation."
                          : "Your order is being processed. You'll receive an email notification when it's ready for pickup at the accounting office."
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="text-center">
                  <button
                    onClick={handleClose}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
