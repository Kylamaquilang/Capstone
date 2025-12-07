'use client';
import { useState, useEffect, useCallback } from 'react';
import API from '@/lib/axios';
import Swal from '@/lib/sweetalert-config';
import { getImageUrl } from '@/utils/imageUtils';
import Modal from '@/components/common/Modal';

export default function EditProductModal({ isOpen, onClose, productId, onSuccess }) {
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [productImages, setProductImages] = useState([]); // Array of {id, url, is_primary}
  const [newImages, setNewImages] = useState([]); // Array of File objects for new images
  const [imagesToDelete, setImagesToDelete] = useState([]); // Array of image IDs to delete

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Validate productId before making the request
      if (!productId) {
        setError('Product ID is required');
        setLoading(false);
        return;
      }
      
      console.log(`🔍 Fetching product data for ID: ${productId}`);
      const { data } = await API.get(`/products/${productId}`);
      
      // Verify the returned product ID matches the requested ID
      if (data.id !== parseInt(productId)) {
        console.error(`⚠️ Product ID mismatch: requested ${productId}, got ${data.id}`);
        setError('Product data mismatch - wrong product returned');
        setLoading(false);
        return;
      }
      
      setProduct(data);
      
      console.log('🔍 Product data received for ID:', productId, {
        id: data.id,
        name: data.name,
        price: data.price,
        sizesCount: data.sizes?.length || 0,
        sizes: data.sizes?.map(s => ({ id: s.id, size: s.size, price: s.price })) || []
      });
      console.log('🔍 Product image path:', data.image);
      
      const imageUrl = data.image ? getImageUrl(data.image) : '';
      console.log('🔍 Generated image URL:', imageUrl);
      
      // Set form values
      setName(data.name || '');
      setPrice(data.price || '');
      setCostPrice(data.original_price || '');
      setStock(data.stock || '');
      setCategoryId(data.category_id || '');
      setDescription(data.description || '');
      setPreviewUrl(imageUrl);
      setIsActive(data.is_active !== undefined ? (data.is_active === 1 || data.is_active === true) : true);
      
      // Load product images (if available)
      if (data.images && Array.isArray(data.images)) {
        setProductImages(data.images);
      } else if (data.image) {
        // Fallback: use single image field as primary image
        setProductImages([{ id: 'primary', url: imageUrl, is_primary: true }]);
      } else {
        setProductImages([]);
      }
      
      // Handle sizes - store full size objects with IDs
      if (data.sizes && data.sizes.length > 0) {
        setSelectedSizes(data.sizes.map(size => ({
          id: size.id,           // Store the unique size ID
          size: size.size,       // Store the size name
          stock: size.stock || 0,
          price: size.price || parseFloat(data.price) || 0
        })));
      } else {
        setSelectedSizes([]);
      }
    } catch (err) {
      setError('Failed to load product');
      console.error('Load product error:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await API.get('/categories');
      setCategories(data || []);
    } catch (err) {
      console.error('Load categories error:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen && productId) {
      // Validate productId before loading
      const parsedId = parseInt(productId);
      if (isNaN(parsedId) || parsedId <= 0) {
        console.error('Invalid product ID:', productId);
        setError('Invalid product ID');
        return;
      }
      console.log(`🔍 Modal opened for product ID: ${productId}`);
      loadProduct();
      loadCategories();
    } else if (isOpen && !productId) {
      console.error('Modal opened but productId is missing');
      setError('Product ID is required');
    }
  }, [isOpen, productId, loadProduct, loadCategories]);

  // Available size options
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  // Handle size selection
  const handleSizeChange = (sizeName) => {
    setSelectedSizes(prev => {
      const isSelected = prev.some(s => (typeof s === 'object' ? s.size : s) === sizeName);
      if (isSelected) {
        // Remove the size
        return prev.filter(s => (typeof s === 'object' ? s.size : s) !== sizeName);
      } else {
        // Add the size (new size without ID, will be created)
        return [...prev, {
          id: null,  // New size, no ID yet
          size: sizeName,
          stock: 0,
          price: parseFloat(price) || 0
        }];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      // Validate required fields
      if (!name.trim()) {
        setError('Please enter a product name');
        setSaving(false);
        return;
      }
      if (!price || Number(price) <= 0) {
        setError('Please enter a valid selling price');
        setSaving(false);
        return;
      }
      // Removed cost price validation - only selling price is required
      // Stock validation removed - stock is auto-managed by inventory

      // Size stock validation removed - stock is auto-managed by inventory

      // Upload new images
      const uploadedImageUrls = [];
      for (const newImageFile of newImages) {
        const formData = new FormData();
        formData.append('image', newImageFile);
        const uploadRes = await API.post('/products/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedImageUrls.push(uploadRes.data.url);
      }

      // Determine primary image (first existing primary, or first new image, or existing image field)
      let finalImageUrl = product?.image || null;
      const primaryImage = productImages.find(img => img.is_primary);
      if (primaryImage && !imagesToDelete.includes(primaryImage.id)) {
        finalImageUrl = primaryImage.url;
      } else if (uploadedImageUrls.length > 0) {
        finalImageUrl = uploadedImageUrls[0];
      } else if (productImages.length > 0 && !imagesToDelete.includes(productImages[0].id)) {
        finalImageUrl = productImages[0].url;
      }

      // Prepare sizes data - include IDs for existing sizes
      // IMPORTANT: Each size is updated individually by its size_id, not by product_id
      // This ensures that when editing a specific size (e.g., XS), only that size is updated
      const sizesData = selectedSizes.map(sizeObj => {
        // Handle both object format (with ID) and string format (legacy)
        const sizeData = typeof sizeObj === 'object' ? sizeObj : { id: null, size: sizeObj, stock: 0, price: null };
        // If size price is not set (null, empty, or 0), use base selling price
        const sizePrice = sizeData.price && sizeData.price !== '' && sizeData.price !== null && parseFloat(sizeData.price) > 0 
          ? parseFloat(sizeData.price) 
          : Number(price);
        return {
          id: sizeData.id || null,  // CRITICAL: Include size ID - this ensures only THIS specific size is updated
          size: sizeData.size,       // Size name
          stock: sizeData.stock || 0,  // Preserve existing stock
          price: sizePrice  // Use size-specific price if set, otherwise use base selling price
        };
      });

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        original_price: Number(costPrice), // Use the actual cost price
        // stock field removed - auto-managed by inventory
        category_id: categoryId ? Number(categoryId) : null,
        image: finalImageUrl, // Keep for backward compatibility
        sizes: sizesData.length > 0 ? sizesData : undefined,
        is_active: isActive,
        // Multiple images support
        images: {
          add: uploadedImageUrls,
          remove: imagesToDelete,
          existing: productImages.filter(img => !imagesToDelete.includes(img.id)).map(img => ({
            id: img.id,
            is_primary: img.is_primary
          }))
        }
      };

      await API.put(`/products/${productId}`, productData);
      
      // Show SweetAlert success message
      await Swal.fire({
        title: 'Success!',
        text: 'Product updated successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#000C50',
        timer: 2000,
        timerProgressBar: true
      });
      
      onSuccess?.();
      onClose();
    } catch (err) {
      // Handle specific error cases gracefully
      if (err?.response?.status === 409) {
        // Duplicate product name - expected error, show user-friendly message
        const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Product name already exists';
        await Swal.fire({
          title: 'Duplicate Product Name',
          text: errorMessage,
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setError(errorMessage);
        setSaving(false);
        return; // Exit early to prevent further execution
      } else if (err?.response?.status === 400) {
        // Validation error - expected error, show user-friendly message
        const errorMessage = err?.response?.data?.error || 'Invalid product data';
        await Swal.fire({
          title: 'Validation Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setError(errorMessage);
        setSaving(false);
        return; // Exit early to prevent further execution
      } else {
        // Unexpected error - log for debugging but show user-friendly message
        console.error('Unexpected error updating product:', err);
        const errorMessage = err?.response?.data?.error || 'Failed to update product. Please try again.';
        await Swal.fire({
          title: 'Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setError('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Product"
      size="xl"
      isLoading={loading}
      closeOnBackdrop={!saving && !loading}
      closeOnEscape={!saving && !loading}
    >
      {error && !product ? (
        <div className="text-center py-8">
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={loadProduct}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-600 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Top Row - Left: Product Info, Right: Product Sizes */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left Column - Product Info */}
                    <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter product name"
                        required
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20 resize-none"
                        placeholder="Enter product description (optional)"
                        disabled={saving}
                      />
                    </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                       <input
                         type="text"
                         value={price}
                         onChange={(e) => setPrice(e.target.value)}
                         className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 cursor-not-allowed"
                         placeholder="Enter selling price"
                         required
                         disabled={true}
                         title="Price field is disabled when editing. Edit individual size prices below."
                       />
                     </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full min-w-0 max-w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        style={{ width: '100%', maxWidth: '100%' }}
                        disabled={saving}
                      >
                        <option value="" disabled>Select category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* Stock Display */}
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                      <div className="text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-700 font-medium">Base Stock:</span>
                          <span className="text-gray-900 font-bold">{stock || 0} (read-only)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">Size Stocks:</span>
                          <span className="text-gray-900 font-bold">Auto-managed (read-only)</span>
                        </div>
                      </div>
                    </div>

                    {/* Product Visibility Toggle */}
                    <div>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={saving}
                        />
                        <div>
                          <span className="block text-sm font-medium text-gray-700">Show on Store</span>
                          <span className="block text-xs text-gray-500">
                            {isActive ? 'Product is visible to customers' : 'Product is hidden from customers'}
                          </span>
                        </div>
                      </label>
                    </div>
                    </div>

                    {/* Right Column - Product Sizes */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sizes</label>
                        <div className="grid grid-cols-3 gap-2">
                          {availableSizes.map((size) => (
                            <label key={size} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedSizes.some(s => (typeof s === 'object' ? s.size : s) === size)}
                                onChange={() => handleSizeChange(size)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                disabled={saving}
                              />
                              <span className="text-sm text-gray-700">{size}</span>
                            </label>
                          ))}
                        </div>
                        {selectedSizes.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Selected sizes: {selectedSizes.map(s => typeof s === 'object' ? s.size : s).join(', ')}
                          </p>
                        )}
                      </div>

                      {/* Size Prices Section */}
                      {selectedSizes.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Size Prices (Optional - defaults to selling price if not set)
                          </label>
                          <div className="space-y-2 border border-gray-200 rounded-md p-3 bg-gray-50">
                            {selectedSizes.map((sizeObj, index) => {
                              const sizeData = typeof sizeObj === 'object' ? sizeObj : { id: null, size: sizeObj, stock: 0, price: null };
                              // Only show price if it's explicitly set for this size, otherwise show empty (will use base price)
                              const displayPrice = sizeData.price && sizeData.price !== '' && sizeData.price !== null ? sizeData.price : '';
                              return (
                                <div key={index} className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-gray-700 w-16">
                                    {sizeData.size}:
                                  </span>
                                  <input
                                    type="text"
                                    value={displayPrice}
                                    onChange={(e) => {
                                      const newPrice = e.target.value;
                                      setSelectedSizes(prev => 
                                        prev.map(s => {
                                          const sData = typeof s === 'object' ? s : { id: null, size: s, stock: 0, price: null };
                                          if (sData.size === sizeData.size) {
                                            return { ...sData, price: newPrice === '' ? null : newPrice };
                                          }
                                          return s;
                                        })
                                      );
                                    }}
                                    onBlur={async (e) => {
                                      // Only update if this is an existing size (has an ID) and the price changed
                                      if (!sizeData.id) {
                                        // New size, will be saved on form submit
                                        return;
                                      }
                                      
                                      const newPrice = e.target.value.trim();
                                      const oldPrice = sizeData.price;
                                      
                                      // Parse prices for comparison
                                      const parsedNewPrice = newPrice === '' ? null : parseFloat(newPrice);
                                      const parsedOldPrice = oldPrice === null || oldPrice === '' ? null : parseFloat(oldPrice);
                                      
                                      // Only update if price actually changed
                                      if (parsedNewPrice === parsedOldPrice) {
                                        return;
                                      }
                                      
                                      // Validate price if provided
                                      if (newPrice !== '' && (isNaN(parsedNewPrice) || parsedNewPrice < 0)) {
                                        Swal.fire({
                                          title: 'Invalid Price',
                                          text: 'Please enter a valid price (0 or greater)',
                                          icon: 'error',
                                          confirmButtonColor: '#000C50',
                                          timer: 2000
                                        });
                                        // Revert to old price
                                        setSelectedSizes(prev => 
                                          prev.map(s => {
                                            const sData = typeof s === 'object' ? s : { id: null, size: s, stock: 0, price: null };
                                            if (sData.size === sizeData.size) {
                                              return { ...sData, price: oldPrice };
                                            }
                                            return s;
                                          })
                                        );
                                        return;
                                      }
                                      
                                      try {
                                        console.log(`🔍 Updating size ${sizeData.size} (ID: ${sizeData.id}) price from ${oldPrice} to ${newPrice}`);
                                        
                                        // Call the specific size update endpoint
                                        const priceToSend = newPrice === '' ? null : parsedNewPrice;
                                        await API.put(`/products/sizes/${sizeData.id}`, { price: priceToSend });
                                        
                                        // Update local state to reflect the change
                                        setSelectedSizes(prev => 
                                          prev.map(s => {
                                            const sData = typeof s === 'object' ? s : { id: null, size: s, stock: 0, price: null };
                                            if (sData.id === sizeData.id) {
                                              return { ...sData, price: priceToSend };
                                            }
                                            return s;
                                          })
                                        );
                                        
                                        Swal.fire({
                                          title: 'Success!',
                                          text: `Price for size ${sizeData.size} updated successfully`,
                                          icon: 'success',
                                          confirmButtonColor: '#000C50',
                                          timer: 2000,
                                          showConfirmButton: false
                                        });
                                        
                                        // Trigger success callback to refresh product list
                                        // This will refresh the table to show the updated price
                                        onSuccess?.();
                                        
                                        // Also refresh the product data in the modal to show updated price
                                        loadProduct();
                                      } catch (err) {
                                        console.error('Error updating size price:', err);
                                        const errorMessage = err?.response?.data?.error || 'Failed to update size price';
                                        
                                        Swal.fire({
                                          title: 'Error',
                                          text: errorMessage,
                                          icon: 'error',
                                          confirmButtonColor: '#000C50'
                                        });
                                        
                                        // Revert to old price on error
                                        setSelectedSizes(prev => 
                                          prev.map(s => {
                                            const sData = typeof s === 'object' ? s : { id: null, size: s, stock: 0, price: null };
                                            if (sData.size === sizeData.size) {
                                              return { ...sData, price: oldPrice };
                                            }
                                            return s;
                                          })
                                        );
                                      }
                                    }}
                                    className="flex-1 border border-gray-300 px-2 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={`Default: ₱${price || '0.00'}`}
                                    disabled={saving}
                                  />
                                  <span className="text-xs text-gray-500">₱</span>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Leave empty to use the base selling price ({price ? `₱${price}` : 'set above'}) for this size.
                          </p>
                        </div>
                      )}

                      {/* Multiple Images Section */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Product Images</label>
                        
                        {/* Existing Images */}
                        {productImages.filter(img => !imagesToDelete.includes(img.id)).length > 0 && (
                          <div className="mb-4 space-y-2">
                            <p className="text-xs text-gray-600 mb-2">Current Images:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {productImages
                                .filter(img => !imagesToDelete.includes(img.id))
                                .map((img, idx) => (
                                  <div key={img.id || idx} className="relative group">
                                    <img 
                                      src={img.url} 
                                      alt={`Product image ${idx + 1}`}
                                      className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                                    />
                                    {img.is_primary && (
                                      <span className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
                                        Primary
                                      </span>
                                    )}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Set as primary
                                          setProductImages(prev => prev.map(i => ({
                                            ...i,
                                            is_primary: i.id === img.id
                                          })));
                                        }}
                                        className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700"
                                        disabled={saving}
                                      >
                                        Set Primary
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (img.id !== 'primary') {
                                            setImagesToDelete(prev => [...prev, img.id]);
                                          }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700"
                                        disabled={saving}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* New Images Preview */}
                        {newImages.length > 0 && (
                          <div className="mb-4 space-y-2">
                            <p className="text-xs text-gray-600 mb-2">New Images to Add:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {newImages.map((imgFile, idx) => (
                                <div key={idx} className="relative">
                                  <img 
                                    src={URL.createObjectURL(imgFile)} 
                                    alt={`New image ${idx + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border-2 border-green-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewImages(prev => prev.filter((_, i) => i !== idx));
                                    }}
                                    className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded hover:bg-red-700"
                                    disabled={saving}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add Image Button */}
                        <div className="mb-4">
                          <input
                            id="product-images-input"
                            type="file"
                            accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg"
                            className="hidden"
                            multiple={true}
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setNewImages(prev => [...prev, ...files]);
                              // Reset input
                              e.target.value = '';
                            }}
                          />
                        </div>

                        {/* Drag & Drop Area */}
                        <div
                          className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${
                            dragActive 
                              ? 'border-[#000C50] bg-blue-50 border-solid' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                          onDragLeave={() => setDragActive(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragActive(false);
                            const files = Array.from(e.dataTransfer.files || []);
                            setNewImages(prev => [...prev, ...files]);
                          }}
                          onClick={() => document.getElementById('product-images-input')?.click()}
                        >
                          <div className="space-y-2">
                            <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div>
                              <p className="text-xs text-gray-900">Add images</p>
                              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                              <p className="text-xs text-gray-500 mt-1">You can add multiple images</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Modal Footer */}
                <div className="mt-4 flex space-x-4">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    {saving ? 'Updating...' : 'Update Product'}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
      )}
    </Modal>
  );
}
