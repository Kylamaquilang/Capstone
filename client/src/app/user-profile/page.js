'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUserAutoRefresh } from '@/hooks/useAutoRefresh';
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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(5);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact_number: ''
  });

  // Use auth context for user info
  useEffect(() => {
    if (!authUser) return;

    const initials = authUser.name
      ? authUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      : '??';

    setProfile({
      name: authUser.name || '',
      student_id: authUser.student_id || '',
      email: authUser.email || '',
      contact_number: authUser.contact_number || '',
      initials,
      profile_image: authUser.profile_image || null,
      role: authUser.role || '',
      degree: authUser.degree || '',
      status: authUser.status || '',
      is_active: authUser.is_active || true,
      created_at: authUser.created_at || new Date().toISOString()
    });
  }, [authUser]);

  // Fetch user's profile and orders
  const fetchData = useCallback(async () => {
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
  }, []);

  // Auto-refresh for orders
  useUserAutoRefresh(fetchData, 'orders');

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

    console.log('🔍 Submitting profile update:', formData);
    console.log('🔍 Current user from auth context:', authUser);
    console.log('🔍 Current user token:', localStorage.getItem('token') ? 'Present' : 'Missing');

    // Check if token exists before making request
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ Profile update - No token found');
      setError('Please log in to update your profile');
      return;
    }

    try {
      console.log('🔍 Profile update - Making request with token');
      console.log('🔍 Profile update - Token value:', token.substring(0, 20) + '...');
      console.log('🔍 Profile update - Form data:', formData);
      
      // Make request with explicit headers to ensure token is sent
      const response = await API.put('/users/profile', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Profile update response:', response.data);
      
      // Show SweetAlert success message
      await Swal.fire({
        title: 'Success!',
        text: 'Profile updated successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#000C50',
        timer: 2000,
        timerProgressBar: true
      });
      
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
      console.error('❌ Profile update error:', err);
      console.error('❌ Error response:', err?.response?.data);
      console.error('❌ Error status:', err?.response?.status);
      if (err.response?.status === 403) {
        console.log('🔍 Profile update - 403 error, token may be invalid');
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 401) {
        console.log('🔍 Profile update - 401 error, unauthorized');
        setError('Unauthorized. Please log in again.');
      } else {
        setError(err?.response?.data?.error || 'Failed to update profile');
      }
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

      // Show SweetAlert success message
      await Swal.fire({
        title: 'Success!',
        text: 'Profile image updated successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#000C50',
        timer: 2000,
        timerProgressBar: true
      });
      
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

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
    // Disable background scrolling
    document.body.style.overflow = 'hidden';
  };

  const handleCloseModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
    // Re-enable background scrolling
    document.body.style.overflow = 'unset';
  };

  // Pagination logic
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(orders.length / ordersPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
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
                <p className="text-lg opacity-90">{profile.student_id}</p>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <EnvelopeIcon className="h-5 w-5" />
                <p className="text-sm opacity-80">{profile.email}</p>
              </div>
              {profile.contact_number && (
                <div className="flex items-center gap-2 mb-2">
                  <PhoneIcon className="h-5 w-5" />
                  <p className="text-sm opacity-80">{profile.contact_number}</p>
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
        <div className="mx-4 sm:mx-6 lg:mx-24 bg-white rounded-lg shadow-sm border border-gray-200 mb-6 mt-5">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingBagIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Order History</h2>
                <span className="text-xs sm:text-sm text-gray-500 ml-auto">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 max-h-[400px] sm:max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
            {ordersLoading ? (
              <div className="flex justify-center py-8 sm:py-12">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#000C50]"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <ShoppingBagIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-1">
                  No orders yet
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  You haven't placed any orders yet.
                </p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#000C50] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Start Shopping
                  </button>
              </div>
            ) : (
              <>
              <div className="space-y-2 sm:space-y-3 pr-1 sm:pr-2">
                  {currentOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="bg-gray-50 rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => handleOrderClick(order)}
                  >
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xs sm:text-sm font-medium text-gray-900">
                            {order.items && order.items.length > 0 
                              ? order.items[0].product_name
                              : `Order #${order.id}`
                            }
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900">
                          ₱{order.total_amount}
                        </p>
                        <p className="text-xs text-gray-500">{order.payment_method}</p>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, orders.length)} of {orders.length} orders
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        &lt;
                      </button>
                      
                      <span className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-[#000C50] text-white">
                        {currentPage}
                      </span>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        &gt;
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[70vh] overflow-y-auto shadow-2xl border border-gray-200">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <ShoppingBagIcon className="h-5 w-5 sm:h-6 sm:w-6 text-[#000C50]" />
                <h3 className="text-lg sm:text-xl font-bold">
                  {selectedOrder.items && selectedOrder.items.length > 0 
                    ? selectedOrder.items[0].product_name
                    : 'Order Details'
                  }
                </h3>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Date</p>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedOrder.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Payment Method</p>
                    <p className="text-sm text-gray-900">{selectedOrder.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Product Price</p>
                    <p className="text-sm font-semibold text-gray-900">₱{selectedOrder.items && selectedOrder.items.length > 0 ? selectedOrder.items[0].unit_price : '0'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Amount</p>
                    <p className="text-sm font-semibold text-gray-900">₱{selectedOrder.total_amount}</p>
                  </div>
                </div>

                {/* Order Items */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div>
                    <div className="space-y-2">
                      {(() => {
                        // Group items by product name and size
                        const groupedItems = selectedOrder.items.reduce((acc, item) => {
                          const key = `${item.product_name}-${item.size_name || 'no-size'}`;
                          if (!acc[key]) {
                            acc[key] = {
                              product_name: item.product_name,
                              size_name: item.size_name,
                              quantity: 0,
                              unit_price: item.unit_price,
                              total_price: 0
                            };
                          }
                          acc[key].quantity += item.quantity;
                          acc[key].total_price += item.total_price;
                          return acc;
                        }, {});

                        return Object.values(groupedItems).map((item, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-gray-900">{item.product_name}</h5>
                              {item.size_name && (
                                <p className="text-xs text-gray-500">Size: {item.size_name}</p>
                              )}
                              <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end pt-3 sm:pt-4">
                <button
                  onClick={handleCloseModal}
                  className="bg-[#000C50] text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
