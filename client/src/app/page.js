import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-100">
      <h1 className="text-3xl font-bold">Welcome to the Student Portal</h1>
      <div className="flex gap-4 mt-6">
        <Link href="/signup">
          <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Sign Up</button>
        </Link>
        <Link href="/login">
          <button className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Log In</button>
        </Link>
      </div>
    </div>
  )
}
