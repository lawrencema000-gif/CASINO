'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown,
  Trophy, DollarSign, Filter, ChevronLeft, ChevronRight, Gamepad2,
  ArrowLeft, Gift, Flame, Loader2, CheckCircle2, Coins
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type TransactionType = 'bet' | 'win' | 'deposit' | 'withdrawal' | 'bonus'

interface Transaction {
  id: string
  type: TransactionType
  amount: number
  balance_after: number
  game_id: string | null
  description: string | null
  created_at: string
}

interface DailyBonusData {
  day_streak: number
  last_claimed: string
  bonus_amount: number
}

const typeConfig: Record<TransactionType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  bet: { label: 'Bet', icon: <Gamepad2 className="w-3.5 h-3.5" />, color: 'text-[var(--casino-red)]', bg: 'bg-[var(--casino-red)]/10' },
  win: { label: 'Win', icon: <Trophy className="w-3.5 h-3.5" />, color: 'text-[var(--casino-green)]', bg: 'bg-[var(--casino-green)]/10' },
  deposit: { label: 'Deposit', icon: <ArrowDownCircle className="w-3.5 h-3.5" />, color: 'text-[var(--casino-blue)]', bg: 'bg-[var(--casino-blue)]/10' },
  withdrawal: { label: 'Withdrawal', icon: <ArrowUpCircle className="w-3.5 h-3.5" />, color: 'text-[var(--casino-accent)]', bg: 'bg-[var(--casino-accent)]/10' },
  bonus: { label: 'Bonus', icon: <DollarSign className="w-3.5 h-3.5" />, color: 'text-[var(--casino-purple-light)]', bg: 'bg-[var(--casino-purple)]/10' },
}

const DEPOSIT_OPTIONS = [1000, 5000, 10000, 50000]

export default function WalletPage() {
  const router = useRouter()
  const { user, refreshProfile } = useAuth()
  const { balance, purchasedBalance, bonusBalance, refreshBalance } = useBalance(user?.id)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(true)
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [showDepositSuccess, setShowDepositSuccess] = useState(false)
  const [depositingAmount, setDepositingAmount] = useState<number | null>(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

  // Daily bonus state
  const [dailyBonus, setDailyBonus] = useState<DailyBonusData | null>(null)
  const [canClaimBonus, setCanClaimBonus] = useState(false)
  const [claimingBonus, setClaimingBonus] = useState(false)

  const perPage = 8

  // Fetch transactions from Supabase
  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTxLoading(false)
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from('transactions')
      .select('id, type, amount, balance_after, game_id, description, created_at')
      .eq('player_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) setTransactions(data as Transaction[])
    setTxLoading(false)
  }, [user])

  // Fetch daily bonus info
  const fetchDailyBonus = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch('/api/bonus')
      const data = await res.json()
      if (res.ok) {
        setDailyBonus({ day_streak: data.streak, last_claimed: data.last_collected || '', bonus_amount: 0 })
        setCanClaimBonus(data.can_collect)
      }
    } catch (err) {
      console.error('Bonus fetch error:', err)
    }
  }, [user])

  useEffect(() => {
    fetchTransactions()
    fetchDailyBonus()
  }, [fetchTransactions, fetchDailyBonus])

  const filtered = useMemo(() => {
    return filterType === 'all' ? transactions : transactions.filter((t) => t.type === filterType)
  }, [transactions, filterType])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)

  // Stats
  const stats = useMemo(() => {
    const totalWagered = transactions.filter((t) => t.type === 'bet').reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const totalWon = transactions.filter((t) => t.type === 'win').reduce((sum, t) => sum + t.amount, 0)
    const netProfit = totalWon - totalWagered
    const biggestWin = Math.max(0, ...transactions.filter((t) => t.type === 'win').map((t) => t.amount))
    return { totalWagered, totalWon, netProfit, biggestWin }
  }, [transactions])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // Handle deposit (play money)
  const handleDeposit = async (amount: number) => {
    if (!user) return
    setDepositingAmount(amount)
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deposit', amount })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      refreshBalance()
      await fetchTransactions()
      setShowDepositSuccess(true)
      setTimeout(() => setShowDepositSuccess(false), 2000)
    } catch (err) {
      console.error('Deposit error:', err)
    } finally {
      setDepositingAmount(null)
    }
  }

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!user) return
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0 || amount > balance) return
    setWithdrawing(true)
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'withdraw', amount: Math.floor(amount) })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      refreshBalance()
      await fetchTransactions()
      setWithdrawAmount('')
    } catch (err) {
      console.error('Withdraw error:', err)
    } finally {
      setWithdrawing(false)
    }
  }

  // Handle claim daily bonus
  const handleClaimBonus = async () => {
    if (!user || !canClaimBonus) return
    setClaimingBonus(true)
    try {
      const res = await fetch('/api/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'collect' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      refreshBalance()
      await fetchTransactions()
      await fetchDailyBonus()
      setCanClaimBonus(false)
    } catch (err) {
      console.error('Bonus claim error:', err)
    } finally {
      setClaimingBonus(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-[var(--casino-text-muted)] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Wallet className="w-7 h-7 text-[var(--casino-accent)]" />
          <h1 className="text-2xl font-bold text-white">Wallet</h1>
        </div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card hover={false} glow="gold" className="text-center py-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coins className="w-6 h-6 text-[var(--casino-accent)]" />
              <p className="text-sm text-[var(--casino-text-muted)]">Available Balance</p>
            </div>
            <h2 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#c9a227] via-[#e6c84a] to-[#c9a227] mb-3">
              {balance.toLocaleString('en-US')} Credits
            </h2>
            <div className="flex items-center justify-center gap-6 mb-6 text-xs text-[var(--casino-text-muted)]">
              <span>Purchased: <span className="text-[var(--casino-blue)] font-semibold">{purchasedBalance.toLocaleString()}</span></span>
              <span className="w-px h-3 bg-[var(--casino-border)]" />
              <span>Bonus: <span className="text-[var(--casino-purple-light)] font-semibold">{bonusBalance.toLocaleString()}</span></span>
            </div>
            <p className="text-[10px] text-[var(--casino-text-muted)]/60 mb-4">Credits are virtual entertainment tokens with no monetary value.</p>

            {/* Deposit/Withdraw Tabs */}
            <div className="flex gap-2 justify-center mb-6">
              <button
                onClick={() => setActiveTab('deposit')}
                className={cn(
                  'px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2',
                  activeTab === 'deposit'
                    ? 'bg-gradient-to-r from-[#00cc6a] to-[#00ff88] text-black'
                    : 'bg-[var(--casino-surface)] border border-[var(--casino-border)] text-[var(--casino-text-muted)] hover:text-white'
                )}
              >
                <ArrowDownCircle className="w-4 h-4" />
                Deposit
              </button>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={cn(
                  'px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2',
                  activeTab === 'withdraw'
                    ? 'bg-gradient-to-r from-[var(--casino-accent)] to-[#e6c84a] text-black'
                    : 'bg-[var(--casino-surface)] border border-[var(--casino-border)] text-[var(--casino-text-muted)] hover:text-white'
                )}
              >
                <ArrowUpCircle className="w-4 h-4" />
                Withdraw
              </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'deposit' ? (
                <motion.div
                  key="deposit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-lg mx-auto"
                >
                  {showDepositSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mb-4 rounded-lg border border-[#00FF88]/30 bg-[#00FF88]/10 px-4 py-2 text-sm text-[#00FF88] flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Credits added successfully!
                    </motion.div>
                  )}
                  <p className="text-sm text-[var(--casino-text-muted)] mb-4">Select credit amount to add:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DEPOSIT_OPTIONS.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => handleDeposit(amt)}
                        disabled={depositingAmount !== null}
                        className="relative py-5 rounded-xl bg-[var(--casino-surface)] border border-[var(--casino-border)] hover:border-[var(--casino-accent)] hover:shadow-[0_0_15px_rgba(201,162,39,0.15)] text-white font-bold text-lg transition-all cursor-pointer disabled:opacity-50"
                      >
                        {depositingAmount === amt ? (
                          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        ) : (
                          <>
                            <span className="text-[var(--casino-accent)]">$</span>
                            {amt.toLocaleString()}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="withdraw"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-sm mx-auto"
                >
                  <p className="text-sm text-[var(--casino-text-muted)] mb-4">
                    Available: <span className="text-[var(--casino-accent)] font-bold">${balance.toLocaleString()}</span>
                  </p>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount"
                    max={balance}
                    className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-3 text-white text-center text-lg font-bold focus:outline-none focus:border-[var(--casino-accent)] transition-colors mb-3"
                  />
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    loading={withdrawing}
                    onClick={handleWithdraw}
                    disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance}
                  >
                    Withdraw
                  </Button>
                  <p className="text-xs text-[var(--casino-text-muted)] text-center mt-2">
                    This is play money -- withdrawals are instant
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Daily Bonus Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card hover={false} glow="purple">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6d28d9] flex items-center justify-center shadow-lg">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Daily Bonus</h3>
                  <div className="flex items-center gap-2 text-xs text-[var(--casino-text-muted)]">
                    {dailyBonus && (
                      <>
                        <Flame className="w-3 h-3 text-orange-400" />
                        <span>{dailyBonus.day_streak} day streak</span>
                        <span className="text-[var(--casino-text-muted)]">|</span>
                      </>
                    )}
                    <span>
                      Earn up to <span className="text-[var(--casino-accent)]">$5,000</span> daily
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant={canClaimBonus ? 'success' : 'ghost'}
                size="lg"
                loading={claimingBonus}
                disabled={!canClaimBonus}
                onClick={handleClaimBonus}
                icon={canClaimBonus ? <Gift className="w-5 h-5" /> : undefined}
              >
                {canClaimBonus ? 'Claim Daily Bonus' : 'Already Claimed Today'}
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Wagered', value: stats.totalWagered, icon: <Gamepad2 className="w-5 h-5" />, color: 'text-[var(--casino-accent)]' },
            { label: 'Total Won', value: stats.totalWon, icon: <Trophy className="w-5 h-5" />, color: 'text-[var(--casino-green)]' },
            {
              label: 'Net Profit/Loss',
              value: stats.netProfit,
              icon: stats.netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />,
              color: stats.netProfit >= 0 ? 'text-[var(--casino-green)]' : 'text-[var(--casino-red)]',
            },
            { label: 'Biggest Win', value: stats.biggestWin, icon: <DollarSign className="w-5 h-5" />, color: 'text-[var(--casino-purple-light)]' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
            >
              <Card hover={false}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={stat.color}>{stat.icon}</span>
                  <span className="text-xs text-[var(--casino-text-muted)]">{stat.label}</span>
                </div>
                <p className={cn('text-xl sm:text-2xl font-bold', stat.color)}>
                  {stat.value < 0 ? '-' : ''}${Math.abs(stat.value).toLocaleString()}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Transaction History */}
        <Card hover={false}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-lg font-bold text-white">Transaction History</h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-4 h-4 text-[var(--casino-text-muted)] mr-1" />
              {(['all', 'bet', 'win', 'deposit', 'withdrawal', 'bonus'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => { setFilterType(type); setCurrentPage(1) }}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer capitalize',
                    filterType === type
                      ? 'bg-[var(--casino-accent)] text-black'
                      : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)] hover:text-white border border-[var(--casino-border)]'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {txLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--casino-accent)]" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
              <p className="text-sm text-[var(--casino-text-muted)]">No transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--casino-border)]">
                    <th className="text-left py-3 px-2 text-[var(--casino-text-muted)] font-medium text-xs">Date</th>
                    <th className="text-left py-3 px-2 text-[var(--casino-text-muted)] font-medium text-xs">Type</th>
                    <th className="text-left py-3 px-2 text-[var(--casino-text-muted)] font-medium text-xs hidden md:table-cell">Description</th>
                    <th className="text-right py-3 px-2 text-[var(--casino-text-muted)] font-medium text-xs">Amount</th>
                    <th className="text-right py-3 px-2 text-[var(--casino-text-muted)] font-medium text-xs hidden sm:table-cell">Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="wait">
                    {paginated.map((tx, i) => {
                      const config = typeConfig[tx.type]
                      const isPositive = tx.type === 'win' || tx.type === 'deposit' || tx.type === 'bonus'
                      return (
                        <motion.tr
                          key={tx.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-[var(--casino-border)]/50 hover:bg-[var(--casino-surface)] transition-colors"
                        >
                          <td className="py-3 px-2 text-[var(--casino-text-muted)] text-xs whitespace-nowrap">
                            {formatDate(tx.created_at)}
                          </td>
                          <td className="py-3 px-2">
                            <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', config.bg, config.color)}>
                              {config.icon}
                              {config.label}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-[var(--casino-text-muted)] text-xs hidden md:table-cell max-w-[200px] truncate">
                            {tx.description || '-'}
                          </td>
                          <td className={cn(
                            'py-3 px-2 text-right font-mono font-bold text-sm',
                            isPositive ? 'text-[var(--casino-green)]' : 'text-[var(--casino-red)]'
                          )}>
                            {isPositive ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-right text-[var(--casino-text-muted)] font-mono text-xs hidden sm:table-cell">
                            ${tx.balance_after.toLocaleString()}
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--casino-border)]">
              <span className="text-xs text-[var(--casino-text-muted)]">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-[var(--casino-surface)] text-[var(--casino-text-muted)] hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-[var(--casino-surface)] text-[var(--casino-text-muted)] hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
