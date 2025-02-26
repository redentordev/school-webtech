import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { SWRProvider } from '@/providers/SWRProvider';
import { S3ImageProvider } from '@/contexts/S3ImageContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Picwall',
  description: 'A modern Instagram clone built with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SWRProvider>
            <S3ImageProvider>
              <main>{children}</main>
            </S3ImageProvider>
          </SWRProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
