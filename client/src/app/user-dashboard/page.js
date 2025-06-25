'use client';
import Image from 'next/image';

const products = {
  "POLOS": [
    { name: "Black Polo", src: "/images/black-polo.png" },
    { name: "Peach Polo (S)", src: "/images/peach-polo.png" },
    { name: "Peach Polo (M)", src: "/images/peach-polo.png" },
    { name: "Peach Polo (L)", src: "/images/peach-polo.png" },
    { name: "Peach Polo (XL)", src: "/images/peach-polo.png" },
  ],
  "LANYARDS & TELA": [
    { name: "Black Lanyard", src: "/images/black-lanyard.png" },
    { name: "Orange Lanyard", src: "/images/orange-lanyard.png" },
    { name: "Blue Lanyard", src: "/images/blue-lanyard.png" },
    { name: "Aqua Lanyard", src: "/images/aqua-lanyard.png" },
    { name: "Orange Tela", src: "/images/orange-tela.png" },
    { name: "Gray Tela", src: "/images/gray-tela.png" },
  ],
  "NSTP & PE": [
    { name: "NSTP Shirt", src: "/images/nstp-shirt.png" },
    { name: "PE Pants", src: "/images/pe-pants.png" },
    { name: "PE Shirt", src: "/images/pe-shirt.png" },
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
          <button>🔍</button>
          <button>👤</button>
        </div>
      </nav>

      {/* Banner Section */}
      <section className="flex w-300 h-[400px] mt-6 rounded-sm overflow-hidden shadow-md mt-9">
        {/* Left side with background image and overlay */}
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

        {/* Right side logo */}
        <div className="w-2/5 bg-[#000C50] flex justify-center items-center">
          <Image
            src="/images/cpc.png"
            alt="CPC Logo"
            width={250}
            height={250}
            className="object-contain"
          />
        </div>
      </section>

      {/* Product Sections */}
      <div className="p-6 space-y-10">
        {Object.entries(products).map(([category, items]) => (
          <div key={category}>
            <h3 className="text-xl font-bold mb-4">{category}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {items.map((item, index) => (
                <div key={index} className="border text-center p-2 rounded-md">
                  <Image src={item.src} alt={item.name} width={120} height={120} className="mx-auto mb-2" />
                  <p className="text-sm font-semibold">{item.name}</p>
                </div>
              ))}
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
