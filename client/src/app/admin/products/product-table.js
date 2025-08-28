'use client';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/solid';
import API from '@/lib/axios';

export default function ProductTable({ category = '' }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const CATEGORY_SHOW_SIZES = new Set(['PE', 'NSTP', 'POLO']);

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

  // Group products by category name
  const groupedByCategory = products.reduce((acc, prod) => {
    const key = (prod.category_name || prod.category || 'Uncategorized').toUpperCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(prod);
    return acc;
  }, {});

  const categoryKeys = Object.keys(groupedByCategory).sort();

  return (
    <div className="space-y-6">
      {categoryKeys.map((cat) => (
        <div key={cat} className="bg-white rounded border border-black overflow-hidden">
          {(() => {
            const items = groupedByCategory[cat];
            const totalItems = items.length;
            const totalStock = items.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
            return (
              <div className="px-4 py-3 border-b border-black bg-gray-50 flex items-center justify-between">
                <div className="font-bold">{cat}</div>
                <div className="text-sm text-gray-600">
                  {totalItems} item{totalItems !== 1 ? 's' : ''} • {totalStock} total stock
                </div>
              </div>
            );
          })()}
          <table className="w-full text-left">
            <thead className="bg-white border-b border-black">
              <tr>
                <th className="px-4 py-2 font-bold">PRODUCT NAME</th>
                <th className="px-4 py-2 font-bold">AMOUNT</th>
                <th className="px-4 py-2 font-bold">STOCK</th>
                <th className="px-4 py-2 font-bold">SIZES</th>
                <th className="px-4 py-2 font-bold">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {groupedByCategory[cat]
                .slice()
                .sort((a, b) => String(a.name).localeCompare(String(b.name)))
                .map((prod) => (
                <tr key={prod.id} className="even:bg-gray-100 align-top">
                  <td className="px-4 py-2">{prod.name}</td>
                  <td className="px-4 py-2">₱{Number(prod.price).toFixed(2)}</td>
                  <td className="px-4 py-2">{prod.stock}</td>
                  <td className="px-4 py-2">
                    {CATEGORY_SHOW_SIZES.has(cat)
                      ? (
                        <div className="space-y-1">
                          {(prod.sizes || []).length === 0 && <span className="text-gray-500">—</span>}
                          {(prod.sizes || []).map((s) => (
                            <div key={`${prod.id}-${s.id || s.size}`} className="text-sm">
                              {s.size}: {s.stock} {s.price && s.price !== prod.price ? `(₱${Number(s.price).toFixed(2)})` : ''}
                            </div>
                          ))}
                        </div>
                      )
                      : <span className="text-gray-500">—</span>
                    }
                  </td>
                  <td className="px-4 py-2 flex items-center gap-2">
                    <button
                      onClick={() => alert(`Edit ${prod.name}`)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(prod.id, prod.name)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {categoryKeys.length === 0 && (
        <div className="bg-white rounded border border-black p-6 text-center">No products found.</div>
      )}
    </div>
  );
}
