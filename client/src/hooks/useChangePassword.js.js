'use client';

import { useState } from 'react';
import axios from 'axios';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

export default function useChangePassword() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const changePassword = async ({ email, oldPassword, newPassword }) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await API.post('/auth/change-password', {
        email,
        oldPassword,
        newPassword,
      });
      setSuccess(res.data.message);
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return { changePassword, error, success, loading };
}
