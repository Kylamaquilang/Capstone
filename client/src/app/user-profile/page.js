'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Bars3Icon, 
  UserIcon, 
  ShoppingBagIcon, 
  ClockIcon, 
  CheckCircleIcon,
  PencilIcon,
  CameraIcon,
  KeyIcon,
  ArrowRightIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  PhoneIcon,
  AcademicCapIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import API from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import Swal from 'sweetalert2';

import { getProfileImageUrl } from '@/utils/imageUtils';
import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';

export default function UserProfilePage() {
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact_number: ''
  });

  // Decode token to extract user info
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const initials = decoded.name
        ? decoded.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : '??';

      setProfile({
        name: decoded.name || '',
        student_id: decoded.student_id || '',
        email: decoded.email || '',
        contact_number: decoded.contact_number || '',
        initials,
        profile_image: decoded.profile_image || null,
        role: decoded.role || '',
        degree: decoded.degree || '',
        status: decoded.status || '',
        is_active: decoded.is_active || true,
        created_at: decoded.created_at || new Date().toISOString()
      });
    } catch (err) {
      console.error('Invalid token:', err);
    }
  }, []);

  // Fetch user's profile and orders
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch profile
      const { data: profileData } = await API.get('/users/profile');
      setProfile(prev => ({
        ...prev,
        ...profileData.user,
        initials: profileData.user.name
          ? profileData.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : '??'
      }));
      
      setFormData({
        name: profileData.user.name || '',
        email: profileData.user.email || '',
        contact_number: profileData.user.contact_number || ''
      });

      // Fetch orders
      setOrdersLoading(true);
      const { data: ordersData } = await API.get('/orders/student');
      setOrders(ordersData || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err?.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await API.put('/users/profile', formData);
      setSuccess('Profile updated successfully');
      setEditing(false);
      
      // Refresh profile data
      const { data: profileData } = await API.get('/users/profile');
      setProfile(prev => ({
        ...prev,
        ...profileData.user,
        initials: profileData.user.name
          ? profileData.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : '??'
      }));
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('image', file);

      const { data } = await API.put('/users/profile/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Profile image updated successfully');
      
      // Refresh profile data
      const { data: profileData } = await API.get('/users/profile');
      setProfile(prev => ({
        ...prev,
        ...profileData.user,
        profile_image: profileData.user.profile_image
      }));
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSendVerificationCode = async () => {
    try {
      setSendingCode(true);
      setError('');
      
      await API.post('/auth/send-verification-code', {
        email: profile.email
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Verification Code Sent!',
        text: `A verification code has been sent to ${profile.email}`,
        confirmButtonColor: '#000C50',
      });
      
      setShowChangePassword(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send verification code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setVerifyingCode(true);
      setError('');
      
      await API.post('/auth/change-password', {
        email: profile.email,
        verificationCode,
        newPassword
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Password Changed Successfully!',
        text: 'Your password has been updated. Please login again.',
        confirmButtonColor: '#000C50',
      }).then(() => {
        logout();
        router.push('/auth/login');
      });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to change password');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const handleReceiveOrder = async (orderId) => {
    try {
      // Show confirmation dialog
      const result = await Swal.fire({
        title: 'Confirm Receipt',
        text: 'Are you sure you have received your order? This will complete your order and send you a receipt via email.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, I received it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        // Call API to confirm receipt
        const response = await API.post(`/orders/${orderId}/user-confirm`);
        
        if (response.data.success) {
          // Show success message
          await Swal.fire({
            title: 'Order Confirmed!',
            text: 'Your order has been confirmed and a receipt has been sent to your email.',
            icon: 'success',
            confirmButtonColor: '#10b981'
          });

          // Refresh orders to show updated status
          await fetchData();
        } else {
          throw new Error(response.data.message || 'Failed to confirm receipt');
        }
      }
    } catch (err) {
      console.error('Confirm receipt error:', err);
      await Swal.fire({
        title: 'Error',
        text: err?.response?.data?.error || 'Failed to confirm receipt. Please try again.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'ready_for_pickup': 'bg-purple-100 text-purple-800',
      'delivered': 'bg-green-100 text-green-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'refunded': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-xl">Loading profile...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-xl text-red-600">Failed to load profile</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* User Info Card */}
        <div className="bg-[#000C50] to-blue-800 m-6 p-8 rounded-lg flex justify-between items-center relative mx-25 text-white shadow-xl">
          <div className="flex gap-6 items-center">
            <div className="relative">
              {profile.profile_image ? (
                <Image
                  src={getProfileImageUrl(profile.profile_image)}
                  alt="Profile"
                  width={100}
                  height={100}
                  className="rounded-full object-cover border-4 border-white shadow-lg"
                  style={{ width: 'auto', height: 'auto' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`bg-white text-[#000C50] w-25 h-25 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-white shadow-lg ${
                  profile.profile_image ? 'hidden' : ''
                }`}
              >
                {profile.initials}
              </div>
              {uploadingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>
              <div className="flex items-center gap-2 mb-1">
                <AcademicCapIcon className="h-5 w-5" />
                <p className="text-lg opacity-90">Student ID: {profile.student_id}</p>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <EnvelopeIcon className="h-5 w-5" />
                <p className="text-sm opacity-80">{profile.email}</p>
              </div>
              {profile.contact_number && (
                <div className="flex items-center gap-2 mb-2">
                  <PhoneIcon className="h-5 w-5" />
                  <p className="text-sm opacity-80">Contact: {profile.contact_number}</p>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <ShieldCheckIcon className="h-4 w-4" />
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  profile.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {profile.is_active ? 'Active Account' : 'Inactive Account'}
                </span>
              </div>
            </div>
          </div>

          {/* Hamburger Button */}
          <div className="relative">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 p-3 rounded-full transition-all"
            >
              <Bars3Icon className="h-6 w-6 text-[#000C50]" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg z-10 border">
                <div className="p-2">
                  <button
                    onClick={() => setEditing(!editing)}
                    className="flex items-center gap-3 w-full text-[#000C50] px-4 py-3 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <PencilIcon className="h-5 w-5 text-[#000C50]" />
                    {editing ? 'Cancel Edit' : 'Edit Profile'}
                  </button>
                  <label className="flex items-center gap-3 w-full text-[#000C50] px-4 py-3 hover:bg-gray-100 rounded-md transition-colors cursor-pointer">
                    <CameraIcon className="h-5 w-5 text-[#000C50]" />
                    Change Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                  <button
                    onClick={handleSendVerificationCode}
                    className="flex items-center gap-2 w-full text-[#000C50] px-4 py-3 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <KeyIcon className="h-5 w-5 text-[#000C50]" />
                    Change Password
                  </button>
                  <hr className="my-2" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full text-[#000C50] px-4 py-3 hover:bg-red-50 rounded-md transition-colors text-red-600"
                  >
                    <ArrowRightIcon className="h-5 w-5" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mx-24 mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-24 mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Change Password Modal */}
        {showChangePassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-6">
                <KeyIcon className="h-6 w-6 text-[#000C50]" />
                <h3 className="text-xl font-bold">Change Password</h3>
              </div>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                    placeholder="Enter 6-digit code"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                    placeholder="Enter new password"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={verifyingCode}
                    className="flex-1 bg-[#000C50] text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition-colors font-medium disabled:opacity-50"
                  >
                    {verifyingCode ? 'Changing Password...' : 'Change Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setVerificationCode('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Profile Edit Form */}
        {editing && (
          <div className="mx-24 mb-8 bg-white border rounded-lg p-8 shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <UserIcon className="h-6 w-6 text-[#000C50]" />
              <h3 className="text-xl font-bold">Edit Profile Information</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
                    placeholder="Enter contact number"
                  />
                </div>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="bg-[#000C50] text-white px-8 py-3 rounded-lg hover:bg-blue-900 transition-colors font-medium"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: profile.name || '',
                      email: profile.email || '',
                      contact_number: profile.contact_number || ''
                    });
                  }}
                  className="bg-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Order History */}
        <div className="mx-24 bg-white rounded-lg p-8 shadow-xl mb-8">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingBagIcon className="h-6 w-6 text-[#000C50]" />
            <h2 className="text-2xl font-bold">Order History</h2>
          </div>
          
          <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
            {ordersLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#000C50]"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-8xl mb-4">📦</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Orders Yet</h3>
                <p className="text-gray-500 mb-6">You haven't placed any orders yet.</p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-[#000C50] text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition-colors"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="flex gap-6 items-start border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  {/* Image with alt fallback */}
                  <div className="flex-shrink-0">
                                          <Image
                        src="/images/polo.png"
                        alt={order.name || 'Order Image'}
                        width={120}
                        height={120}
                        className="rounded-lg object-cover"
                        style={{ width: 'auto', height: 'auto' }}
                      />
                  </div>

                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Order #{order.id}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <CalendarIcon className="h-4 w-4 text-gray-500" />
                          <p className="text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(order.status)}
                        <p className="text-xl font-bold text-[#000C50] mt-1">
                          ₱{order.total_amount}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Payment Method:</span>
                        <p className="text-gray-900">{order.payment_method}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Order Status:</span>
                        <p className="text-gray-900 capitalize">{order.status}</p>
                      </div>
                    </div>
                    
                    {/* Status Message */}
                    <div className="mt-4 p-4 rounded-lg bg-gray-50 border-l-4 border-[#000C50]">
                      <p className="text-sm text-gray-700">
                        {order.status === 'delivered'
                          ? '📦 Your order has been delivered! Please confirm receipt to complete your order.'
                          : order.status === 'completed'
                          ? '✅ You have successfully confirmed receipt of your order. We appreciate your support. Thank you for shopping with us!'
                          : order.status === 'ready_for_pickup'
                          ? '📦 Your order is ready for pickup! Please visit the store to collect your items.'
                          : '⏳ Your order is still being processed. Please wait for confirmation.'}
                      </p>
                    </div>

                    {/* Receive Order Button */}
                    {order.status === 'delivered' && (
                      <div className="mt-4">
                        <button
                          onClick={() => handleReceiveOrder(order.id)}
                          className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Confirm Receipt & Get Receipt
                        </button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Click to confirm you have received your order and get your receipt via email
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
