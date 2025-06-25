'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // ✅ Add this

export default function ResetPasswordPage() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const router = useRouter(); // ✅ Initialize router

  return (
    <div
      className="flex justify-center items-center min-h-screen text-black"
      style={{ backgroundColor: '#000C50' }}
    >
      <div className="bg-white w-full max-w-4xl h-[520px] rounded-xl shadow-lg flex overflow-hidden">
        {/* Left Side - Form */}
        <div
          className="w-1/2 p-10 border-r-4 flex flex-col justify-between"
          style={{ borderColor: '#000C50' }}
        >
          <h2 className="text-2xl font-bold text-black ml-19 mb-8">Reset Password</h2>
          <form className="space-y-6">
            <input
              type="number"
              placeholder="Student ID"
              className="w-full border-b border-black focus:outline-none text-sm placeholder-black"
              inputMode="numeric"
            />
            <input
              type="text"
              placeholder="Last Name"
              className="w-full border-b border-[#000C50] focus:outline-none text-sm placeholder-black"
            />
            <input
              type="text"
              placeholder="First Name"
              className="w-full border-b border-black focus:outline-none text-sm placeholder-black"
            />
            <input
              type="text"
              placeholder="Email"
              className="w-full border-b border-black focus:outline-none text-sm placeholder-black"
            />

            <button
              type="button" // ✅ important
              onClick={() => router.push('/login')} // ✅ redirect
              className="w-full bg-[#000C50] text-white py-2 rounded-md font-semibold"
            >
              Save Password
            </button>

            <button
              type="button"
              onClick={() => router.push('/login')} // Optional: cancel goes back too
              className="w-full border border-[#000C50] text-[#000C50] py-2 rounded-md font-semibold mb-10"
            >
              Cancel
            </button>
          </form>
        </div>

        {/* Right Side - Welcome */}
        <div className="w-1/2 bg-white relative flex flex-col items-end text-right mb-10 p-10 border-l mt-1">
          <Image
            src="/images/cpc.png"
            alt="Logo"
            width={90}
            height={90}
            className="mb-6"
          />
          <h2 className="text-3xl font-bold text-black mt-14 mr-6">Welcome to<br />CPC Essen!</h2>
          <p className="text-xs font-semibold text-gray-600 absolute bottom-4 right-8">ESSEN © 2024</p>
        </div>
      </div>
    </div>
  );
}
