'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Crown,
  Menu,
  X,
  ChevronDown,
  User,
  LogIn,
  UserPlus,
  Gamepad2,
  Dices,
  Spade,
  CircleDot,
  Rocket,
  Gift,
} from 'lucide-react'
import BalanceDisplay from '../ui/BalanceDisplay'
import Button from '../ui/Button'

const gameLinks = [
  { name: 'Slots', href: '/games/slots', icon: Gamepad2 },
  { name: 'Blackjack', href: '/games/blackjack', icon: Spade },
  { name: 'Roulette', href: '/games/roulette', icon: CircleDot },
  { name: 'Dice', href: '/games/dice', icon: Dices },
  { name: 'Crash', href: '/games/crash', icon: Rocket },
]

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [gamesOpen, setGamesOpen] = useState(false)
  // Mock auth state
  const [isAuthed] = useState(false)
  const [balance] = useState(1250.0)

  return (
    <header className="sticky top-0 z-40 w-full glass-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <Crown className="w-8 h-8 text-[var(--casino-accent)] transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 blur-md bg-[var(--casino-accent)]/20 rounded-full" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gold-gradient hidden sm:block">
              ROYAL CASINO
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-[var(--casino-text-muted)] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              Lobby
            </Link>

            {/* Games Dropdown */}
            <div className="relative">
              <button
                onClick={() => setGamesOpen(!gamesOpen)}
                onBlur={() => setTimeout(() => setGamesOpen(false), 150)}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-[var(--casino-text-muted)] hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                Games
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${gamesOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {gamesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-52 rounded-xl bg-[var(--casino-card)] border border-[var(--casino-border)] shadow-2xl overflow-hidden"
                  >
                    {gameLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--casino-text-muted)] hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <link.icon className="w-4 h-4 text-[var(--casino-accent)]" />
                        {link.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              href="/promotions"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--casino-text-muted)] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <Gift className="w-4 h-4" />
              Promotions
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthed ? (
              <>
                <BalanceDisplay balance={balance} showAddFunds size="sm" />
                <button className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--casino-accent)] to-[#a07d1a] flex items-center justify-center cursor-pointer">
                  <User className="w-4 h-4 text-black" />
                </button>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" icon={<LogIn className="w-4 h-4" />}>
                    Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />}>
                    Register
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-[var(--casino-text-muted)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-[var(--casino-border)]"
          >
            <div className="p-4 space-y-1">
              <Link
                href="/"
                className="block px-4 py-3 text-sm rounded-lg text-[var(--casino-text-muted)] hover:text-white hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                Lobby
              </Link>
              {gameLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-3 text-sm rounded-lg text-[var(--casino-text-muted)] hover:text-white hover:bg-white/5"
                  onClick={() => setMobileOpen(false)}
                >
                  <link.icon className="w-4 h-4 text-[var(--casino-accent)]" />
                  {link.name}
                </Link>
              ))}
              <Link
                href="/promotions"
                className="flex items-center gap-3 px-4 py-3 text-sm rounded-lg text-[var(--casino-text-muted)] hover:text-white hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                <Gift className="w-4 h-4 text-[var(--casino-accent)]" />
                Promotions
              </Link>
              {!isAuthed && (
                <div className="flex gap-2 pt-3 border-t border-[var(--casino-border)]">
                  <Link href="/auth/login" className="flex-1">
                    <Button variant="ghost" size="sm" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link href="/auth/register" className="flex-1">
                    <Button variant="primary" size="sm" className="w-full">
                      Register
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
