'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    student_id: '',
    email: '',
    password: ''
  })
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    try {
      const payload = formData.email
        ? { email: formData.email, password: formData.password }
        : { student_id: formData.student_id, password: formData.password }

      const response = await axios.post('http://localhost:5000/api/auth/signin', payload)

      localStorage.setItem('token', response.data.token)
      setMessage(response.data.message)
      setTimeout(() => router.push('/dashboard'), 1000)
    } catch (error) {
      const err = error.response?.data?.error || 'Login failed'
      setMessage(err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

        {/* Choose between Student ID or Email */}
        <div className="mb-4">
          <label className="block font-semibold mb-1">Student ID (for students)</label>
          <input
            type="text"
            name="student_id"
            value={formData.student_id}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="e.g. 2021001"
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-1">Email (for admins)</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="e.g. admin@example.com"
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-1">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        >
          Login
        </button>

        {message && (
          <div className="mt-4 text-sm text-center text-red-600">{message}</div>
        )}
      </form>
    </div>
  )
}
