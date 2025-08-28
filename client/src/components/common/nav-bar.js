'use client';
import Image from 'next/image';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  BellIcon,
  ShoppingCartIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

export default function Navbar() {
  return (
    <nav className="bg-[#000C50] text-white p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Image src="/images/cpc.png" alt="Logo" width={40} height={40} />
        </Link>
      </div>
      <div className="flex justify-center items-center ml-23">
        <Image src="/images/logo1.png" alt="Logo" width={100} height={100} />
      </div>
      <div className="flex gap-4 items-center">
        <button><MagnifyingGlassIcon className="h-6 w-6 text-white" /></button>
        <Link href="/notification"><BellIcon className="h-6 w-6 text-white" /></Link>
        <Link href="/cart"><ShoppingCartIcon className="h-6 w-6 text-white" /></Link>
        <Link href="/user-profile"><UserCircleIcon className="h-6 w-6 text-white" /></Link>
      </div>
    </nav>
  );
}
