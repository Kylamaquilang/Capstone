'use client';
import Footer from '@/components/common/footer'; // ✅ Footer component
import Navbar from '@/components/common/nav-bar'; // ✅ Navbar component
import { XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useState } from 'react';

const initialCartItems = [
  {
    id: 1,
    name: 'CPC PE Shirt',
    price: 250,
    quantity: 1,
    image: '/images/pe-shirt.jpg',
  },
  {
    id: 2,
    name: 'CPC Uniform Polo',
    price: 450,
    quantity: 1,
    image: '/images/uniform-polo.jpg',
  },
];

export default function CartPage() {
  const [cartItems, setCartItems] = useState(initialCartItems);

  const removeFromCart = (id) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id, quantity) => {
    setCartItems(
      cartItems.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const total = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ✅ Navbar at the top */}
      <Navbar />

      {/* Main content */}
      <main className="flex-grow p-6">
        <h1 className="text-2xl font-bold mb-4">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <p className="text-gray-500">Your cart is empty</p>
        ) : (
          <div className="bg-white shadow-md rounded-lg p-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center border-b py-4 last:border-b-0"
              >
                <Image
                  src={item.image}
                  alt={item.name}
                  width={80}
                  height={80}
                  className="rounded-md"
                />
                <div className="flex-1 ml-4">
                  <h2 className="font-semibold">{item.name}</h2>
                  <p className="text-gray-600">₱{item.price}</p>
                  <div className="flex items-center mt-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity - 1)
                      }
                      className="px-2 py-1 bg-gray-200 rounded"
                    >
                      -
                    </button>
                    <span className="px-4">{item.quantity}</span>
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity + 1)
                      }
                      className="px-2 py-1 bg-gray-200 rounded"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold">
                    ₱{item.price * item.quantity}
                  </p>
                  <button onClick={() => removeFromCart(item.id)}>
                    <XMarkIcon className="h-6 w-6 text-red-500" />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-between mt-4 font-bold text-lg">
              <span>Total</span>
              <span>₱{total}</span>
            </div>

            <button className="mt-4 w-full bg-[#000C50] text-white py-2 rounded-lg hover:bg-[#001b80]">
              Checkout
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
