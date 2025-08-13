'use client';
import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

export default function AdminNavbar() {
  return (
    <nav className="bg-[#000C50] text-white p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Image src="/images/cpc.png" alt="Logo" width={40} height={40} />
      </div>
      <div className="flex justify-center items-center">
        <Image src="/images/logo1.png" alt="Logo" width={100} height={100} />
      </div>
      <div className="flex gap-4 items-center">
        <button><BellIcon className="h-6 w-6 text-white" /></button>
        <button><UserCircleIcon className="h-6 w-6 text-white" /></button>
      </div>
    </nav>
  );
}
