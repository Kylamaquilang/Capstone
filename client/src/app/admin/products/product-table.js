'use client';
import { useState } from 'react';
import Swal from 'sweetalert2';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/solid';

export default function ProductTable() {
  const [products, setProducts] = useState([
    { name: 'UPPER TELA', amount: '₱450', stock: 120 },
    { name: 'LOWER TELA', amount: '₱450', stock: 120 },
  ]);

  const handleDelete = (index) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        const updatedProducts = [...products];
        updatedProducts.splice(index, 1);
        setProducts(updatedProducts);

        Swal.fire('Deleted!', 'The product has been removed.', 'success');
      }
    });
  };

  return (
    <div className="bg-white rounded border border-black overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-white border-b border-black">
          <tr>
            <th className="px-4 py-2 font-bold">PRODUCT NAME</th>
            <th className="px-4 py-2 font-bold">AMOUNT</th>
            <th className="px-4 py-2 font-bold">STOCK</th>
            <th className="px-4 py-2 font-bold">ACTION</th>
          </tr>
        </thead>
        <tbody>
          {products.map((prod, index) => (
            <tr key={index} className="even:bg-gray-100">
              <td className="px-4 py-2">{prod.name}</td>
              <td className="px-4 py-2">{prod.amount}</td>
              <td className="px-4 py-2">{prod.stock}</td>
              <td className="px-4 py-2 flex items-center gap-2">
                <button
                  onClick={() => alert(`Edit ${prod.name}`)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <PencilSquareIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(index)}
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
  );
}
