'use client';

import useLogin from '@/hooks/useLogin';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function LoginPage() {
  const { login, error, loading } = useLogin();
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

  // Ensure body styles are properly set for login page
  useEffect(() => {
    // Remove any padding/margin from body for login page
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.paddingTop = '0';
    
    // Cleanup function to restore styles when leaving
    return () => {
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.paddingTop = '';
    };
  }, []);

  return (
    <div
      className="flex justify-center items-center min-h-screen text-black"
      style={{ backgroundColor: '#000C50', margin: 0, padding: 0 }}
    >
      <div className="bg-white w-full max-w-3xl h-110 rounded-xl shadow-lg flex overflow-hidden">
        {/* Left Section */}
        <div
          className="w-1/2 p-8 border-r-4 flex flex-col justify-between"
          style={{ borderColor: '#000C50' }}
        >
          <Image src="/images/cpc.png" alt="Logo" width={60} height={60} className="mb-4" />
          <h4 className="text-xl font-semibold">Log in to your <br />ESSEN account.</h4>
          <p className="text-sm font-small mt-3">
            &quot;Equip yourself for success, find everything you need to thrive in school, 
            from study tools to personal essentials, all in one place.&quot;
          </p>
          <p className="text-xs text-gray-500 mt-4">ESSEN © 2024</p>
        </div>

        {/* Right Section */}
        <div className="w-1/2 p-8 relative">
          <Image
            src="/images/logo.png"
            alt="ESSEN Logo"
            width={170}
            height={60}
            className="mb-6"
          />
          <h4 className="text-lg font-semibold mb-8">Sign in</h4>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form className="max-w-sm mx-auto" onSubmit={handleSubmit}>
            <input
              name="student_id"
              placeholder="StudentId/Email"
              value={formData.student_id}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full border-b-2 border-black p-2 mb-6 focus:outline-none disabled:opacity-50"
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full border-b-2 border-black p-2 mb-6 focus:outline-none disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 font-semibold text-sm rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#000C50' }}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'CONTINUE'
              )}
            </button>

            <Link href="/auth/reset-password">
              <button
                type="button"
                disabled={loading}
                className="w-full py-3 font-semibold text-sm rounded-lg mt-2 border transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#000C50',
                  color: '#000C50',
                }}
              >
                RESET PASSWORD
              </button>
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
