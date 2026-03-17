'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, Search, Loader2, AlertTriangle, ArrowLeft,
  DollarSign, Check, X, Clock, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SearchResult {
  id: string
  username: string
  email?: string
  balance: number
  vip_tier: string
}

interface AdjustmentLog {
  id: string
  admin_id: string
  action: string
  target_type: string
  target_id: string
  details: {
    amount: number
    reason: string
    notes?: string
    previousBalance: number
    newBalance: number
    targetUsername: string
  }
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

export default function WalletManagementPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [isAdmin, setIsAdmin] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // Adjustment form
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('bonus')
  const [notes, setNotes] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [adjustResult, setAdjustResult] = useState<{ success: boolean; message: string } | null>(null)

  // Recent adjustments
  const [adjustments, setAdjustments] = useState<AdjustmentLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !user) return
    fetch('/api/admin/stats').then(res => {
      if (res.ok) setIsAdmin(true)
    }).catch(() => {})
  }, [authLoading, user])

  useEffect(() => {
    if (!isAdmin) return
    fetchRecentAdjustments()
  }, [isAdmin])

  const fetchRecentAdjustments = async () => {
    setLogsLoading(true)
    try {
      const res = await fetch('/api/admin/wallets/adjust')
      if (res.ok) {
        const data = await res.json()
        setAdjustments(data.adjustments || [])
      }
    } catch {
      console.error('Failed to fetch adjustments')
    } finally {
      setLogsLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, balance, vip_tier')
        .or(`username.ilike.%${searchQuery.trim()}%`)
        .limit(10)

      if (!error && data) {
        setSearchResults(data)
      }
    } catch {
      console.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleAdjust = async () => {
    if (!selectedUser || !amount) return
    setAdjusting(true)
    setAdjustResult(null)

    try {
      const res = await fetch('/api/admin/wallets/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: parseFloat(amount),
          reason,
          notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAdjustResult({ success: false, message: data.error || 'Failed' })
        return
      }
      setAdjustResult({
        success: true,
        message: `Balance: ${formatNumber(data.previousBalance)} -> ${formatNumber(data.newBalance)}`,
      })
      setSelectedUser(prev => prev ? { ...prev, balance: data.newBalance } : prev)
      fetchRecentAdjustments()
      setTimeout(() => {
        setAmount('')
        setNotes('')
        setAdjustResult(null)
      }, 2000)
    } catch {
      setAdjustResult({ success: false, message: 'Network error' })
    } finally {
      setAdjusting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
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
          <p className="text-gray-400 mb-6">You do not have permission to access wallet management.</p>
          <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
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
            <Link href="/admin" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[var(--gold)]" />
                Wallet Management
              </h1>
              <p className="text-sm text-gray-400">Search users and adjust balances</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Search & Adjust Section */}
          <div className="space-y-6">
            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5"
            >
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-[var(--gold)]" />
                Find User
              </h2>
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search by username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="px-5 py-2.5 bg-[var(--gold)] hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {searching && <Loader2 className="w-4 h-4 animate-spin" />}
                  Search
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${
                        selectedUser?.id === u.id
                          ? 'bg-[var(--gold)]/10 border border-[var(--gold)]/30'
                          : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'
                      }`}
                    >
                      <div>
                        <span className="font-medium">{u.username}</span>
                        <span className="text-xs text-gray-500 ml-2 capitalize">{u.vip_tier}</span>
                      </div>
                      <span className="text-[var(--gold)] font-medium">{formatNumber(u.balance)}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Adjustment Form */}
            <AnimatePresence>
              {selectedUser && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5"
                >
                  <h2 className="font-semibold mb-1 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[var(--gold)]" />
                    Adjust Balance
                  </h2>
                  <p className="text-sm text-gray-400 mb-4">
                    {selectedUser.username} &middot; Current balance: <span className="text-[var(--gold)]">{formatNumber(selectedUser.balance)}</span>
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Amount (positive = credit, negative = debit)</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g. 5000 or -1000"
                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Reason</label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
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
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional details..."
                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50"
                      />
                    </div>
                  </div>

                  {adjustResult && (
                    <div className={`mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                      adjustResult.success
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {adjustResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      {adjustResult.message}
                    </div>
                  )}

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => { setSelectedUser(null); setAdjustResult(null) }}
                      className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAdjust}
                      disabled={adjusting || !amount}
                      className="flex-1 px-4 py-2.5 bg-[var(--gold)] hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {adjusting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {adjusting ? 'Adjusting...' : 'Submit Adjustment'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recent Adjustments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--gold)]" />
                Recent Adjustments
              </h2>
              <span className="text-xs text-gray-500">Last 50</span>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {logsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-[var(--gold)] animate-spin" />
                </div>
              ) : adjustments.length === 0 ? (
                <div className="py-16 text-center text-gray-500 text-sm">No adjustments yet</div>
              ) : (
                <div className="divide-y divide-gray-800/50">
                  {adjustments.map(adj => {
                    const isCredit = adj.action === 'admin_credit'
                    return (
                      <div key={adj.id} className="px-5 py-3 hover:bg-gray-800/30 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">
                            {adj.details?.targetUsername || adj.target_id?.slice(0, 8)}
                          </span>
                          <span className={`flex items-center gap-1 font-medium text-sm ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
                            {isCredit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {isCredit ? '+' : ''}{formatNumber(adj.details?.amount || 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="capitalize">{adj.details?.reason || 'N/A'}</span>
                          <span>{timeAgo(adj.created_at)}</span>
                        </div>
                        {adj.details?.notes && (
                          <p className="text-xs text-gray-600 mt-1 truncate">{adj.details.notes}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
