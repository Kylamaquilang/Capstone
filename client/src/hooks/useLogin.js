'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import API from '@/lib/axios';

export default function useLogin() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async ({ student_id, password }) => {
    setLoading(true);
    setError('');
    
    try {
      const { data } = await API.post('/auth/signin', { student_id, password });

      if (!data.token) {
        setError('No token received from server');
        return;
      }

      // Store token and user data in context
      login(data.user, data.token);

      // Redirect based on role
      if (data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return { login: handleLogin, error, loading };
}
