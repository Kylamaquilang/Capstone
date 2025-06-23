'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    role: 'student',
    student_id: '',
    email: '',
    name: ''
  })

  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    try {
      const response = await axios.post('http://localhost:5000/api/auth/signup', formData)
      setMessage(response.data.message)
      setTimeout(() => router.push('/login'), 1000)
    } catch (error) {
      const err = error.response?.data?.error || 'Signup failed'
      setMessage(err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>

        {/* Role selection */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Conditional fields */}
        {formData.role === 'student' ? (
          <div className="mb-4">
            <label className="block font-semibold mb-1">Student ID</label>
            <input
              type="text"
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              placeholder="e.g. 2021001"
              required
            />
          </div>
        ) : (
          <div className="mb-4">
            <label className="block font-semibold mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              placeholder="e.g. admin@example.com"
              required
            />
          </div>
        )}

        {/* Name field */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Register
        </button>

        {/* Message */}
        {message && (
          <div className="mt-4 text-sm text-center text-red-600">{message}</div>
        )}
      </form>
    </div>
  )
}
