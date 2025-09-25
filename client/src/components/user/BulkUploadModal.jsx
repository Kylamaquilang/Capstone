'use client';
import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';

export default function BulkUploadModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadResult, setUploadResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUploadResult(null);
    
    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    // Validate file type
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const hasValidExtension = allowedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension) {
      setError('Please select a valid CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    // Validate file size (10MB limit for Excel files)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('📤 Uploading CSV file:', file.name, 'Size:', file.size);
      
      // Show processing message for large files
      if (file.size > 50000) { // 50KB
        setSuccess('Processing large file... This may take a few minutes.');
      }
      
      const response = await API.post('/students/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 // 2 minute timeout for large files
      });
      
      console.log('📥 Upload response:', response.data);
      
      setSuccess('Bulk upload completed successfully');
      setUploadResult(response.data);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('csv-file');
      if (fileInput) fileInput.value = '';
      
      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('❌ Upload error:', err);
      console.error('❌ Error response:', err.response);
      console.error('❌ Error status:', err.response?.status);
      console.error('❌ Error data:', err.response?.data);
      
      let errorMessage = 'Failed to upload file';
      
      if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      if (err?.response?.data?.message) {
        errorMessage += ': ' + err.response.data.message;
      }
      
      if (err?.response?.data?.details) {
        errorMessage += ': ' + err.response.data.details;
      }
      
      if (err?.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout - file may be too large or server is slow';
      }
      
      if (err?.response?.status === 413) {
        errorMessage = 'File too large - please use a smaller file';
      }
      
      if (err?.response?.status === 401) {
        errorMessage = 'Authentication failed - please log in again';
      }
      
      if (err?.response?.status === 403) {
        errorMessage = 'Access denied - admin privileges required';
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `student_id,first_name,last_name,middle_name,suffix,email,degree,status
20240001,John,Doe,Michael,Jr.,john.doe@example.com,BSIT,regular
20240002,Jane,Smith,,,jane.smith@example.com,BSED,regular
20240003,Robert,Johnson,William,III,robert.johnson@example.com,BEED,irregular`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_students.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (!submitting) {
      setError('');
      setSuccess('');
      setUploadResult(null);
      setFile(null);
      const fileInput = document.getElementById('csv-file');
      if (fileInput) fileInput.value = '';
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-200 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-medium text-gray-900">Bulk Upload Students</h2>
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

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Instructions:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Upload a CSV or Excel file with student information</li>
                  <li>• Required columns: student_id (or Student ID), first_name (or First Name), last_name (or Last Name), email (or Email), degree (or Course/Program), status (or Year Level)</li>
                  <li>• Optional columns: middle_name (or Middle Name), suffix (or Suffix)</li>
                  <li>• Student ID must be numeric (4-8 digits)</li>
                  <li>• Valid degrees: BEED, BSED, BSIT, BSHM (or full names like "Bachelor of Science in Information Technology")</li>
                  <li>• Valid status: regular, irregular (or year levels like "1st year", "2nd year", etc.)</li>
                  <li>• Supported formats: .csv, .xlsx, .xls</li>
                  <li>• Download the sample CSV template below</li>
                </ul>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV or Excel File
                </label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {file && (
                  <p className="text-sm text-gray-600 mt-1">Selected: {file.name}</p>
                )}
              </div>

              {/* Sample Download */}
              <div>
                <button
                  type="button"
                  onClick={downloadSampleCSV}
                  disabled={submitting}
                  className="text-sm text-gray-600 hover:text-gray-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download Sample CSV Template
                </button>
              </div>

              {/* Upload Results */}
              {uploadResult && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Upload Results:</h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>• Total processed: {uploadResult.total || 0}</p>
                    <p>• Successfully added: {uploadResult.successful || 0}</p>
                    <p>• Failed: {uploadResult.failed || 0}</p>
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Errors:</p>
                        <ul className="list-disc list-inside text-xs text-red-600">
                          {uploadResult.errors.map((errorItem, index) => (
                            <li key={index}>
                              {typeof errorItem === 'string' ? errorItem : 
                               typeof errorItem === 'object' && errorItem.error ? errorItem.error :
                               `Row ${errorItem.row || index + 1}: ${errorItem.error || 'Unknown error'}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  type="submit"
                  disabled={submitting || !file}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Uploading...' : 'Upload CSV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
