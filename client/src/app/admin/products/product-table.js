'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/solid';
import { EyeIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';
import ActionMenu from '@/components/common/ActionMenu';

export default function ProductTable({ category = '' }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category) {
        params.set('category', category);
      }
      const query = params.toString();
      const url = query ? `/products/detailed?${query}` : '/products/detailed';
      try {
        const { data } = await API.get(url);
        setProducts((data && data.products) ? data.products : []);
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
            sizes: []
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
  };

  useEffect(() => {
    fetchProducts();
  }, [category]);

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
      <div className="bg-white rounded border border-black p-6 text-center">Loading products...</div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded border border-black p-6 text-center text-red-600">{error}</div>
    );
  }

  // Sort products by name for consistent display
  const sortedProducts = products
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  // Create table rows - since sizes are not stored in database, show one row per product
  const tableRows = [];
  sortedProducts.forEach((prod) => {
    tableRows.push({
      id: `product-${prod.id}`,
      productId: prod.id,
      productName: prod.name,
      category: prod.category_name || prod.category || 'Uncategorized',
      amount: prod.price,
      baseStock: prod.stock,
      size: 'N/A', // No sizes available in current database structure
      sizeStock: 'N/A',
      sizePrice: 'N/A',
      isFirstSize: true,
      totalSizes: 0
    });
  });

  return (
    <div className="bg-white border-gray-600 overflow-hidden rounded-md">
      <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-300 text-[000C50] sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-400">Product Name</th>
              <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-400">Category</th>
              <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-400">Price</th>
              <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-400">Base Stock</th>
              <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-400">Size</th>
              <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider border-r border-gray-400">Stock</th>
              <th className="px-6 py-4 font-medium text-sm uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, index) => (
              <tr key={row.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors border-b border-gray-200`}>
                <td className="px-6 py-4 border-r border-gray-200">
                  <div className="text-sm font-medium text-gray-900">{row.productName}</div>
                </td>
                <td className="px-6 py-4 border-r border-gray-200">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {row.category}
                  </span>
                </td>
                <td className="px-6 py-4 border-r border-gray-200">
                  <div className="text-sm font-medium text-gray-900">
                    ₱{Number(row.amount).toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 border-r border-gray-200">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                    Number(row.baseStock) === 0 
                      ? 'bg-red-100 text-red-800' 
                      : Number(row.baseStock) <= 5 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {row.baseStock}
                  </span>
                </td>
                <td className="px-6 py-4 border-r border-gray-200">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {row.size}
                  </span>
                </td>
                <td className="px-6 py-4 border-r border-gray-200">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {row.sizeStock}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <ActionMenu
                    actions={[
                      {
                        label: 'Edit Product',
                        icon: PencilSquareIcon,
                        onClick: () => router.push(`/admin/products/edit/${row.productId}`)
                      },
                      {
                        label: 'Delete Product',
                        icon: TrashIcon,
                        onClick: () => handleDelete(row.productId, row.productName),
                        danger: true
                      }
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tableRows.length === 0 && (
        <div className="p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">Get started by adding your first product.</p>
        </div>
      )}
    </div>
  );
}
