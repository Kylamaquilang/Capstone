'use client';
import { useState } from 'react';
import Image from 'next/image';
import {
  MagnifyingGlassIcon,
  BellIcon,
  ShoppingCartIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const initialCartItems = [
  {
    id: 1,
    name: 'BSIT POLO',
    size: 'M',
    quantity: 2,
    price: 450,
    image: '/images/polo.png',
  },
  {
    id: 2,
    name: 'PE Pants',
    size: 'L',
    quantity: 1,
    price: 400,
    image: '/images/pe-pants.png',
  },
];

export default function CartPage() {
  const [cartItems, setCartItems] = useState(initialCartItems);
  const [selectedItems, setSelectedItems] = useState([]);

  const handleRemove = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedItems((prev) => prev.filter((itemId) => itemId !== id));
  };

  const toggleSelect = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map((item) => item.id));
    }
  };

  const total = cartItems
    .filter((item) => selectedItems.includes(item.id))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-[#000C50] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/images/cpc.png" alt="Logo" width={40} height={40} />
        </div>
        <div className="flex justify-center items-center">
          <Image src="/images/logo1.png" alt="Logo" width={100} height={100} />
        </div>
        <div className="flex gap-4 items-center">
          <button><MagnifyingGlassIcon className="h-6 w-6 text-white" /></button>
          <button><BellIcon className="h-6 w-6 text-white" /></button>
          <button><ShoppingCartIcon className="h-6 w-6 text-white" /></button>
          <button><UserCircleIcon className="h-6 w-6 text-white" /></button>
        </div>
      </nav>

      {/* Cart Content */}
      <div className="px-6 py-10 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 ml-90 text-[#000C50]">MY CART</h2>

        {cartItems.length === 0 ? (
          <p className="text-center text-gray-600">Your cart is empty.</p>
        ) : (
          <div className="space-y-6">
            {cartItems.map((item) => (
              <div key={item.id} className="relative bg-white rounded-lg shadow-lg p-6 flex items-center gap-6 border border-gray-200">
                {/* Delete Button */}
                <button
                  onClick={() => handleRemove(item.id)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>

                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  className="w-5 h-5 mt-1"
                />

                {/* Product Info */}
                <Image src={item.image} alt={item.name} width={100} height={100} className="rounded-md" />
                <div className="flex-1">
                  <h3 className="font-bold text-xl">{item.name}</h3>
                  <p className="text-sm text-gray-600">Size: {item.size}</p>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  <p className="text-md font-bold text-[#000C50] mt-2">₱{item.price * item.quantity}.00</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {cartItems.length > 0 && (
          <>
            <div className="mt-10 border-t pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 border rounded font-medium text-sm hover:bg-gray-100"
                >
                  {selectedItems.length === cartItems.length ? 'Unselect All' : 'Select All'}
                </button>
                <p className="text-lg font-bold text-[#000C50]">
                  Total: ₱{total}.00
                </p>
              </div>

              <button
                disabled={selectedItems.length === 0}
                className={`w-full sm:w-auto py-3 px-6 font-bold rounded text-white transition ${
                  selectedItems.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#000C50] hover:bg-blue-900'
                }`}
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
