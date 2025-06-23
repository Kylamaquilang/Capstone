'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'

export default function Dashboard() {
  const router = useRouter()
  const [tokenValid, setTokenValid] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      router.push('/login')
    } else {
      // Optionally: verify token with server (not implemented here)
      setTokenValid(true)
    }
  }, [router])

  if (!tokenValid) return null

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow text-center max-w-xl">
          <h1 className="text-2xl font-bold mb-2">Welcome to the Dashboard!</h1>
          <p className="text-gray-600">You're successfully logged in.</p>
        </div>
      </div>
    </>
  )
}
