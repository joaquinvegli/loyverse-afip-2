import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Loyverse Facturación',
  description: 'Sistema de facturación AFIP + Loyverse',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        className={`${inter.className} bg-gradient-to-br from-gray-100 via-white to-gray-200 min-h-screen text-gray-900`}
      >
        {children}
      </body>
    </html>
  );
}
