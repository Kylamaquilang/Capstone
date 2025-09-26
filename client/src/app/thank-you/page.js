'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ThankYouModal from '@/components/common/ThankYouModal';

export default function ThankYouPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    if (orderIdParam) {
      setOrderId(orderIdParam);
      setShowModal(true);
    } else {
      // If no orderId, redirect to dashboard
      router.push('/dashboard');
    }
  }, [searchParams, router]);

  const handleCloseModal = () => {
    setShowModal(false);
    // Redirect to user dashboard after modal closes
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Thank You for Your Order!
        </h1>
        <p className="text-gray-600">
          Redirecting you to your dashboard...
        </p>
      </div>
      
      {showModal && (
        <ThankYouModal 
          isOpen={showModal}
          onClose={handleCloseModal}
          orderId={orderId}
        />
      )}
    </div>
  );
}
