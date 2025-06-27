'use client';
import Image from 'next/image';
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  BellIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline'; // ✅ Importing icons

const products = {
  "POLOS": [
    { name: "BSIT POLO", src: "/images/polo.png", label: "POLO", price: "₱450.00" },
    { name: "BSIT PEACH POLO", src: "/images/polo.png", label: "POLO", price: "₱450.00" },
    { name: "BSHM PEACH POLO", src: "/images/polo.png", label: "POLO", price: "₱450.00" },
    { name: "BSED PEACH POLO", src: "/images/polo.png", label: "POLO", price: "₱450.00" },
    { name: "BEED PEACH POLO", src: "/images/polo.png", label: "POLO", price: "₱450.00" },
  ],
  "LANYARDS & TELA": [
    { name: "BSHM LANYARD", src: "/images/id.jpg", label: "LANYARD", price: "₱120.00" },
    { name: "BSIT LANYARD", src: "/images/id.jpg", label: "LANYARD", price: "₱120.00" },
    { name: "BSED LANYARD", src: "/images/id.jpg", label: "LANYARD", price: "₱120.00" },
    { name: "BEED LANYARD", src: "/images/id.jpg", label: "LANYARD", price: "₱120.00" },
  ],
  "NSTP & PE": [
    { name: "NSTP Shirt", src: "/images/nstp.png", label: "NSTP", price: "₱380.00" },
    { name: "PE Pants", src: "/images/pe-pants.png", label: "PE", price: "₱400.00" },
    { name: "PE Shirt", src: "/images/pe-shirt.png", label: "PE", price: "₱350.00" },
  ]
};

export default function UserDashboard() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-[#000C50] text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/images/cpc.png" alt="Logo" width={40} height={40} />
        </div>
        <div className="flex justify-center items-center">
          <Image src="/images/logo1.png" alt="Logo" width={100} height={100} />
        </div>
        <div className="flex gap-4 items-center">
          <button><MagnifyingGlassIcon className="h-6 w-6 text-white" /></button>
          <button><BellIcon className="h-6 w-6 text-white" /></button>
          <button><ShoppingCartIcon className="h-6 w-6 text-white" /></button>
          <button><UserCircleIcon className="h-6 w-6 text-white" /></button>
        </div>
      </nav>

      {/* Banner Section */}
      <section className="flex w-300 h-[400px] mt-6 rounded-sm overflow-hidden shadow-md">
        <div className="relative w-3/4">
          <Image
            src="/images/school.png"
            alt="School Background"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[#000C50]/80 flex flex-col justify-center px-10 text-white">
            <h2 className="text-8xl font-extrabold ml-30">CPC</h2>
            <h2 className="text-8xl font-extrabold ml-45">ESSEN</h2>
            <p className="mt-3 text-sm max-w-md ml-30">
              Equip yourself for success, find everything you need to thrive in school, to school essentials, all in one place.
            </p>
          </div>
        </div>
        <div className="w-2/5 bg-[#000C50] flex justify-center items-center">
          <Image src="/images/cpc.png" alt="CPC Logo" width={250} height={250} className="object-contain" />
        </div>
      </section>

      {/* Product Sections */}
      <div className="p-6 space-y-10">
        {Object.entries(products).map(([category, items]) => (
          <div key={category}>
            <h3 className="text-4xl font-extrabold mb-6 mt-12 ml-10">{category}</h3>
            <div className="px-6 sm:px-12 md:px-20">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {items.map((item, index) => (
                  <button
                    key={index}
                    className="w-[250px] h-[350px] border rounded-md p-4 shadow hover:shadow-lg transition duration-200 text-left bg-white"
                  >
                    <Image
                      src={item.src}
                      alt={item.name}
                      width={200}
                      height={150}
                      className="mx-auto mb-4"
                    />
                    <p className="text-sm font-bold mb-1 ml-5">{item.name}</p>
                    <span className="inline-block text-white bg-[#000C50] text-xs font-semibold px-3 py-1 rounded-full mb-1 ml-5">
                      {item.label}
                    </span>
                    <p className="text-sm font-semibold mt-1 ml-5">{item.price}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="bg-[#000C50] text-white text-center py-3">
        ESSEN © 2024
      </footer>
    </div>
  );
}
