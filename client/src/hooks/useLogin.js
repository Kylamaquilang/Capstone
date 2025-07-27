'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

// ✅ Axios instance using environment variable
const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

export default function useLogin() {
  const router = useRouter();
  const [error, setError] = useState('');

  const login = async ({ student_id, password }) => {
    try {
      // 📌 Attempt login
      const { data } = await API.post('/auth/signin', { student_id, password });

      if (!data.token) {
        setError('No token received from server');
        return;
      }

      // ✅ Store token
      localStorage.setItem('token', data.token);

      // ✅ Decode token (safe base64 decode)
      const payload = JSON.parse(atob(data.token.split('.')[1]));
      const { role } = payload;

      // 🔎 Debug info (remove in production)
      console.log('Logged in as:', payload);

      // 🔁 Redirect based on role
      if (role === 'admin') {
        router.push('/app/dashboard/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err?.response?.data?.error || 'Login failed');
    }
  };

  return { login, error };
}
