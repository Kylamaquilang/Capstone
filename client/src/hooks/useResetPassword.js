'use client';
import { useState } from 'react';
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

export default function useResetPassword() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetPassword = async ({ student_id, newPassword }) => {
    try {
      const res = await API.post('/auth/reset-password', {
        student_id,
        newPassword,
      });

      setSuccess(res.data.message);
      setError('');
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.error || 'Reset failed');
    }
  };

  return { resetPassword, error, success };
}
