'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Gamepad2, TrendingUp, DollarSign,
  Shield, Clock, ArrowUpRight, ArrowDownRight,
  Loader2, AlertTriangle, Crown, BarChart3
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface RecentGame {
  id: string
  player_id: string
  player_username: string
  game_type: string
  bet_amount: number
  payout: number
  multiplier: number
  settled: boolean
  created_at: string
}

interface RecentSignup {
  id: string
  username: string
  balance: number
  level: number
  vip_tier: string
  created_at: string
}

interface AdminStats {
  totalUsers: number
  totalGamesPlayed: number
  totalWagered: number
  totalWon: number
  houseProfit: number
  recentGames: RecentGame[]
  recentSignups: RecentSignup[]
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const GAME_TYPE_COLORS: Record<string, string> = {
  slots: 'bg-purple-500/20 text-purple-400',
  blackjack: 'bg-green-500/20 text-green-400',
  roulette: 'bg-red-500/20 text-red-400',
  dice: 'bg-blue-500/20 text-blue-400',
  crash: 'bg-orange-500/20 text-orange-400',
  coinflip: 'bg-yellow-500/20 text-yellow-400',
  plinko: 'bg-pink-500/20 text-pink-400',
  poker: 'bg-emerald-500/20 text-emerald-400',
  mines: 'bg-amber-500/20 text-amber-400',
  keno: 'bg-cyan-500/20 text-cyan-400',
  limbo: 'bg-indigo-500/20 text-indigo-400',
  hilo: 'bg-teal-500/20 text-teal-400',
}

const VIP_COLORS: Record<string, string> = {
  bronze: 'text-[#cd7f32]',
  silver: 'text-gray-400',
  gold: 'text-[var(--gold)]',
  platinum: 'text-gray-300',
  diamond: 'text-cyan-400',
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = user?.email === 'admin@fortuna.casino'

  useEffect(() => {
    if (authLoading) return
    if (!user || !isAdmin) {
      setLoading(false)
      return
    }

    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats')
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to fetch stats')
        }
        const data = await res.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, isAdmin, authLoading])

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-[var(--gold)]" />
        </motion.div>
      </div>
    )
  }

  // Access denied
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            You do not have permission to access the admin dashboard.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Return Home
          </button>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      label: 'Total Users',
      value: formatNumber(stats.totalUsers),
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Games Played',
      value: formatNumber(stats.totalGamesPlayed),
      icon: Gamepad2,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Total Wagered',
      value: formatNumber(stats.totalWagered),
      icon: TrendingUp,
      color: 'from-[var(--gold)] to-yellow-600',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Total Won',
      value: formatNumber(stats.totalWon),
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'House Profit',
      value: formatNumber(stats.houseProfit),
      icon: BarChart3,
      color: stats.houseProfit >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600',
      bgColor: stats.houseProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--gold)] to-yellow-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-gray-400">Fortuna Casino Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Manage Users
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              Back to Casino
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`${card.bgColor} border border-gray-800 rounded-xl p-5`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">{card.label}</span>
                <card.icon className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Games Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-[var(--gold)]" />
                Recent Games
              </h2>
              <span className="text-xs text-gray-500">Last 20</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs uppercase border-b border-gray-800">
                    <th className="px-4 py-3 text-left">Player</th>
                    <th className="px-4 py-3 text-left">Game</th>
                    <th className="px-4 py-3 text-right">Bet</th>
                    <th className="px-4 py-3 text-right">Payout</th>
                    <th className="px-4 py-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentGames.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No games recorded yet
                      </td>
                    </tr>
                  ) : (
                    stats.recentGames.map((game) => {
                      const profit = game.payout - game.bet_amount
                      const isWin = profit > 0
                      return (
                        <tr
                          key={game.id}
                          className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium">{game.player_username}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                GAME_TYPE_COLORS[game.game_type] || 'bg-gray-500/20 text-gray-400'
                              }`}
                            >
                              {game.game_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300">
                            {formatNumber(game.bet_amount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`flex items-center justify-end gap-1 ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                              {isWin ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3" />
                              )}
                              {formatNumber(game.payout)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500 text-xs">
                            {timeAgo(game.created_at)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Recent Signups */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--gold)]" />
                Recent Signups
              </h2>
              <span className="text-xs text-gray-500">Last 10</span>
            </div>
            <div className="divide-y divide-gray-800/50">
              {stats.recentSignups.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No users yet
                </div>
              ) : (
                stats.recentSignups.map((signup) => (
                  <div
                    key={signup.id}
                    className="px-4 py-3 hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{signup.username}</span>
                      <span className={`text-xs capitalize ${VIP_COLORS[signup.vip_tier] || 'text-gray-400'}`}>
                        {signup.vip_tier}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Lvl {signup.level} &middot; {formatNumber(signup.balance)} credits</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(signup.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
