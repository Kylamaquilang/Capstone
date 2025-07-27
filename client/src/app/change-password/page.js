'use client';
import Image from 'next/image';
import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function ChangePassword() {
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }
    setMessage("Password updated successfully.");
  };

  return (
    <div className="min-h-screen bg-[#000C50] flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-[440px] h-auto">
        {/* Two images at the top */}
        <div className="flex justify-between items-center mb-6">
          <Image src="/images/cpc.png" alt="Logo" width={60} height={60} />
          <Image src="/images/logo.png" alt="Logo 2" width={150} height={150} />
        </div>

        <h2 className="text-2xl font-bold text-center text-[#000C50] mb-6">Change Password</h2>

        {message && (
          <div className="text-sm text-center mb-4 text-red-500">{message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:ring focus:ring-[#000C50]/50"
            />
          </div>

          {/* Old Password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">Old Password</label>
            <input
              type={showOld ? "text" : "password"}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:ring focus:ring-[#000C50]/50"
            />
            <button
              type="button"
              onClick={() => setShowOld(!showOld)}
              className="absolute top-9 right-3"
            >
              {showOld ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>

          {/* New Password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:ring focus:ring-[#000C50]/50"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute top-9 right-3"
            >
              {showNew ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border rounded-md shadow-sm focus:ring focus:ring-[#000C50]/50"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute top-9 right-3"
            >
              {showConfirm ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-[#000C50] text-white py-2 rounded-md hover:bg-blue-900 font-semibold"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
