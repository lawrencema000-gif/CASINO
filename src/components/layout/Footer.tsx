'use client'

import Link from 'next/link'
import {
  Crown,
  CreditCard,
  Wallet,
  Banknote,
  ShieldCheck,
} from 'lucide-react'

const footerLinks = [
  { name: 'About', href: '/about' },
  { name: 'Terms of Service', href: '/terms' },
  { name: 'Privacy Policy', href: '/privacy' },
  { name: 'Responsible Gaming', href: '/responsible-gaming' },
  { name: 'FAQ', href: '/faq' },
]

const paymentMethods = [
  { name: 'Card', icon: CreditCard },
  { name: 'Wallet', icon: Wallet },
  { name: 'Bank', icon: Banknote },
  { name: 'Secure', icon: ShieldCheck },
]

export default function Footer() {
  return (
    <footer className="bg-[var(--casino-surface)] border-t border-[var(--casino-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 mb-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Crown className="w-6 h-6 text-[var(--casino-accent)]" />
            <span className="text-lg font-extrabold text-gold-gradient">
              FORTUNA CASINO
            </span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[var(--casino-text-muted)] hover:text-[var(--casino-accent)] transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--casino-border)] my-6" />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Payment methods */}
          <div className="flex items-center gap-4">
            {paymentMethods.map((pm) => (
              <div
                key={pm.name}
                className="p-2 rounded-lg bg-[var(--casino-card)] border border-[var(--casino-border)]"
                title={pm.name}
              >
                <pm.icon className="w-5 h-5 text-[var(--casino-text-muted)]" />
              </div>
            ))}
          </div>

          {/* 18+ Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--casino-red)] flex items-center justify-center">
              <span className="text-xs font-bold text-[var(--casino-red)]">18+</span>
            </div>
            <p className="text-xs text-[var(--casino-text-muted)] max-w-xs">
              Gambling can be addictive. Please play responsibly.
            </p>
          </div>

          {/* Copyright */}
          <p className="text-xs text-[var(--casino-text-muted)]">
            &copy; {new Date().getFullYear()} Fortuna Casino. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
