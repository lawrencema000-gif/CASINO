'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Coins,
  User,
  Volume2,
  VolumeX,
  Menu,
  X,
  ChevronDown,
  Trophy,
  Wallet,
  LogIn,
  UserPlus,
  Gamepad2,
  Dices,
  Spade,
  CircleDot,
  Rocket,
  Triangle,
  Crown,
  Gift,
  Zap,
  Bell,
} from 'lucide-react'
import BalanceDisplay from '../ui/BalanceDisplay'
import { useGameState } from '@/hooks/useGameState'

const mainNavLinks = [
  { name: 'Lobby', href: '/' },
  { name: 'Slots', href: '/games/slots' },
  { name: 'Blackjack', href: '/games/blackjack' },
  { name: 'Roulette', href: '/games/roulette' },
]

const moreGames = [
  { name: "Hold'em", href: '/games/holdem', icon: Crown },
  { name: 'Dice', href: '/games/dice', icon: Dices },
  { name: 'Crash', href: '/games/crash', icon: Rocket },
  { name: 'Plinko', href: '/games/plinko', icon: Triangle },
  { name: 'Poker', href: '/games/poker', icon: Spade },
  { name: 'Coin Flip', href: '/games/coinflip', icon: Coins },
]

const allGameLinks = [
  { name: 'Lobby', href: '/', icon: Gamepad2 },
  { name: 'Slots', href: '/games/slots', icon: Cherry },
  { name: 'Blackjack', href: '/games/blackjack', icon: Spade },
  { name: 'Roulette', href: '/games/roulette', icon: CircleDot },
  ...moreGames,
]

// Cherry icon isn't in the imports, using a functional workaround
function Cherry(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3l-1-6" />
      <path d="M14 17a5 5 0 0 0 10 0c0-2.76-2.5-5-5-3l-1-6" />
      <path d="M10 2c1 .5 2 2 2 5" />
      <path d="M14 2c-1 .5-2 2-2 5" />
    </svg>
  )
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const { profile, isMuted, toggleMute, fetchProfile, isLoading } = useGameState()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const isAuthed = !!profile
  const balance = profile?.balance ?? 10000

  // Fetch unread notification count for authenticated users
  useEffect(() => {
    if (!isAuthed) return
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications?unread=true&limit=1')
        const data = await res.json()
        if (res.ok) setUnreadCount(data.unread_count || 0)
      } catch { /* silent */ }
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [isAuthed])

  return (
    <header className="sticky top-0 z-50 w-full glass-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative">
              <Crown className="w-8 h-8 text-[var(--gold)] transition-transform group-hover:scale-110 group-hover:rotate-12" />
              <div className="absolute inset-0 blur-md bg-[var(--gold)]/20 rounded-full" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gold-gradient hidden sm:block">
              FORTUNA CASINO
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {mainNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                {link.name}
              </Link>
            ))}

            {/* More Games Dropdown */}
            <div className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                onBlur={() => setTimeout(() => setMoreOpen(false), 200)}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                More
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-52 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl overflow-hidden"
                  >
                    {moreGames.map((game) => (
                      <Link
                        key={game.href}
                        href={game.href}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <game.icon className="w-4 h-4 text-[var(--gold)]" />
                        {game.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* FREE PLAY badge when not logged in */}
            {!isLoading && !isAuthed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/30"
              >
                <Zap className="w-3.5 h-3.5 text-[var(--neon-green)]" />
                <span className="text-xs font-bold text-[var(--neon-green)]">FREE PLAY</span>
              </motion.div>
            )}

            {/* Balance */}
            <BalanceDisplay balance={balance} showAddFunds={isAuthed} size="sm" />

            {/* Notification Bell (authenticated users only) */}
            {isAuthed && (
              <Link
                href="/notifications"
                className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Notifications Bell */}
            {isAuthed && (
              <Link
                href="/notifications"
                className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
              >
                <Bell className="w-5 h-5" />
              </Link>
            )}

            {/* Mute Toggle */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Auth section */}
            {isAuthed ? (
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  onBlur={() => setTimeout(() => setProfileOpen(false), 200)}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)] flex items-center justify-center cursor-pointer hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-shadow"
                >
                  <User className="w-4 h-4 text-black" />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-56 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-[var(--border-color)]">
                        <p className="text-sm font-semibold text-white">{profile.username}</p>
                        <p className="text-xs text-[var(--text-secondary)] capitalize">{profile.vip_tier} VIP</p>
                      </div>
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        href="/wallet"
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Wallet className="w-4 h-4" />
                        Wallet
                      </Link>
                      <Link
                        href="/achievements"
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Trophy className="w-4 h-4 text-[var(--gold)]" />
                        Achievements
                      </Link>
                      <Link
                        href="/store"
                        className="flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Gift className="w-4 h-4 text-[var(--gold)]" />
                        Credit Store
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-white hover:border-[var(--gold)]/50 transition-all cursor-pointer">
                    <LogIn className="w-3.5 h-3.5" />
                    Login
                  </button>
                </Link>
                <Link href="/register">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-black hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all cursor-pointer">
                    <UserPlus className="w-3.5 h-3.5" />
                    Register
                  </button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
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
            transition={{ duration: 0.25 }}
            className="lg:hidden overflow-hidden border-t border-[var(--border-color)]"
          >
            <div className="p-4 space-y-1 max-h-[70vh] overflow-y-auto">
              {/* FREE PLAY badge mobile */}
              {!isAuthed && (
                <div className="flex items-center gap-2 px-4 py-3 mb-2 rounded-xl bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/20">
                  <Zap className="w-4 h-4 text-[var(--neon-green)]" />
                  <span className="text-sm font-bold text-[var(--neon-green)]">FREE PLAY MODE</span>
                  <span className="text-xs text-[var(--text-secondary)] ml-auto">Demo Credits</span>
                </div>
              )}

              {allGameLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-3 text-sm rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  <link.icon className="w-4 h-4 text-[var(--gold)]" />
                  {link.name}
                </Link>
              ))}

              {!isAuthed && (
                <div className="flex gap-2 pt-3 mt-2 border-t border-[var(--border-color)]">
                  <Link href="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <button className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-xl text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-white hover:border-[var(--gold)]/50 transition-all cursor-pointer">
                      <LogIn className="w-4 h-4" />
                      Login
                    </button>
                  </Link>
                  <Link href="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <button className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-black cursor-pointer">
                      <UserPlus className="w-4 h-4" />
                      Register
                    </button>
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
