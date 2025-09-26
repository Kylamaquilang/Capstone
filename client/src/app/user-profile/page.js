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
  const [statusFilter, setStatusFilter] = useState('all');
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


  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  });

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'pending': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'processing': 'bg-blue-50 text-blue-700 border-blue-200',
      'ready_for_pickup': 'bg-purple-50 text-purple-700 border-purple-200',
      'delivered': 'bg-green-50 text-green-700 border-green-200',
      'completed': 'bg-green-50 text-green-700 border-green-200',
      'cancelled': 'bg-red-50 text-red-700 border-red-200',
      'refunded': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${statusClasses[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
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
        <div className="bg-[#000C50] to-blue-800 mx-4 sm:mx-6 lg:mx-24 p-4 sm:p-6 lg:p-8 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center relative text-white shadow-xl">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center w-full sm:w-auto">
            <div className="relative">
              {profile.profile_image ? (
                <Image
                  src={getProfileImageUrl(profile.profile_image)}
                  alt="Profile"
                  width={100}
                  height={100}
                  className="rounded-full object-cover border-4 border-white shadow-lg w-16 h-16 sm:w-20 sm:h-20 lg:w-25 lg:h-25"
                  style={{ width: 'auto', height: 'auto' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`bg-white text-[#000C50] w-16 h-16 sm:w-20 sm:h-20 lg:w-25 lg:h-25 rounded-full flex items-center justify-center text-lg sm:text-xl lg:text-2xl font-bold border-4 border-white shadow-lg ${
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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">{profile.name}</h1>
              <div className="flex items-center gap-2 mb-1">
                <AcademicCapIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <p className="text-sm sm:text-base lg:text-lg opacity-90">Student ID: {profile.student_id}</p>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <EnvelopeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <p className="text-xs sm:text-sm opacity-80">{profile.email}</p>
              </div>
              {profile.contact_number && (
                <div className="flex items-center gap-2 mb-2">
                  <PhoneIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <p className="text-xs sm:text-sm opacity-80">Contact: {profile.contact_number}</p>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <ShieldCheckIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full ${
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
          <div className="relative mt-4 sm:mt-0">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 sm:p-3 rounded-full transition-all"
            >
              <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6 text-[#000C50]" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-lg shadow-lg z-10 border">
                <div className="p-2">
                  <button
                    onClick={() => setEditing(!editing)}
                    className="flex items-center gap-3 w-full text-[#000C50] px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-100 rounded-md transition-colors text-sm sm:text-base"
                  >
                    <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5 text-[#000C50]" />
                    {editing ? 'Cancel Edit' : 'Edit Profile'}
                  </button>
                  <label className="flex items-center gap-3 w-full text-[#000C50] px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-100 rounded-md transition-colors cursor-pointer text-sm sm:text-base">
                    <CameraIcon className="h-4 w-4 sm:h-5 sm:w-5 text-[#000C50]" />
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
                    className="flex items-center gap-2 w-full text-[#000C50] px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-100 rounded-md transition-colors text-sm sm:text-base"
                  >
                    <KeyIcon className="h-4 w-4 sm:h-5 sm:w-5 text-[#000C50]" />
                    Change Password
                  </button>
                  <hr className="my-2" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full text-[#000C50] px-3 sm:px-4 py-2 sm:py-3 hover:bg-red-50 rounded-md transition-colors text-red-600 text-sm sm:text-base"
                  >
                    <ArrowRightIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mx-4 sm:mx-6 lg:mx-24 mb-4 sm:mb-6 p-3 sm:p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm sm:text-base">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-4 sm:mx-6 lg:mx-24 mb-4 sm:mb-6 p-3 sm:p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm sm:text-base">
            {success}
          </div>
        )}

        {/* Change Password Modal */}
        {showChangePassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <KeyIcon className="h-5 w-5 sm:h-6 sm:w-6 text-[#000C50]" />
                <h3 className="text-lg sm:text-xl font-bold">Change Password</h3>
              </div>
              
              <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50] text-sm sm:text-base"
                    placeholder="Enter 6-digit code"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50] text-sm sm:text-base"
                    placeholder="Enter new password"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50] text-sm sm:text-base"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-3 sm:pt-4">
                  <button
                    type="submit"
                    disabled={verifyingCode}
                    className="flex-1 bg-[#000C50] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-900 transition-colors font-medium disabled:opacity-50 text-sm sm:text-base"
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
                    className="flex-1 bg-gray-300 text-gray-700 px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm sm:text-base"
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
          <div className="mx-4 sm:mx-6 lg:mx-24 mb-6 sm:mb-8 bg-white border rounded-lg p-4 sm:p-6 lg:p-8 shadow-md">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-[#000C50]" />
              <h3 className="text-lg sm:text-xl font-bold">Edit Profile Information</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent text-sm sm:text-base"
                    placeholder="Enter contact number"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-3 sm:pt-4">
                <button
                  type="submit"
                  className="bg-[#000C50] text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:bg-blue-900 transition-colors font-medium text-sm sm:text-base"
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
                  className="bg-gray-300 text-gray-700 px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm sm:text-base"
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex items-center gap-2">
                <ShoppingBagIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Order History</h2>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <span className="text-xs sm:text-sm text-gray-500">{filteredOrders.length} of {orders.length} order{orders.length !== 1 ? 's' : ''}</span>
                <div className="relative w-full sm:w-auto">
                  <select 
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent w-full sm:w-auto"
                  >
                    <option value="all">All Orders</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="ready_for_pickup">Ready for Pickup</option>
                    <option value="delivered">Delivered</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 max-h-[400px] sm:max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
            {ordersLoading ? (
              <div className="flex justify-center py-8 sm:py-12">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#000C50]"></div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <ShoppingBagIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-1">
                  {statusFilter === 'all' ? 'No orders yet' : `No ${statusFilter} orders`}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  {statusFilter === 'all' 
                    ? "You haven't placed any orders yet." 
                    : `You don't have any ${statusFilter} orders.`}
                </p>
                {statusFilter === 'all' && (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#000C50] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Start Shopping
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 pr-1 sm:pr-2">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="bg-gray-50 rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xs sm:text-sm font-medium text-gray-900">Order #{order.id}</h3>
                          {getStatusBadge(order.status)}
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
                    
                    {/* Status Message */}
                    <div className="mb-2 sm:mb-3 p-2 sm:p-3 rounded-lg bg-white border border-gray-200">
                      <p className="text-xs text-gray-700">
                        {order.status === 'completed'
                          ? '✅ You have successfully confirmed receipt of your order. Thank you for shopping with us!'
                          : order.status === 'ready_for_pickup'
                          ? '📦 Your order is ready for pickup! Please visit the store to collect your items and confirm receipt through the notification.'
                          : '⏳ Your order is still being processed. Please wait for confirmation.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
