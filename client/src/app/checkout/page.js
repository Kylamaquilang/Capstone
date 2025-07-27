'use client';

import { useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';
import Swal from 'sweetalert2';
import { BanknotesIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

const CheckoutPage = () => {
  const [selectedMethod, setSelectedMethod] = useState('');

  const handleSelect = (method) => {

    if (method === 'gcash') {
      Swal.fire({
        title: 'Proceed with GCash?',
        text: 'You will be redirected to PayMongo.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#000C50',
        cancelButtonColor: '#aaa',
        confirmButtonText: 'Yes, proceed',
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = 'https://paymongo.link/gcash-payment-link'; // 🔁 Replace with actual URL
        } else {
          setSelectedMethod('');
        }
      });
    } else {
      setSelectedMethod(method);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow px-5 py-8">
        <h2 className="text-center font-bold text-2xl mb-6">CHECKOUT</h2>

        {/* Product Card */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6 w-250 mx-auto">
          <div className="flex gap-6">
            <Image
              src="/images/polo.png"
              alt="BSHM POLO"
              width={180}
              height={180}
              className="rounded"
            />
            <div>
              <h3 className="text-xl font-bold">BSHM POLO</h3>
              <span className="inline-block text-xs bg-[#000C50] text-white px-3 py-1 rounded-full mt-1">POLO</span>
              <p className="mt-4">SIZE : XL</p>
              <p>₱450.00</p>
              <p>QUANTITY: 1</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6 w-250 mx-auto">
          <h3 className="font-bold mb-4">Payment Methods</h3>
          <div className="space-y-4">

            {/* PAY UPON PICK-UP */}
            <div className="flex items-center justify-between cursor-pointer" onClick={() => handleSelect('pickup')}>
              <div className="flex items-center gap-3">
                <BanknotesIcon className="h-6 w-6 text-[#000C50]" />
                <span>PAY UPON PICK-UP</span>
              </div>
              <input
                type="radio"
                name="payment"
                value="pickup"
                checked={selectedMethod === 'pickup'}
                readOnly
                className="h-5 w-5 text-[#000C50] accent-[#000C50] rounded-full"
              />
            </div>

            {/* GCASH */}
            <div className="flex items-center justify-between cursor-pointer" onClick={() => handleSelect('gcash')}>
              <div className="flex items-center gap-3">
                <DevicePhoneMobileIcon className="h-6 w-6 text-[#000C50]" />
                <span>GCASH</span>
              </div>
              <input
                type="radio"
                name="payment"
                value="gcash"
                checked={selectedMethod === 'gcash'}
                readOnly
                className="h-5 w-5 text-[#000C50] accent-[#000C50] rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Total & Checkout */}
        <div className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center w-250 mx-auto">
          <p className="font-bold">Total (1 Item): ₱450.00</p>
          <button className="bg-[#000C50] text-white px-6 py-2 rounded hover:bg-blue-900 w-90">
            CHECK OUT
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
