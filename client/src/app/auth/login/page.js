'use client';

import Image from 'next/image';
import { useState } from 'react';
import useLogin from '@/hooks/useLogin';

export default function LoginPage() {
  const { login, error } = useLogin();
  const [formData, setFormData] = useState({
    student_id: '',
    password: '',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(formData);
  };

  return (
    <div
      className="flex justify-center items-center min-h-screen text-black"
      style={{ backgroundColor: '#000C50' }}
    >
      <div className="bg-white w-full max-w-4xl h-[70%] rounded-xl shadow-lg flex overflow-hidden">
        {/* Left Section */}
        <div
          className="w-1/2 p-10 border-r-4 flex flex-col justify-between"
          style={{ borderColor: '#000C50' }}
        >
          <Image src="/images/cpc.png" alt="Logo" width={80} height={80} className="-mt-6" />
          <h4 className="text-2xl font-bold">Log in to your <br />ESSEN account.</h4>
          <p className="text-sm font-medium mt-4">
            "Equip yourself for success, find everything you need to thrive in school, 
            from study tools to personal essentials, all in one place."
          </p>
          <p className="text-xs text-gray-500 mt-6">ESSEN © 2024</p>
        </div>

        {/* Right Section */}
        <div className="w-1/2 h-[540px] p-10 relative">
          <Image
            src="/images/logo.png"
            alt="ESSEN Logo"
            width={250}
            height={80}
            className="absolute top-6 left-1/3 transform -translate-x-1/2"
          />
          <h4 className="mt-32 text-xl font-bold mb-8">Sign in</h4>

          {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}

          <form className="max-w-sm mx-auto" onSubmit={handleSubmit}>
            <input
              name="student_id"
              placeholder="Student ID / Admin Email"
              value={formData.student_id}
              onChange={handleChange}
              required
              className="w-full border-b-2 border-black p-2 mb-6 focus:outline-none"
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full border-b-2 border-black p-2 mb-6 focus:outline-none"
            />

            <button
              type="submit"
              className="w-full text-white py-2 font-semibold text-sm rounded-lg"
              style={{ backgroundColor: '#000C50' }}
            >
              CONTINUE
            </button>

            <button
              type="button"
              onClick={() => window.location.href = '/auth/reset-password'}
              className="w-full py-2 font-semibold text-sm rounded-lg mt-2 border"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#000C50',
                color: '#000C50',
              }}
            >
              RESET PASSWORD
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
