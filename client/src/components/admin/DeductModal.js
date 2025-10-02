import { useState, useEffect } from 'react';
import { XMarkIcon, MinusIcon } from '@heroicons/react/24/outline';
import Swal from '@/lib/sweetalert-config';

const DeductModal = ({ isOpen, onClose, product, onDeductSuccess }) => {
  const [formData, setFormData] = useState({
    quantity: '',
    reason: '',
    size: ''
  });
  const [loading, setLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');

  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        quantity: '',
        reason: '',
        size: ''
      });
      setSelectedSize('');
    }
  }, [isOpen, product]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.quantity || formData.quantity <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please enter a valid quantity to deduct'
      });
      return;
    }

    if (!formData.reason) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please select a reason for deduction'
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        product_id: product.id,
        movement_type: 'stock_out',
        quantity: parseInt(formData.quantity),
        reason: formData.reason,
        notes: null,
        size: selectedSize || null
      };

      const response = await fetch('http://localhost:5000/api/stock-movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stock movement API error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Stock deducted successfully'
        });
        
        onDeductSuccess();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to record stock deduction');
      }
    } catch (error) {
      console.error('Deduct error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to deduct stock. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Deduct Stock - {product.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Product Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Product</h3>
            <div className="text-sm">
              <div className="font-medium text-gray-900">{product.name}</div>
              <div className="text-gray-500">Current Stock: {product.stock || 0} units</div>
            </div>
          </div>

          {/* Size Selection */}
          {product.sizes && product.sizes.length > 0 && (
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
                Size
              </label>
              <select
                id="size"
                name="size"
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All sizes (base stock)</option>
                {product.sizes.map((size, index) => (
                  <option key={index} value={size.size}>
                    {size.size} (Current: {size.stock || 0})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity to Deduct */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              Quantity to Deduct
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              min="1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter quantity to deduct"
            />
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason *
            </label>
            <select
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select reason</option>
              <option value="sale">Sold</option>
              <option value="issued">Issued</option>
              <option value="damaged">Damaged</option>
              <option value="expired">Expired</option>
              <option value="sample">Sample/Test</option>
              <option value="waste">Waste</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Confirm Deduct'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeductModal;
