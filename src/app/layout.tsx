import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ClientProviders from '@/components/layout/ClientProviders'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FORTUNA CASINO - Where Fortune Favors the Bold',
  description:
    'Experience the ultimate online casino. Play Slots, Blackjack, Roulette, Poker, Crash, Plinko and more. Provably fair games with instant payouts.',
  keywords: ['casino', 'online gaming', 'slots', 'blackjack', 'roulette', 'poker', 'crash', 'plinko', 'fortuna'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fortuna Casino',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#FFD700" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className={`${inter.variable} antialiased min-h-screen flex flex-col`}>
        <ClientProviders>
          <Header />
          <main className="flex-1 relative z-10">{children}</main>
          <Footer />
        </ClientProviders>
      </body>
    </html>
  )
}
