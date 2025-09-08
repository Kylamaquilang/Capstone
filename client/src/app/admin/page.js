'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to orders page by default
    router.replace('/admin/orders');
  }, [router]);

  return (
    <div className="flex flex-col h-screen text-black admin-page">
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-4">Redirecting to Orders...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
