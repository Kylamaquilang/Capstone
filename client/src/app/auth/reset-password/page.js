'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/axios';

export default function ResetPasswordPage() {
  const [step, setStep] = useState(1); // 1: request reset, 2: verify code, 3: new password
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');
  const router = useRouter();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await API.post('/auth/request-reset', {
        email: email.trim() || undefined,
        student_id: studentId.trim() || undefined
      });

      setSuccess(`Verification code sent to ${response.data.email}`);
      setStep(2);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await API.post('/auth/verify-code', {
        email: email.trim() || undefined,
        student_id: studentId.trim() || undefined,
        verificationCode: verificationCode.trim()
      });

      setResetToken(response.data.resetToken);
      setSuccess('Code verified! Please enter your new password.');
      setStep(3);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      await API.post('/auth/reset-password', {
        resetToken,
        newPassword
      });

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
      setSuccess('');
    }
  };

  const renderStep1 = () => (
    <form onSubmit={handleRequestReset} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
        />
      </div>
      
      <div className="text-center text-gray-500 ">
        <span>OR</span>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Student ID
        </label>
        <input
          type="text"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Enter your student ID"
          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        disabled={loading || (!email.trim() && !studentId.trim())}
        className="w-full bg-[#000C50] text-white py-2 rounded-md font-semibold hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending...' : 'Send Verification Code'}
      </button>

      <button
        type="button"
        onClick={() => router.push('/auth/login')}
        className="w-full border border-[#000C50] text-[#000C50] py-2 rounded-md font-medium hover:bg-gray-50"
      >
        Back to Login
      </button>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={handleVerifyCode} className="space-y-6">
      <div className="text-center mb-4">
        <p className="text-sm text-gray-600">
          We've sent a 6-digit verification code to your email address.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Verification Code
        </label>
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          placeholder="Enter 6-digit code"
          maxLength={6}
          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent text-center text-lg tracking-widest"
        />
      </div>

      <button
        type="submit"
        disabled={loading || verificationCode.length !== 6}
        className="w-full bg-[#000C50] text-white py-2 rounded-md font-semibold hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Verifying...' : 'Verify Code'}
      </button>

      <button
        type="button"
        onClick={goBack}
        className="w-full border border-gray-300 text-gray-700 py-2 rounded-md font-semibold hover:bg-gray-50"
      >
        Back
      </button>
    </form>
  );

  const renderStep3 = () => (
    <form onSubmit={handleResetPassword} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          New Password
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new password"
          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Confirm New Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !newPassword || !confirmPassword}
        className="w-full bg-[#000C50] text-white py-2 rounded-md font-semibold hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>

      <button
        type="button"
        onClick={goBack}
        className="w-full border border-gray-300 text-gray-700 py-2 rounded-md font-semibold hover:bg-gray-50"
      >
        Back
      </button>
    </form>
  );

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Request Password Reset';
      case 2: return 'Verify Code';
      case 3: return 'Set New Password';
      default: return 'Reset Password';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1: return 'Enter your email or student ID to receive a verification code';
      case 2: return 'Enter the 6-digit code sent to your email';
      case 3: return 'Create a new password for your account';
      default: return '';
    }
  };

  return (
    <div
      className="flex justify-center items-center min-h-screen text-black py-0"
      style={{ backgroundColor: '#000C50' }}
    >
      <div className="bg-white w-full max-w-4xl h-[550px] rounded-xl shadow-lg flex overflow-hidden">
        {/* Left Side - Form */}
        <div
          className="w-1/2 p-8 border-r-4 flex flex-col justify-center"
          style={{ borderColor: '#000C50' }}
        >
          <div>
            <h2 className="text-2xl font-bold text-black mb-2">{getStepTitle()}</h2>
            <p className="text-sm text-gray-600 mb-6">{getStepDescription()}</p>
            
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            {/* Success Message */}
            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">
                {success}
              </div>
            )}

            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-6">
              {[1, 2, 3].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                    stepNumber <= step 
                      ? 'bg-[#000C50] text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {stepNumber}
                  </div>
                  {stepNumber < 3 && (
                    <div className={`w-12 h-1 mx-2 ${
                      stepNumber < step ? 'bg-[#000C50]' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Form Content */}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </div>
        </div>

        {/* Right Side - Welcome */}
        <div className="w-1/2 bg-white relative flex flex-col items-center justify-center p-8">
          <Image
            src="/images/cpc.png"
            alt="Logo"
            width={90}
            height={90}
            className="mb-6"
          />
          <h2 className="text-3xl font-bold text-black text-center mb-4">Welcome to<br />CPC Essen!</h2>
          <p className="text-xs font-semibold text-gray-600 absolute bottom-4 right-8">ESSEN © 2024</p>
        </div>
      </div>
    </div>
  );
}
