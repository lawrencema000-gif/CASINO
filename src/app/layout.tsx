import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Royal Casino - Online Gaming Platform',
  description:
    'Experience the thrill of Royal Casino. Play Slots, Blackjack, Roulette, Poker and more. Premium online gaming with provably fair games.',
  keywords: ['casino', 'online gaming', 'slots', 'blackjack', 'roulette', 'poker'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-1 relative z-10">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
