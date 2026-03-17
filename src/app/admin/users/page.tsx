'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, ChevronLeft, ChevronRight, Loader2,
  AlertTriangle, Shield, DollarSign, ArrowLeft,
  TrendingUp, Gamepad2, Clock, Crown, Check, X
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  username: string
  balance: number
  total_wagered: number
  total_won: number
  games_played: number
  level: number
  vip_tier: string
  created_at: string
}

interface UserGame {
  id: string
  game_type: string
  bet_amount: number
  payout: number
  multiplier: number
  settled: boolean
  created_at: string
}

interface UserTransaction {
  id: string
  type: string
  amount: number
  balance_after: number
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

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (authLoading || !user) return
    fetch('/api/admin/stats').then(res => {
      if (res.ok) setIsAdmin(true)
    }).catch(() => {})
  }, [authLoading, user])

  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Expanded user details
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [userGames, setUserGames] = useState<UserGame[]>([])
  const [userTransactions, setUserTransactions] = useState<UserTransaction[]>([])
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Balance adjustment
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [adjustResult, setAdjustResult] = useState<{ success: boolean; message: string } | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }
      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch {
      console.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [page, searchQuery])

  useEffect(() => {
    if (authLoading || !isAdmin) return
    fetchUsers()
  }, [authLoading, isAdmin, fetchUsers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const toggleExpand = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null)
      return
    }

    setExpandedUserId(userId)
    setDetailsLoading(true)

    try {
      const [gamesRes, txRes] = await Promise.all([
        supabase
          .from('games')
          .select('id, game_type, bet_amount, payout, multiplier, settled, created_at')
          .eq('player_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('transactions')
          .select('id, type, amount, balance_after, created_at')
          .eq('player_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      setUserGames(gamesRes.data || [])
      setUserTransactions(txRes.data || [])
    } catch {
      console.error('Failed to fetch user details')
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleAdjustBalance = async () => {
    if (!adjustUserId || !adjustAmount) return

    setAdjusting(true)
    setAdjustResult(null)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adjustUserId,
          amount: parseFloat(adjustAmount),
          reason: adjustReason || 'Admin adjustment',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setAdjustResult({ success: false, message: data.error || 'Failed' })
        return
      }

      setAdjustResult({
        success: true,
        message: `Balance updated: ${formatNumber(data.previousBalance)} -> ${formatNumber(data.newBalance)}`,
      })

      // Refresh user list to reflect change
      setUsers((prev) =>
        prev.map((u) =>
          u.id === adjustUserId ? { ...u, balance: data.newBalance } : u
        )
      )

      // Reset form after success
      setTimeout(() => {
        setAdjustUserId(null)
        setAdjustAmount('')
        setAdjustReason('')
        setAdjustResult(null)
      }, 2000)
    } catch {
      setAdjustResult({ success: false, message: 'Network error' })
    } finally {
      setAdjusting(false)
    }
  }

  // Loading / auth states
  if (authLoading) {
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
            You do not have permission to access user management.
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">User Management</h1>
              <p className="text-sm text-gray-400">{total} total users</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[var(--gold)] hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        {/* Users Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[var(--gold)] animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              No users found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 text-xs uppercase border-b border-gray-800">
                      <th className="px-4 py-3 text-left">Username</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-right">Wagered</th>
                      <th className="px-4 py-3 text-center">Level</th>
                      <th className="px-4 py-3 text-center">VIP</th>
                      <th className="px-4 py-3 text-right">Joined</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <motion.tr
                        key={u.id}
                        layout
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(u.id)}
                      >
                        <td className="px-4 py-3 font-medium">{u.username}</td>
                        <td className="px-4 py-3 text-right text-[var(--gold)]">
                          {formatNumber(u.balance)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {formatNumber(u.total_wagered)}
                        </td>
                        <td className="px-4 py-3 text-center">{u.level}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              VIP_COLORS[u.vip_tier] || 'text-gray-400 bg-gray-400/10'
                            }`}
                          >
                            {u.vip_tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setAdjustUserId(u.id)
                              setAdjustAmount('')
                              setAdjustReason('')
                              setAdjustResult(null)
                            }}
                            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors"
                          >
                            Adjust Balance
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Expanded User Details */}
              <AnimatePresence>
                {expandedUserId && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-800 bg-gray-900/50 overflow-hidden"
                  >
                    <div className="p-6">
                      {detailsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 text-[var(--gold)] animate-spin" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Game History */}
                          <div>
                            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                              <Gamepad2 className="w-4 h-4" />
                              Recent Games
                            </h3>
                            {userGames.length === 0 ? (
                              <p className="text-gray-500 text-sm">No games played</p>
                            ) : (
                              <div className="space-y-2">
                                {userGames.map((g) => {
                                  const profit = g.payout - g.bet_amount
                                  return (
                                    <div
                                      key={g.id}
                                      className="flex items-center justify-between text-sm bg-gray-800/50 rounded-lg px-3 py-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="capitalize text-gray-300">{g.game_type}</span>
                                        <span className="text-gray-500">
                                          {formatNumber(g.bet_amount)} bet
                                        </span>
                                      </div>
                                      <span
                                        className={profit >= 0 ? 'text-green-400' : 'text-red-400'}
                                      >
                                        {profit >= 0 ? '+' : ''}{formatNumber(profit)}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* Transactions */}
                          <div>
                            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              Recent Transactions
                            </h3>
                            {userTransactions.length === 0 ? (
                              <p className="text-gray-500 text-sm">No transactions</p>
                            ) : (
                              <div className="space-y-2">
                                {userTransactions.map((tx) => {
                                  const info = TX_TYPE_LABELS[tx.type] || {
                                    label: tx.type,
                                    color: 'text-gray-400',
                                  }
                                  return (
                                    <div
                                      key={tx.id}
                                      className="flex items-center justify-between text-sm bg-gray-800/50 rounded-lg px-3 py-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className={info.color}>{info.label}</span>
                                        <span className="text-gray-500">{timeAgo(tx.created_at)}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-gray-300">{formatNumber(tx.amount)}</span>
                                        <span className="text-gray-500 text-xs ml-2">
                                          bal: {formatNumber(tx.balance_after)}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Balance Adjustment Modal */}
      <AnimatePresence>
        {adjustUserId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setAdjustUserId(null)
              setAdjustResult(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-lg font-bold mb-1">Adjust Balance</h3>
              <p className="text-sm text-gray-400 mb-4">
                User: {users.find((u) => u.id === adjustUserId)?.username || 'Unknown'}
                {' '}&middot;{' '}
                Current: {formatNumber(users.find((u) => u.id === adjustUserId)?.balance || 0)}
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Amount (positive = credit, negative = debit)
                  </label>
                  <input
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="e.g. 5000 or -1000"
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Reason (optional)</label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Bonus, correction, etc."
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50"
                  />
                </div>
              </div>

              {adjustResult && (
                <div
                  className={`mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                    adjustResult.success
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {adjustResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  {adjustResult.message}
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => {
                    setAdjustUserId(null)
                    setAdjustResult(null)
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustBalance}
                  disabled={adjusting || !adjustAmount}
                  className="flex-1 px-4 py-2.5 bg-[var(--gold)] hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {adjusting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {adjusting ? 'Adjusting...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
