'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, TrendingUp, DollarSign, Users, Gamepad2,
  Loader2, ArrowLeft, AlertTriangle, Crown, UserPlus,
  Percent, Activity
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface DailyStat {
  date: string
  games: number
  wagered: number
  payout: number
  profit: number
}

interface DailySignup {
  date: string
  signups: number
}

interface GameType {
  type: string
  count: number
}

interface TopPlayer {
  username: string
  total_wagered: number
  total_won: number
  games_played: number
  vip_tier: string
}

interface VipDist {
  tier: string
  count: number
}

interface PeriodSummary {
  totalGames: number
  totalWagered: number
  totalPayout: number
  houseProfit: number
  houseEdge: string
  activeUsers: number
  newSignups: number
}

interface AnalyticsData {
  dailyStats: DailyStat[]
  dailySignups: DailySignup[]
  gameTypeBreakdown: GameType[]
  topPlayers: TopPlayer[]
  vipDistribution: VipDist[]
  periodSummary: PeriodSummary
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

const VIP_COLORS: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#9ca3af',
  gold: '#FFD700',
  platinum: '#e5e7eb',
  diamond: '#22d3ee',
}

const GAME_COLORS: Record<string, string> = {
  slots: '#a855f7',
  blackjack: '#22c55e',
  roulette: '#ef4444',
  dice: '#3b82f6',
  crash: '#f97316',
  coinflip: '#eab308',
  plinko: '#ec4899',
  poker: '#10b981',
  mines: '#f59e0b',
  keno: '#06b6d4',
  limbo: '#6366f1',
  hilo: '#14b8a6',
  lottery: '#8b5cf6',
  jackpot: '#f43f5e',
}

// Simple bar chart component
function BarChart({ data, valueKey, color = '#FFD700', height = 120 }: {
  data: { label: string; value: number }[]
  valueKey?: string
  color?: string
  height?: number
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => {
        const barH = (d.value / max) * height
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t transition-all group-hover:opacity-80 min-h-[2px]"
              style={{ height: barH, backgroundColor: color, opacity: 0.8 }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              {d.label}: {formatNumber(d.value)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    if (authLoading || !user) return
    fetch('/api/admin/stats').then(res => {
      if (res.ok) setIsAdmin(true)
    }).catch(() => {})
  }, [authLoading, user])

  useEffect(() => {
    if (!isAdmin) return
    setLoading(true)
    fetch(`/api/admin/analytics?days=${days}`)
      .then(res => res.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isAdmin, days])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <button onClick={() => router.push('/')} className="mt-4 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[var(--gold)]" />
                Analytics
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  days === d ? 'bg-[var(--gold)] text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading || !data ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {[
                { label: 'Games', value: formatNumber(data.periodSummary.totalGames), icon: Gamepad2, color: 'bg-purple-500/10' },
                { label: 'Wagered', value: formatNumber(data.periodSummary.totalWagered), icon: TrendingUp, color: 'bg-yellow-500/10' },
                { label: 'Payouts', value: formatNumber(data.periodSummary.totalPayout), icon: DollarSign, color: 'bg-green-500/10' },
                { label: 'Profit', value: formatNumber(data.periodSummary.houseProfit), icon: BarChart3, color: data.periodSummary.houseProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10' },
                { label: 'Edge', value: data.periodSummary.houseEdge + '%', icon: Percent, color: 'bg-blue-500/10' },
                { label: 'Active', value: formatNumber(data.periodSummary.activeUsers), icon: Activity, color: 'bg-cyan-500/10' },
                { label: 'Signups', value: formatNumber(data.periodSummary.newSignups), icon: UserPlus, color: 'bg-pink-500/10' },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`${card.color} border border-gray-800 rounded-xl p-4`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{card.label}</span>
                    <card.icon className="w-4 h-4 text-gray-500" />
                  </div>
                  <p className="text-lg font-bold">{card.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[var(--gold)]" />
                  Daily Revenue (Profit)
                </h2>
                <BarChart
                  data={data.dailyStats.map(d => ({
                    label: d.date.slice(5),
                    value: Math.max(0, d.profit),
                  }))}
                  color="#22c55e"
                  height={140}
                />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{data.dailyStats[0]?.date.slice(5)}</span>
                  <span>{data.dailyStats[data.dailyStats.length - 1]?.date.slice(5)}</span>
                </div>
              </motion.div>

              {/* Games Volume Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-purple-400" />
                  Daily Games Played
                </h2>
                <BarChart
                  data={data.dailyStats.map(d => ({
                    label: d.date.slice(5),
                    value: d.games,
                  }))}
                  color="#a855f7"
                  height={140}
                />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{data.dailyStats[0]?.date.slice(5)}</span>
                  <span>{data.dailyStats[data.dailyStats.length - 1]?.date.slice(5)}</span>
                </div>
              </motion.div>

              {/* Signups Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-pink-400" />
                  Daily Signups
                </h2>
                <BarChart
                  data={data.dailySignups.map(d => ({
                    label: d.date.slice(5),
                    value: d.signups,
                  }))}
                  color="#ec4899"
                  height={140}
                />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{data.dailySignups[0]?.date.slice(5)}</span>
                  <span>{data.dailySignups[data.dailySignups.length - 1]?.date.slice(5)}</span>
                </div>
              </motion.div>

              {/* Wagered Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--gold)]" />
                  Daily Wagered Volume
                </h2>
                <BarChart
                  data={data.dailyStats.map(d => ({
                    label: d.date.slice(5),
                    value: d.wagered,
                  }))}
                  color="#FFD700"
                  height={140}
                />
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{data.dailyStats[0]?.date.slice(5)}</span>
                  <span>{data.dailyStats[data.dailyStats.length - 1]?.date.slice(5)}</span>
                </div>
              </motion.div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Game Type Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Game Popularity
                </h2>
                <div className="space-y-2">
                  {data.gameTypeBreakdown.slice(0, 10).map(gt => {
                    const total = data.gameTypeBreakdown.reduce((s, g) => s + g.count, 0)
                    const pct = total > 0 ? (gt.count / total * 100) : 0
                    return (
                      <div key={gt.type} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 capitalize w-20 truncate">{gt.type}</span>
                        <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: GAME_COLORS[gt.type] || '#6b7280',
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-14 text-right">
                          {formatNumber(gt.count)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>

              {/* VIP Distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-[var(--gold)]" />
                  VIP Distribution
                </h2>
                <div className="space-y-3">
                  {['bronze', 'silver', 'gold', 'platinum', 'diamond'].map(tier => {
                    const entry = data.vipDistribution.find(v => v.tier === tier)
                    const count = entry?.count || 0
                    const total = data.vipDistribution.reduce((s, v) => s + v.count, 0)
                    const pct = total > 0 ? (count / total * 100) : 0
                    return (
                      <div key={tier} className="flex items-center gap-3">
                        <span className="text-xs capitalize w-16" style={{ color: VIP_COLORS[tier] }}>
                          {tier}
                        </span>
                        <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(pct, 1)}%`,
                              backgroundColor: VIP_COLORS[tier],
                              opacity: 0.7,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">
                          {count} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Top Players */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Top Players (by wagered)
                </h2>
                <div className="space-y-2">
                  {data.topPlayers.map((p, i) => (
                    <div key={p.username} className="flex items-center gap-3 text-sm">
                      <span className="text-xs text-gray-600 w-5">{i + 1}.</span>
                      <span className="flex-1 font-medium truncate">{p.username}</span>
                      <span className="text-xs capitalize" style={{ color: VIP_COLORS[p.vip_tier] || '#9ca3af' }}>
                        {p.vip_tier}
                      </span>
                      <span className="text-xs text-[var(--gold)] w-16 text-right">
                        {formatNumber(p.total_wagered)}
                      </span>
                    </div>
                  ))}
                  {data.topPlayers.length === 0 && (
                    <p className="text-sm text-gray-500">No players yet</p>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
