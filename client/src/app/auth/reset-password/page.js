'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // ✅ Don't forget this!

export default function ResetPasswordPage() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const router = useRouter(); // ✅ now this won't throw

  return (
    <div className="flex justify-center items-center min-h-screen text-black" style={{ backgroundColor: '#000C50' }}>
      <div className="bg-white w-full max-w-4xl h-[520px] rounded-xl shadow-lg flex overflow-hidden">
        {/* Left Section */}
        <div className="w-1/2 p-10 border-r-4" style={{ borderColor: '#000C50' }}>
          <h2 className="text-2xl font-bold mb-6">Reset Password</h2>
          <form className="space-y-6">
            <input type="text" placeholder="Student ID" className="w-full border-b border-black p-2" />
            <input type="text" placeholder="Last Name" className="w-full border-b border-black p-2" />
            <input type="text" placeholder="First Name" className="w-full border-b border-black p-2" />
            <input type="email" placeholder="Email" className="w-full border-b border-black p-2" />
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="w-full bg-[#000C50] text-white py-2 rounded"
            >
              Save Password
            </button>
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              className="w-full border border-[#000C50] text-[#000C50] py-2 rounded"
            >
              Cancel
            </button>
          </form>
        </div>

        {/* Right Section */}
        <div className="w-1/2 flex flex-col items-end text-right p-10 border-l">
          <Image src="/images/cpc.png" alt="Logo" width={90} height={90} className="mb-6" />
          <h2 className="text-3xl font-bold mt-14">Welcome to<br />CPC Essen!</h2>
          <p className="text-xs font-semibold text-gray-600 absolute bottom-4 right-8">ESSEN © 2024</p>
        </div>
      </div>
    </div>
  );
}
