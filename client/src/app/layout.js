import { CartProvider } from '@/context/CartContext';
import { Montserrat } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata = {
  title: 'ESSEN Login',
  description: 'Login page for ESSEN system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={montserrat.className}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
