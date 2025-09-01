'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useState } from 'react';
import API from '@/lib/axios';

export default function BulkUploadStudentsPage() {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!file) {
      setError('Please select a file');
      return;
    }
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', file);
      // NOTE: Replace this endpoint with the real bulk upload endpoint when available
      await API.post('/dashboard/users/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Bulk upload started successfully');
      setFile(null);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to start bulk upload');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen text-black">
      <Navbar />
      <div className="flex flex-1">
        <div className="w-64" style={{ height: 'calc(100vh - 64px)' }}>
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl">
            <h2 className="text-2xl font-bold mb-6">Bulk Upload Students</h2>
            <p className="text-sm text-gray-600 mb-4">Upload a CSV file with columns: name, student_id, password, role</p>
            {error && <div className="text-red-600 mb-4">{error}</div>}
            {success && <div className="text-green-600 mb-4">{success}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <button type="submit" disabled={submitting} className={`px-4 py-2 rounded text-white ${submitting ? 'bg-gray-400' : 'bg-[#000C50] hover:bg-blue-900'}`}>
                {submitting ? 'Uploading...' : 'Upload CSV'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}








