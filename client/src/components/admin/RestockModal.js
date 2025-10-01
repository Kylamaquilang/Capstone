import { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import Swal from '@/lib/sweetalert-config';

const RestockModal = ({ isOpen, onClose, product, onRestockSuccess }) => {
  const [formData, setFormData] = useState({
    movement_type: 'stock_in',
    quantity: '',
    reason: '',
    supplier: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        movement_type: 'stock_in',
        quantity: '',
        reason: '',
        supplier: '',
        notes: ''
      });
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
        icon: 'warning',
        title: 'Invalid Quantity',
        text: 'Please enter a valid quantity greater than 0.'
      });
      return;
    }

    if (!formData.reason.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Reason Required',
        text: 'Please provide a reason for this stock movement.'
      });
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/stock-movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          product_id: product.id,
          movement_type: formData.movement_type,
          quantity: parseInt(formData.quantity),
          reason: formData.reason.trim(),
          supplier: formData.supplier.trim() || null,
          notes: formData.notes.trim() || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Stock Movement Recorded',
          text: `Successfully recorded ${formData.movement_type === 'stock_in' ? 'stock in' : 'stock out'} of ${formData.quantity} units.`
        });
        
        onRestockSuccess();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to record stock movement');
      }
    } catch (error) {
      console.error('Restock error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to record stock movement. Please try again.'
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
            Stock Movement - {product.name}
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
          {/* Current Stock Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Current Stock</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Base Stock:</span>
                <span className="ml-2 font-medium">{product.stock || 0} units</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  (product.stock || 0) === 0 
                    ? 'bg-red-100 text-red-800' 
                    : (product.stock || 0) <= 5
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {(product.stock || 0) === 0 ? 'Out of Stock' : (product.stock || 0) <= 5 ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
            </div>
          </div>

          {/* Movement Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Movement Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="relative">
                <input
                  type="radio"
                  name="movement_type"
                  value="stock_in"
                  checked={formData.movement_type === 'stock_in'}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <div className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.movement_type === 'stock_in'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center justify-center space-x-2">
                    <PlusIcon className="h-5 w-5" />
                    <span className="font-medium">Stock In</span>
                  </div>
                </div>
              </label>
              <label className="relative">
                <input
                  type="radio"
                  name="movement_type"
                  value="stock_out"
                  checked={formData.movement_type === 'stock_out'}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <div className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.movement_type === 'stock_out'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center justify-center space-x-2">
                    <MinusIcon className="h-5 w-5" />
                    <span className="font-medium">Stock Out</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
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
              placeholder="Enter quantity"
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
              <option value="restock">Restock from supplier</option>
              <option value="return">Return from customer</option>
              <option value="adjustment">Inventory adjustment</option>
              <option value="damage">Damaged goods</option>
              <option value="theft">Theft/Loss</option>
              <option value="sale">Sale to customer</option>
              <option value="transfer">Transfer to other location</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Supplier (for stock in) */}
          {formData.movement_type === 'stock_in' && (
            <div>
              <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-2">
                Supplier
              </label>
              <input
                type="text"
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter supplier name (optional)"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes (optional)"
            />
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
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Recording...' : 'Record Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestockModal;
