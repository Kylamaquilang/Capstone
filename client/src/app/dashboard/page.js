'use client';
import Footer from '@/components/common/footer';
import Navbar from '@/components/common/nav-bar';
import { products } from '@/data/products';
import Image from 'next/image';
import Link from 'next/link';

export default function UserDashboard() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Banner Section */}
      <section className="flex w-300 h-[400px] mt-20 mb-15 rounded-sm overflow-hidden shadow-md">
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
                  <Link
                    key={index}
                    href={`/products/${encodeURIComponent(item.name)}`} // ✅ Navigates to product detail page
                  >
                    <div className="w-[250px] h-[350px] border rounded-md p-4 shadow hover:shadow-lg transition duration-200 text-left bg-white cursor-pointer">
                      <Image
                        src={item.src}
                        alt={item.name}
                        width={200}
                        height={150}
                        className="mx-auto mb-4"
                      />
                      <p className="text-sm font-bold mb-1 ml-5 text-black">{item.name}</p>
                      <span className="inline-block text-white bg-[#000C50] text-xs font-semibold px-3 py-1 rounded-full mb-1 ml-5">
                        {item.label}
                      </span>
                      <p className="text-sm font-semibold mt-1 ml-5 text-black">{item.price}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Footer />
    </div>
  );
}
