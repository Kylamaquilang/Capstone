'use client';
import Image from 'next/image';
import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';

import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';

const notifications = [
  {
    id: 1,
    message: 'Your order #1234 has been confirmed.',
    date: 'June 25, 2025',
    name: 'BSIT POLO',
    image: '/images/polo.png',
    size: 'M',
    quantity: 2,
    price: 450,
    status: 'confirmed',
  },
  {
    id: 2,
    message: 'Your IT Polo is out for delivery.',
    date: 'June 24, 2025',
    name: 'IT POLO',
    image: '/images/polo.png',
    size: 'L',
    quantity: 1,
    price: 450,
    status: 'out-for-delivery',
  },
  {
    id: 3,
    message: 'Order #1233 has been delivered successfully.',
    date: 'June 23, 2025',
    name: 'PE Pants',
    image: '/images/pe-pants.png',
    size: 'L',
    quantity: 1,
    price: 400,
    status: 'delivered',
  },
];

export default function NotificationPage() {
  const [selectedNotification, setSelectedNotification] = useState(null);

  const getActionLabel = (status) => {
    switch (status) {
      case 'confirmed':
        return 'Cancel Order';
      case 'out-for-delivery':
        return 'Mark as Received';
      case 'delivered':
        return 'Claim Order';
      default:
        return 'Action';
    }
  };

  const openModal = (notif) => setSelectedNotification(notif);
  const closeModal = () => setSelectedNotification(null);

  const handleAction = () => {
    const { name, status } = selectedNotification;

    let title = '';
    let text = '';

    if (status === 'confirmed') {
      title = 'Order Cancelled';
      text = `Your order for ${name} has been cancelled.`;
    } else if (status === 'out-for-delivery') {
      title = 'Item Received';
      text = `You have successfully marked ${name} as received.`;
    } else if (status === 'delivered') {
      title = 'Claim Successful';
      text = `You have successfully claimed ${name}.`;
    }

    Swal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonColor: '#000C50',
      confirmButtonText: 'OK',
    }).then(() => {
      closeModal();
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-grow px-6 py-10">
        <h2 className="text-3xl font-bold mb-6 text-[#000C50] ml-140">Notifications</h2>
        <div className="space-y-4">
          {notifications.map((note) => (
            <div
              key={note.id}
              className="flex justify-between items-start p-6 rounded-lg shadow-lg w-200 h-45 mx-auto"
            >
              <div className="flex gap-4">
                <Image src={note.image} alt={note.name} width={130} height={70} className="rounded" />
                <div>
                  <p className="text-s font-semibold mt-5">{note.message}</p>
                  <p className="text-sm text-gray-600">
                    {note.name} - Size: {note.size}, Qty: {note.quantity}
                  </p>
                  <p className="text-sm font-semibold text-[#000C50]">₱{note.price * note.quantity}.00</p>
                  <span className="text-xs text-gray-500">{note.date}</span>
                </div>
              </div>
              <div className="mt-2">
                <button
                  onClick={() => openModal(note)}
                  className="bg-[#000C50] text-white px-3 py-1 text-xs rounded hover:bg-blue-900 mt-11 mr-5 h-8"
                >
                  {getActionLabel(note.status)}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[350px] md:w-[400px] h-[400px] shadow-xl relative">
            <button className="absolute top-2 right-2" onClick={closeModal}>
              <XMarkIcon className="h-5 w-5 text-gray-500 hover:text-red-500" />
            </button>
            <h3 className="text-xl font-bold mb-4 text-[#000C50]">
              {getActionLabel(selectedNotification.status)}
            </h3>
            <div className="flex gap-2">
              <Image
                src={selectedNotification.image}
                alt="Product"
                width={200}
                height={180}
                className="rounded"
              />
              <div>
                <p className="font-bold mt-10">{selectedNotification.name}</p>
                <p className="text-sm">Size: {selectedNotification.size}</p>
                <p className="text-sm">Quantity: {selectedNotification.quantity}</p>
                <p className="text-sm font-semibold text-[#000C50]">
                  ₱{selectedNotification.price * selectedNotification.quantity}.00
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-9">
              <button
                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400 w-30"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                className="bg-[#000C50] text-white px-4 py-2 rounded hover:bg-blue-900 mr-4 w-40"
                onClick={handleAction}
              >
                {getActionLabel(selectedNotification.status)}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
