'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Bars3Icon } from '@heroicons/react/24/outline';
import axios from 'axios';

import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';

export default function OrderHistoryPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState({ name: '', student_id: '', initials: '??' });

  // Decode token to extract user info
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const initials = decoded.name
        ? decoded.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : '??';

      setUser({
        name: decoded.name || '',
        student_id: decoded.student_id || '',
        initials,
      });
    } catch (err) {
      console.error('Invalid token:', err);
    }
  }, []);

  // Fetch user's orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/orders/student', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setOrders(res.data);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* User Info Card */}
        <div className="bg-gray-200 m-6 p-6 rounded-md flex justify-between items-center relative mx-25">
          <div className="flex gap-4 items-center">
            <div className="bg-[#000C50] text-white w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold ml-6">
              {user.initials}
            </div>
            <div>
              <p className="text-lg font-bold">Name: {user.name}</p>
              <p className="text-sm">Student_ID: {user.student_id}</p>
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
                  onClick={() => {
                    localStorage.removeItem('token');
                    router.push('/auth/login');
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Order History */}
        <div className="mx-24 bg-white border rounded-md p-6 shadow-md">
          <h2 className="text-xl font-bold mb-4 ml-5">ORDER HISTORY</h2>
          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 ml-8">
            {orders.length === 0 ? (
              <p className="text-gray-500 ml-5">No orders found.</p>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="flex gap-6 items-start border-b pb-4">
                  {/* Image with alt fallback */}
                  <div className="flex-shrink-0">
                    <Image
                      src="/images/polo.png"
                      alt={order.name || 'Order Image'}
                      width={150}
                      height={150}
                      className="rounded-md"
                    />
                  </div>

                  {/* Order Info */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-l">Order ID: {order.id}</p>
                      <span className="inline-block bg-[#000C50] text-white text-xs px-2 py-1 rounded-full mt-1">
                        STATUS: {order.status?.toUpperCase() || 'PENDING'}
                      </span>
                      <p className="text-sm mt-2">
                        TOTAL: <strong>₱{order.total_amount}</strong>
                      </p>
                      <p className="text-sm">
                        PAYMENT: <strong>{order.payment_method}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Status Message */}
                  <div className="ml-auto max-w-md text-sm text-gray-700 mt-2">
                    {order.status === 'done'
                      ? 'You have successfully claimed your order. We appreciate your support. Thank you for shopping with us!'
                      : 'Your order is still being processed. Please wait for confirmation.'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
