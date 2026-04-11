'use client';
import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';
import Swal from '@/lib/sweetalert-config';

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
      
      // Show processing message based on file size
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      if (file.size > 1024 * 1024) { // > 1MB
        setSuccess(`Processing large file (${fileSizeMB} MB)... This may take several minutes. Please do not close this window.`);
      } else if (file.size > 50000) { // > 50KB
        setSuccess('Processing file... This may take a minute or two.');
      }
      
      // Show initial progress message
      setSuccess('Uploading file... Please wait, this may take a few minutes for large files.');
      
      const response = await API.post('/students/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000 // 10 minute timeout for very large files
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
      
      // Handle specific error cases with SweetAlert
      if (err?.response?.status === 409) {
        // Duplicate entries - show warning
        await Swal.fire({
          title: 'Duplicate Entries',
          text: errorMessage,
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setError(errorMessage);
      } else if (err?.response?.status === 413) {
        // File too large
        await Swal.fire({
          title: 'File Too Large',
          text: 'File size must be less than 10MB. Please use a smaller file.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setError('File too large - please use a smaller file');
      } else if (err?.response?.status === 401) {
        // Authentication error
        await Swal.fire({
          title: 'Authentication Failed',
          text: 'Please log in again to continue.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setError('Authentication failed - please log in again');
      } else if (err?.response?.status === 403) {
        // Access denied
        await Swal.fire({
          title: 'Access Denied',
          text: 'Admin privileges required to upload files.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setError('Access denied - admin privileges required');
      } else if (err?.response?.status === 400) {
        // Validation error
        await Swal.fire({
          title: 'Validation Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setError(errorMessage);
      } else {
        // Other errors
        await Swal.fire({
          title: 'Upload Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `student_id,first_name,last_name,middle_name,suffix,email,degree,year_level,section,status
20240001,John,Doe,Michael,Jr.,john.doe@example.com,BSIT,1st Year,A,regular
20240002,Jane,Smith,,,jane.smith@example.com,BSED,2nd Year,B,regular
20240003,Robert,Johnson,William,III,robert.johnson@example.com,BEED,3rd Year,C,irregular`;
    
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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0"
          onClick={handleClose}
        />
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10">
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  {submitting && (
                    <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  <p className="text-blue-600 text-sm font-medium">{success}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Instructions:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Upload a CSV or Excel file with student information</li>
                  <li>• Required columns: student_id (or Student ID), first_name (or First Name), last_name (or Last Name), email (or Email), degree (or Course/Program), year_level (or Year Level), section (or Section), status (or Status)</li>
                  <li>• Optional columns: middle_name (or Middle Name), suffix (or Suffix)</li>
                  <li>• Student ID must be numeric (4-8 digits)</li>
                  <li>• Valid degrees: BEED, BSED, BSIT, BSHM (or full names like &quot;Bachelor of Science in Information Technology&quot;)</li>
                  <li>• Valid year levels: 1st Year, 2nd Year, 3rd Year, 4th Year</li>
                  <li>• Valid status: regular, irregular</li>
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
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {submitting ? 'Processing... Please wait' : 'Upload CSV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
