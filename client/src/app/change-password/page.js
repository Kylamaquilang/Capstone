'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import useChangePassword from '@/hooks/useChangePassword.js';

export default function ChangePassword() {
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { changePassword, error, success, loading } = useChangePassword();

  // Auto-fill email from JWT token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      setEmail(decoded.email || '');
    } catch (e) {
      console.error('Token decode failed:', e);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !oldPassword || !newPassword || !confirmPassword) {
      setLocalError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('New passwords do not match.');
      return;
    }

    setLocalError('');
    await changePassword({ email, oldPassword, newPassword });

    if (!error) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-[#000C50] flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-[440px] h-auto">
        {/* Logos */}
        <div className="flex justify-between items-center mb-6">
          <Image src="/images/cpc.png" alt="Logo" width={60} height={60} />
          <Image src="/images/logo.png" alt="Logo 2" width={150} height={150} />
        </div>

        <h2 className="text-2xl font-bold text-center text-[#000C50] mb-6">Change Password</h2>

        {/* Messages */}
        {localError && <div className="text-sm text-center mb-4 text-red-500">{localError}</div>}
        {error && <div className="text-sm text-center mb-4 text-red-500">{error}</div>}
        {success && <div className="text-sm text-center mb-4 text-green-600">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className="mt-1 block w-full px-4 py-2 border rounded-md bg-gray-100 shadow-sm focus:ring focus:ring-[#000C50]/50"
            />
          </div>

          {/* Old Password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">Old Password</label>
            <input
              type={showOld ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:ring focus:ring-[#000C50]/50"
            />
            <button type="button" onClick={() => setShowOld(!showOld)} className="absolute top-9 right-3">
              {showOld ? <EyeSlashIcon className="h-5 w-5 text-gray-500" /> : <EyeIcon className="h-5 w-5 text-gray-500" />}
            </button>
          </div>

          {/* New Password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:ring focus:ring-[#000C50]/50"
            />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute top-9 right-3">
              {showNew ? <EyeSlashIcon className="h-5 w-5 text-gray-500" /> : <EyeIcon className="h-5 w-5 text-gray-500" />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:ring focus:ring-[#000C50]/50"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute top-9 right-3">
              {showConfirm ? <EyeSlashIcon className="h-5 w-5 text-gray-500" /> : <EyeIcon className="h-5 w-5 text-gray-500" />}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#000C50] text-white py-2 rounded-md hover:bg-blue-900 font-semibold"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
