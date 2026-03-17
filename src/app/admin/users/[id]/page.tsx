'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Loader2, AlertTriangle, Shield, DollarSign,
  Gamepad2, Clock, Crown, User, Mail, Calendar, CreditCard,
  Ban, Lock, ChevronDown, Check, X, TrendingUp, TrendingDown
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  username: string
  email?: string
  balance: number
  total_wagered: number
  total_won: number
  games_played: number
  level: number
  xp: number
  vip_tier: string
  role: string
  status?: string
  created_at: string
  last_login?: string
  avatar_url?: string
}

interface GameRecord {
  id: string
  game_type: string
  bet_amount: number
  payout: number
  multiplier: number
  settled: boolean
  created_at: string
}

interface TransactionRecord {
  id: string
  type: string
  amount: number
  balance_after: number
  description?: string
  created_at: string
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

const VIP_TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond']

const VIP_COLORS: Record<string, string> = {
  bronze: 'text-[#cd7f32] bg-[#cd7f32]/10',
  silver: 'text-gray-400 bg-gray-400/10',
  gold: 'text-[var(--gold)] bg-yellow-500/10',
  platinum: 'text-gray-300 bg-gray-300/10',
  diamond: 'text-cyan-400 bg-cyan-400/10',
}

const TX_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  deposit: { label: 'Deposit', color: 'text-green-400' },
  withdrawal: { label: 'Withdrawal', color: 'text-red-400' },
  bet: { label: 'Bet', color: 'text-orange-400' },
  win: { label: 'Win', color: 'text-emerald-400' },
  admin_credit: { label: 'Admin Credit', color: 'text-blue-400' },
  admin_debit: { label: 'Admin Debit', color: 'text-red-400' },
  bonus: { label: 'Bonus', color: 'text-purple-400' },
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

export default function UserDetailPage() {
  const { user: authUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const supabase = createClient()

  const [isAdmin, setIsAdmin] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [games, setGames] = useState<GameRecord[]>([])
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action states
  const [actionModal, setActionModal] = useState<string | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('bonus')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [newVipTier, setNewVipTier] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (authLoading || !authUser) return
    fetch('/api/admin/stats').then(res => {
      if (res.ok) setIsAdmin(true)
    }).catch(() => {})
  }, [authLoading, authUser])

  const fetchUserData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [profileRes, gamesRes, txRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        supabase
          .from('games')
          .select('id, game_type, bet_amount, payout, multiplier, settled, created_at')
          .eq('player_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('transactions')
          .select('id, type, amount, balance_after, description, created_at')
          .eq('player_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (profileRes.error || !profileRes.data) {
        setError('User not found')
        return
      }

      setProfile(profileRes.data as UserProfile)
      setGames(gamesRes.data || [])
      setTransactions(txRes.data || [])
    } catch {
      setError('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    if (authLoading || !isAdmin) return
    fetchUserData()
  }, [authLoading, isAdmin, fetchUserData])

  const handleAdjustBalance = async () => {
    if (!adjustAmount) return
    setActionLoading(true)
    setActionResult(null)
    try {
      const res = await fetch('/api/admin/wallets/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: parseFloat(adjustAmount),
          reason: adjustReason,
          notes: adjustNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionResult({ success: false, message: data.error || 'Failed' })
        return
      }
      setActionResult({
        success: true,
        message: `Balance: ${formatNumber(data.previousBalance)} -> ${formatNumber(data.newBalance)}`,
      })
      setProfile(prev => prev ? { ...prev, balance: data.newBalance } : prev)
      setTimeout(() => {
        setActionModal(null)
        setActionResult(null)
        setAdjustAmount('')
        setAdjustNotes('')
      }, 1500)
    } catch {
      setActionResult({ success: false, message: 'Network error' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspendUser = async () => {
    setActionLoading(true)
    setActionResult(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'suspend' }),
      })
      if (res.ok) {
        setActionResult({ success: true, message: 'User suspended' })
        setProfile(prev => prev ? { ...prev, status: 'suspended' } : prev)
      } else {
        const data = await res.json()
        setActionResult({ success: false, message: data.error || 'Failed' })
      }
    } catch {
      setActionResult({ success: false, message: 'Network error' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleBanUser = async () => {
    setActionLoading(true)
    setActionResult(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'ban' }),
      })
      if (res.ok) {
        setActionResult({ success: true, message: 'User banned' })
        setProfile(prev => prev ? { ...prev, status: 'banned' } : prev)
      } else {
        const data = await res.json()
        setActionResult({ success: false, message: data.error || 'Failed' })
      }
    } catch {
      setActionResult({ success: false, message: 'Network error' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangeVipTier = async () => {
    if (!newVipTier) return
    setActionLoading(true)
    setActionResult(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'change_vip', vipTier: newVipTier }),
      })
      if (res.ok) {
        setActionResult({ success: true, message: `VIP tier changed to ${newVipTier}` })
        setProfile(prev => prev ? { ...prev, vip_tier: newVipTier } : prev)
      } else {
        const data = await res.json()
        setActionResult({ success: false, message: data.error || 'Failed' })
      }
    } catch {
      setActionResult({ success: false, message: 'Network error' })
    } finally {
      setActionLoading(false)
    }
  }

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
  if (!authUser || !isAdmin) {
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
          <p className="text-gray-400 mb-6">You do not have permission to view this page.</p>
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

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400">{error || 'User not found'}</p>
          <Link href="/admin/users" className="inline-block mt-4 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
            Back to Users
          </Link>
        </div>
      </div>
    )
  }

  const profitLoss = (profile.total_won || 0) - (profile.total_wagered || 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/users" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                {profile.username}
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${VIP_COLORS[profile.vip_tier] || 'text-gray-400 bg-gray-400/10'}`}>
                  {profile.vip_tier}
                </span>
              </h1>
              <p className="text-sm text-gray-400">User Detail</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setActionModal('adjust'); setActionResult(null) }}
              className="px-3 py-1.5 bg-[var(--gold)]/20 hover:bg-[var(--gold)]/30 text-[var(--gold)] rounded-lg text-xs transition-colors flex items-center gap-1.5"
            >
              <DollarSign className="w-3.5 h-3.5" /> Adjust Balance
            </button>
            <button
              onClick={() => { setActionModal('vip'); setNewVipTier(profile.vip_tier); setActionResult(null) }}
              className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs transition-colors flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5" /> Change VIP
            </button>
            <button
              onClick={() => { setActionModal('suspend'); setActionResult(null) }}
              className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" /> Suspend
            </button>
            <button
              onClick={() => { setActionModal('ban'); setActionResult(null) }}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs transition-colors flex items-center gap-1.5"
            >
              <Ban className="w-3.5 h-3.5" /> Ban
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--gold)] to-yellow-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-900" />
              </div>
              <div>
                <p className="font-bold text-lg">{profile.username}</p>
                <p className="text-xs text-gray-500">{profile.email || profile.id.slice(0, 8) + '...'}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Joined</span>
                <span>{new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Last Login</span>
                <span>{profile.last_login ? timeAgo(profile.last_login) : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Role</span>
                <span className="capitalize">{profile.role || 'user'}</span>
              </div>
              {profile.status && profile.status !== 'active' && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className={`capitalize ${profile.status === 'banned' ? 'text-red-400' : 'text-orange-400'}`}>
                    {profile.status}
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-yellow-500/10 border border-gray-800 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Balance</span>
              <CreditCard className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-3xl font-bold text-[var(--gold)]">{formatNumber(profile.balance)}</p>
            <p className="text-xs text-gray-500 mt-1">credits</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-blue-500/10 border border-gray-800 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Total Wagered</span>
              <TrendingUp className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-2xl font-bold">{formatNumber(profile.total_wagered || 0)}</p>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Games: {profile.games_played || 0}</span>
              <span>Level {profile.level}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`${profitLoss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'} border border-gray-800 rounded-xl p-5`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Player P/L</span>
              {profitLoss >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className={`text-2xl font-bold ${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {profitLoss >= 0 ? '+' : ''}{formatNumber(profitLoss)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Won {formatNumber(profile.total_won || 0)} total
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Game History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-[var(--gold)]" />
                Game History
              </h2>
              <span className="text-xs text-gray-500">Last 50</span>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-900">
                  <tr className="text-gray-400 text-xs uppercase border-b border-gray-800">
                    <th className="px-4 py-3 text-left">Game</th>
                    <th className="px-4 py-3 text-right">Bet</th>
                    <th className="px-4 py-3 text-right">Payout</th>
                    <th className="px-4 py-3 text-right">Multi</th>
                    <th className="px-4 py-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {games.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No games played</td>
                    </tr>
                  ) : (
                    games.map((g) => {
                      const profit = g.payout - g.bet_amount
                      const isWin = profit > 0
                      return (
                        <tr key={g.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${GAME_TYPE_COLORS[g.game_type] || 'bg-gray-500/20 text-gray-400'}`}>
                              {g.game_type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-300">{formatNumber(g.bet_amount)}</td>
                          <td className={`px-4 py-2.5 text-right ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                            {formatNumber(g.payout)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-400">{g.multiplier?.toFixed(2)}x</td>
                          <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{timeAgo(g.created_at)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Transaction History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[var(--gold)]" />
                Transaction History
              </h2>
              <span className="text-xs text-gray-500">Last 50</span>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-900">
                  <tr className="text-gray-400 text-xs uppercase border-b border-gray-800">
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No transactions</td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const info = TX_TYPE_LABELS[tx.type] || { label: tx.type, color: 'text-gray-400' }
                      return (
                        <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <span className={`font-medium ${info.color}`}>{info.label}</span>
                            {tx.description && (
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">{tx.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-300">{formatNumber(tx.amount)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-400">{formatNumber(tx.balance_after)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{timeAgo(tx.created_at)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Action Modals */}
      <AnimatePresence>
        {actionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => { setActionModal(null); setActionResult(null) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full"
            >
              {actionModal === 'adjust' && (
                <>
                  <h3 className="text-lg font-bold mb-1">Adjust Balance</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    User: {profile.username} &middot; Current: {formatNumber(profile.balance)}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Amount (positive = credit, negative = debit)</label>
                      <input
                        type="number"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        placeholder="e.g. 5000 or -1000"
                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Reason</label>
                      <select
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]/50"
                      >
                        <option value="bonus">Bonus</option>
                        <option value="correction">Correction</option>
                        <option value="refund">Refund</option>
                        <option value="promotional">Promotional</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
                      <input
                        type="text"
                        value={adjustNotes}
                        onChange={(e) => setAdjustNotes(e.target.value)}
                        placeholder="Additional details..."
                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50"
                      />
                    </div>
                  </div>
                </>
              )}

              {actionModal === 'vip' && (
                <>
                  <h3 className="text-lg font-bold mb-1">Change VIP Tier</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    User: {profile.username} &middot; Current: {profile.vip_tier}
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {VIP_TIERS.map(tier => (
                      <button
                        key={tier}
                        onClick={() => setNewVipTier(tier)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium capitalize transition-all border ${
                          newVipTier === tier
                            ? 'border-[var(--gold)] bg-[var(--gold)]/10'
                            : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
                        } ${VIP_COLORS[tier]?.split(' ')[0] || 'text-gray-400'}`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {actionModal === 'suspend' && (
                <>
                  <h3 className="text-lg font-bold mb-1 text-orange-400">Suspend User</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Are you sure you want to suspend <strong>{profile.username}</strong>?
                    They will not be able to play or access their account.
                  </p>
                </>
              )}

              {actionModal === 'ban' && (
                <>
                  <h3 className="text-lg font-bold mb-1 text-red-400">Ban User</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Are you sure you want to permanently ban <strong>{profile.username}</strong>?
                    This action is difficult to reverse.
                  </p>
                </>
              )}

              {actionResult && (
                <div
                  className={`mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                    actionResult.success
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {actionResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  {actionResult.message}
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => { setActionModal(null); setActionResult(null) }}
                  className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (actionModal === 'adjust') handleAdjustBalance()
                    else if (actionModal === 'vip') handleChangeVipTier()
                    else if (actionModal === 'suspend') handleSuspendUser()
                    else if (actionModal === 'ban') handleBanUser()
                  }}
                  disabled={actionLoading || (actionModal === 'adjust' && !adjustAmount)}
                  className={`flex-1 px-4 py-2.5 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    actionModal === 'ban'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : actionModal === 'suspend'
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-[var(--gold)] hover:bg-yellow-600 text-gray-900'
                  }`}
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
