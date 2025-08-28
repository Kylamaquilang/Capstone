'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useState } from 'react';
import API from '@/lib/axios';

export default function AddStudentPage() {
  const [form, setForm] = useState({ name: '', student_id: '', password: '', role: 'student' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      setSubmitting(true);
      await API.post('/auth/signup', {
        name: form.name,
        student_id: form.student_id,
        password: form.password,
        role: form.role,
      });
      setSuccess('Student added successfully');
      setForm({ name: '', student_id: '', password: '', role: 'student' });
      // Redirect to users page so it displays immediately
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/users';
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to add student');
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
            <h2 className="text-2xl font-bold mb-6">Add Student</h2>
            {error && <div className="text-red-600 mb-4">{error}</div>}
            {success && <div className="text-green-600 mb-4">{success}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input name="name" value={form.name} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Student ID</label>
                <input name="student_id" value={form.student_id} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select name="role" value={form.role} onChange={handleChange} className="w-full border rounded px-3 py-2">
                  <option value="student">student</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <button type="submit" disabled={submitting} className={`px-4 py-2 rounded text-white ${submitting ? 'bg-gray-400' : 'bg-[#000C50] hover:bg-blue-900'}`}>
                {submitting ? 'Adding...' : 'Add Student'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


