'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { PencilSquareIcon, TrashIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { EyeIcon, FunnelIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';
import ActionMenu from '@/components/common/ActionMenu';
import EditProductModal from '@/components/product/EditProductModal';

export default function ProductTable({ category = '' }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const router = useRouter();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (category) {
        params.set('category', category);
      }
      const query = params.toString();
      const url = query ? `/products/detailed?${query}` : '/products/detailed';
      
      try {
        const { data } = await API.get(url);
        let products = (data && data.products) ? data.products : [];
        
        // Since the detailed endpoint doesn't return sizes, fetch individual product details
        // to get the actual sizes data
        const productsWithSizes = await Promise.all(
          products.map(async (product) => {
            try {
              const { data: productDetail } = await API.get(`/products/${product.id}`);
              return {
                ...product,
                sizes: productDetail.sizes || []
              };
            } catch (err) {
              // If individual fetch fails, return product without sizes
              return {
                ...product,
                sizes: []
              };
            }
          })
        );
        
        setProducts(productsWithSizes);
        setError('');
      } catch (errDetailed) {
        // Fallback to simple endpoint
        try {
          const simpleUrl = query ? `/products?${query}` : '/products';
          const { data: simple } = await API.get(simpleUrl);
          const mapped = (simple || []).map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            stock: p.stock,
            category_name: p.category,
            sizes: p.sizes || [] // Use actual sizes if available
          }));
          setProducts(mapped);
          setError('');
        } catch (errSimple) {
          const message = errDetailed?.response?.data?.error || errSimple?.response?.data?.error || 'Failed to load products';
          setError(message);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchProducts();
  }, [category]);

  // Filter and sort products
  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.category_name || product.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !category || product.category_name === category || product.category === category;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'price' || sortField === 'stock') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredAndSortedProducts.slice(startIndex, endIndex);

  // Reset to first page when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);


  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEdit = (productId) => {
    setSelectedProductId(productId);
    setEditModalOpen(true);
  };

  const handleEditSuccess = useCallback(() => {
    // Reset pagination to first page to ensure updated product is visible
    setCurrentPage(1);
    // Refresh the products list to get latest data
    fetchProducts();
    // Show success message
    console.log('Product updated successfully - table refreshed');
  }, [fetchProducts]);

  const handleDelete = (id, name) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete ${name}? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await API.delete(`/products/${id}`);
          await fetchProducts();
          Swal.fire('Deleted!', 'The product has been removed.', 'success');
        } catch (err) {
          Swal.fire('Error', err?.response?.data?.error || 'Failed to delete product', 'error');
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#000C50] mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-500 text-2xl mb-3">⚠️</div>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Table Header with Search and Filters */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FunnelIcon className="h-4 w-4" />
            <span>Total: {filteredAndSortedProducts.length} Records</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th 
                className="px-4 py-3 text-xs font-medium text-gray-900 border-r border-gray-200 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Product Name
                  {sortField === 'name' && (
                    <span className="text-gray-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('category_name')}
              >
                <div className="flex items-center gap-1">
                  Category
                  {sortField === 'category_name' && (
                    <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center gap-1">
                  Price
                  {sortField === 'price' && (
                    <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('stock')}
              >
                <div className="flex items-center gap-1">
                  Base Stock
                  {sortField === 'stock' && (
                    <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Size</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-700 border-r border-gray-200">Stock</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((product, productIndex) => {
              // If product has sizes, create a row for each size
              if (product.sizes && product.sizes.length > 0) {
                return product.sizes.map((size, sizeIndex) => (
                  <tr 
                    key={`${product.id}-${size.size}`} 
                    className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                      (productIndex + sizeIndex) % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 border-r border-gray-100">
                      <div className="text-xs font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-100">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                        {product.category_name || product.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-100">
                      <div className="text-xs font-medium text-gray-900">
                        ₱{Number(product.price).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-100">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        Number(product.stock) === 0 
                          ? 'bg-red-50 text-red-700' 
                          : Number(product.stock) <= 5 
                          ? 'bg-yellow-50 text-yellow-700' 
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-100">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {size.size}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-100">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        Number(size.stock) === 0 
                          ? 'bg-red-50 text-red-700' 
                          : Number(size.stock) <= 5 
                          ? 'bg-yellow-50 text-yellow-700' 
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {size.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ActionMenu
                        actions={[
                          {
                            label: 'Edit Product',
                            icon: PencilSquareIcon,
                            onClick: () => handleEdit(product.id)
                          },
                          {
                            label: 'Delete Product',
                            icon: TrashIcon,
                            onClick: () => handleDelete(product.id, product.name),
                            danger: true
                          }
                        ]}
                      />
                    </td>
                  </tr>
                ));
              } else {
                // If product has no sizes, show base product info
                return (
                  <tr 
                    key={product.id} 
                    className={`hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                      productIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 border-r border-gray-100">
                      <div className="text-xs font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-100">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                        {product.category_name || product.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-100">
                      <div className="text-xs font-medium text-gray-900">
                        ₱{Number(product.price).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-100">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        Number(product.stock) === 0 
                          ? 'bg-red-50 text-red-700' 
                          : Number(product.stock) <= 5 
                          ? 'bg-yellow-50 text-yellow-700' 
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-100">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-500">
                        No sizes
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-100">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        Number(product.stock) === 0 
                          ? 'bg-red-50 text-red-700' 
                          : Number(product.stock) <= 5 
                          ? 'bg-yellow-50 text-yellow-700' 
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {product.stock || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ActionMenu
                        actions={[
                          {
                            label: 'Edit Product',
                            icon: PencilSquareIcon,
                            onClick: () => handleEdit(product.id)
                          },
                          {
                            label: 'Delete Product',
                            icon: TrashIcon,
                            onClick: () => handleDelete(product.id, product.name),
                            danger: true
                          }
                        ]}
                      />
                    </td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>

      {/* Enhanced Pagination */}
      {filteredAndSortedProducts.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Records Info */}
            <div className="text-xs text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedProducts.length)} of {filteredAndSortedProducts.length} products
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || totalPages <= 1}
                className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {/* First page */}
                {currentPage > 3 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      1
                    </button>
                    {currentPage > 4 && <span className="text-xs text-gray-400">...</span>}
                  </>
                )}
                
                {/* Page numbers around current page */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  if (pageNum < 1 || pageNum > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-2 py-1 text-xs border rounded-md transition-colors ${
                        currentPage === pageNum
                          ? 'bg-[#000C50] text-white border-[#000C50]'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                {/* Last page */}
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="text-xs text-gray-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              
              {/* Next Button */}
              <button
                onClick={() => {
                  console.log('Next clicked, currentPage:', currentPage, 'totalPages:', totalPages, 'newPage:', Math.min(totalPages, currentPage + 1));
                  setCurrentPage(Math.min(totalPages, currentPage + 1));
                }}
                disabled={currentPage === totalPages || totalPages <= 1}
                className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedProducts.length === 0 && (
        <div className="p-8 text-center">
          <div className="text-gray-300 text-3xl mb-4">📦</div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 text-xs">
            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first product.'}
          </p>
        </div>
        )}

        {/* Edit Product Modal */}
        <EditProductModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          productId={selectedProductId}
          onSuccess={handleEditSuccess}
        />
      </>
    );
  }
