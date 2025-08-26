'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Footer from '@/components/common/footer';
import Navbar from '@/components/Navbar';
import API from '@/lib/axios';
import Image from 'next/image';
import Link from 'next/link';

export default function UserDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
    }
  }, [isAuthenticated]);

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const { data } = await API.get('/products');
      
      // Group products by category
      const groupedProducts = data.reduce((acc, product) => {
        const category = product.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        
        // Ensure we have a valid image URL
        let imageUrl = '/images/polo.png'; // default fallback
        if (product.image && product.image.startsWith('/')) {
          imageUrl = product.image;
        } else if (product.image && product.image.startsWith('http')) {
          imageUrl = product.image;
        }
        
        acc[category].push({
          id: product.id,
          name: product.name,
          src: imageUrl,
          label: category,
          price: `₱${product.price?.toFixed(2) || '0.00'}`,
          description: product.description,
          stock: product.stock
        });
        return acc;
      }, {});
      
      setProducts(groupedProducts);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
        <Navbar />

        {/* Welcome Banner */}
        <section className="bg-gradient-to-r from-[#000C50] to-[#1a237e] text-white py-8 mt-20">
          <div className="container mx-auto px-6">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-lg opacity-90">
              Student ID: {user?.student_id} • Role: {user?.role}
            </p>
          </div>
        </section>

        {/* Banner Section */}
        <section className="flex w-300 h-[400px] mt-8 mb-15 rounded-sm overflow-hidden shadow-md">
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
                Equip yourself for success, find everything you need to thrive in school, from study tools to personal essentials, all in one place.
              </p>
            </div>
          </div>
          <div className="w-2/5 bg-[#000C50] flex justify-center items-center">
            <Image src="/images/cpc.png" alt="CPC Logo" width={250} height={250} className="object-contain" />
          </div>
        </section>

        {/* Products Section */}
        <div className="p-6 space-y-10">
          {productsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#000C50] mx-auto"></div>
              <p className="mt-4 text-lg text-gray-600">Loading products...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 text-lg">{error}</p>
              <button 
                onClick={fetchProducts}
                className="mt-4 px-6 py-2 bg-[#000C50] text-white rounded hover:bg-[#1a237e] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : Object.keys(products).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No products available at the moment.</p>
            </div>
          ) : (
            Object.entries(products).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-4xl font-extrabold mb-6 mt-12 ml-10 text-[#000C50]">{category}</h3>
                <div className="px-6 sm:px-12 md:px-20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {items.map((item) => (
                      <Link
                        key={item.id}
                        href={`/products/${encodeURIComponent(item.name)}`}
                        className="block group"
                      >
                        <div className="w-full max-w-[280px] h-[380px] border rounded-lg p-4 shadow-lg hover:shadow-xl transition duration-300 text-left bg-white cursor-pointer transform hover:-translate-y-1 group-hover:border-[#000C50]">
                          <div className="relative h-48 mb-4 overflow-hidden rounded-md">
                            <Image
                              src={item.src}
                              alt={item.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                // Fallback to default image if the main image fails
                                e.target.src = '/images/polo.png';
                              }}
                            />
                            {item.stock <= 0 && (
                              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                Out of Stock
                              </div>
                            )}
                            {item.stock > 0 && item.stock <= 5 && (
                              <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                                Low Stock
                              </div>
                            )}
                          </div>
                          <p className="text-lg font-bold mb-2 text-black line-clamp-2 group-hover:text-[#000C50] transition-colors">
                            {item.name}
                          </p>
                          <span className="inline-block text-white bg-[#000C50] text-xs font-semibold px-3 py-1 rounded-full mb-2">
                            {item.label}
                          </span>
                          <p className="text-lg font-semibold text-[#000C50] mb-2">{item.price}</p>
                          {item.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                              Stock: {item.stock > 0 ? item.stock : 'Out of stock'}
                            </p>
                            <div className="text-xs text-[#000C50] font-medium group-hover:underline">
                              View Details →
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
