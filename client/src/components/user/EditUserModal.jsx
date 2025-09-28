'use client';
import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';

export default function EditUserModal({ isOpen, onClose, onSuccess, user }) {
  const [form, setForm] = useState({ 
    year_level: '',
    section: '',
    degree: '',
    status: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        year_level: user.year_level || '',
        section: user.section || '',
        degree: user.degree || '',
        status: user.status || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!user) return;
    
    try {
      setSubmitting(true);
      await API.put(`/users/${user.id}`, form);
      setSuccess('User updated successfully');
      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setError('');
      setSuccess('');
      onClose();
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-200 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-medium text-gray-900">Edit User</h2>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">User Information</h3>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-900"><strong>Name:</strong> {user.name}</p>
                <p className="text-sm text-gray-900"><strong>Email:</strong> {user.email}</p>
                <p className="text-sm text-gray-900"><strong>Student ID:</strong> {user.student_id || 'N/A'}</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Degree Program
                </label>
                <select 
                  name="degree" 
                  value={form.degree} 
                  onChange={handleChange} 
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select Degree</option>
                  <option value="BSIT">BSIT - Bachelor of Science in Information Technology</option>
                  <option value="BSED">BSED - Bachelor of Science in Education</option>
                  <option value="BEED">BEED - Bachelor of Elementary Education</option>
                  <option value="BSHM">BSHM - Bachelor of Science in Hospitality Management</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Year Level
                </label>
                <select 
                  name="year_level" 
                  value={form.year_level} 
                  onChange={handleChange} 
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select Year Level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Section
                </label>
                <input 
                  name="section" 
                  value={form.section} 
                  onChange={handleChange} 
                  placeholder="e.g., A, B, C"
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Status
                </label>
                <select 
                  name="status" 
                  value={form.status} 
                  onChange={handleChange} 
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select Status</option>
                  <option value="regular">Regular</option>
                  <option value="irregular">Irregular</option>
                </select>
              </div>
            </form>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
