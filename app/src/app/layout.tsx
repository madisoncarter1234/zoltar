import type { Metadata } from 'next';
import { NEXT_PUBLIC_URL } from '../config';

import './global.css';
import '@coinbase/onchainkit/styles.css';
import '@rainbow-me/rainbowkit/styles.css';
import dynamic from 'next/dynamic';

const OnchainProviders = dynamic(
  () => import('src/components/OnchainProviders'),
  {
    ssr: false,
  },
);

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

export const metadata: Metadata = {
  title: 'Extract - Can You Outsmart Zoltar?',
  description: 'A mysterious oracle holds a secret. Ask questions, make guesses, win the pot.',
  openGraph: {
    title: 'Extract - Can You Outsmart Zoltar?',
    description: 'A mysterious oracle holds a secret. Ask questions, make guesses, win the pot.',
    images: [`${NEXT_PUBLIC_URL}/og-image.png`],
  },
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white font-mono">
        <OnchainProviders>{children}</OnchainProviders>
      </body>
    </html>
  );
}
