'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Bars3Icon } from '@heroicons/react/24/outline';

import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';

export default function OrderHistoryPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const orders = [
    {
      id: 1,
      name: 'BSHM POLO',
      size: 'XL',
      price: '₱450.00',
      quantity: 1,
      img: '/images/polo.png',
      statusMessage:
        'You have successfully claimed your order. We appreciate your support, Thank you for shopping with us!'
    },
    {
      id: 2,
      name: 'BSHM POLO',
      size: 'XL',
      price: '₱450.00',
      quantity: 1,
      img: '/images/polo.png',
      statusMessage:
        'You have successfully claimed your order. We appreciate your support, Thank you for shopping with us!'
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* User Info Card */}
        <div className="bg-gray-200 m-6 p-6 rounded-md flex justify-between items-center relative mx-25">
          <div className="flex gap-4 items-center">
            <div className="bg-[#000C50] text-white w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold ml-6">
              MC
            </div>
            <div>
              <p className="text-lg font-bold">Name: Marjorie A. Casul</p>
              <p className="text-sm">Student_ID: 20222005</p>
            </div>
          </div>

          {/* Hamburger Button */}
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}>
              <Bars3Icon className="h-8 w-8 text-gray-700" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow z-10">
                <button
                  onClick={() => router.push('/change-password')}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Change Password
                </button>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Order History List */}
        <div className="mx-24 bg-white border rounded-md p-6 shadow-md">
          <h2 className="text-xl font-bold mb-4 ml-5">ORDER HISTORY</h2>
          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 ml-8">
            {orders.map((order) => (
              <div key={order.id} className="flex gap-6 items-start border-b pb-4">
                <div className="flex-shrink-0">
                  <Image
                    src={order.img}
                    alt={order.name}
                    width={150}
                    height={150}
                    className="rounded-md"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-l">{order.name}</p>
                    <span className="inline-block bg-[#000C50] text-white text-xs px-2 py-1 rounded-full mt-1">
                      POLO
                    </span>
                    <p className="text-sm mt-2">SIZE: <strong>{order.size}</strong></p>
                    <p className="text-sm">QUANTITY: <strong>{order.quantity}</strong></p>
                    <p className="text-sm">PRICE: <strong>{order.price}</strong></p>
                  </div>
                </div>
                <div className="ml-auto max-w-md text-sm text-gray-700 mt-2">
                  {order.statusMessage}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
