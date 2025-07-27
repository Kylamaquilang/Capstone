'use client';
import { useState } from 'react';
import useResetPassword from '@/hooks/useResetPassword';

export default function ResetPasswordPage() {
  const { resetPassword, error, success } = useResetPassword();
  const [student_id, setStudentId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await resetPassword({ student_id, newPassword });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-white p-6 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Reset Password</h2>

        <label className="block mb-2">Student ID</label>
        <input
          type="text"
          value={student_id}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        <label className="block mb-2">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
          Reset Password
        </button>

        {error && <p className="text-red-500 mt-4">{error}</p>}
        {success && <p className="text-green-600 mt-4">{success}</p>}
      </form>
    </div>
  );
}
