'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown,
  Trophy, DollarSign, Filter, ChevronLeft, ChevronRight, Gamepad2,
  ArrowLeft
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useRouter } from 'next/navigation'

type TransactionType = 'bet' | 'win' | 'deposit' | 'withdrawal' | 'bonus'

interface Transaction {
  id: string
  date: string
  type: TransactionType
  amount: number
  balanceAfter: number
  game?: string
  description: string
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '2026-03-13T14:32:00', type: 'win', amount: 2500, balanceAfter: 12500, game: 'Blackjack', description: 'Blackjack win' },
  { id: '2', date: '2026-03-13T14:30:00', type: 'bet', amount: -1000, balanceAfter: 10000, game: 'Blackjack', description: 'Blackjack bet' },
  { id: '3', date: '2026-03-13T13:15:00', type: 'win', amount: 5200, balanceAfter: 11000, game: 'Slots', description: 'Big win on Slots!' },
  { id: '4', date: '2026-03-13T13:10:00', type: 'bet', amount: -500, balanceAfter: 5800, game: 'Slots', description: 'Slots spin' },
  { id: '5', date: '2026-03-13T12:00:00', type: 'deposit', amount: 5000, balanceAfter: 6300, description: 'Deposit via card' },
  { id: '6', date: '2026-03-12T22:45:00', type: 'bonus', amount: 500, balanceAfter: 1300, description: 'Daily login bonus' },
  { id: '7', date: '2026-03-12T21:30:00', type: 'bet', amount: -800, balanceAfter: 800, game: 'Roulette', description: 'Roulette bet' },
  { id: '8', date: '2026-03-12T21:28:00', type: 'win', amount: 1600, balanceAfter: 1600, game: 'Roulette', description: 'Roulette win - Red' },
  { id: '9', date: '2026-03-12T20:00:00', type: 'deposit', amount: 2000, balanceAfter: 2000, description: 'Initial deposit' },
  { id: '10', date: '2026-03-12T18:00:00', type: 'withdrawal', amount: -3000, balanceAfter: 0, description: 'Withdrawal to bank' },
  { id: '11', date: '2026-03-11T16:40:00', type: 'win', amount: 12000, balanceAfter: 15000, game: 'Plinko', description: 'Plinko big drop!' },
  { id: '12', date: '2026-03-11T16:38:00', type: 'bet', amount: -200, balanceAfter: 3000, game: 'Plinko', description: 'Plinko bet' },
  { id: '13', date: '2026-03-11T15:00:00', type: 'bet', amount: -500, balanceAfter: 3200, game: 'Poker', description: 'Poker ante' },
  { id: '14', date: '2026-03-11T15:05:00', type: 'win', amount: 1200, balanceAfter: 3700, game: 'Poker', description: 'Poker win - Full House' },
  { id: '15', date: '2026-03-10T10:00:00', type: 'bonus', amount: 1000, balanceAfter: 2500, description: 'Welcome bonus' },
]

const typeConfig: Record<TransactionType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  bet: { label: 'Bet', icon: <Gamepad2 className="w-3.5 h-3.5" />, color: 'text-[var(--casino-red)]', bg: 'bg-[var(--casino-red)]/10' },
  win: { label: 'Win', icon: <Trophy className="w-3.5 h-3.5" />, color: 'text-[var(--casino-green)]', bg: 'bg-[var(--casino-green)]/10' },
  deposit: { label: 'Deposit', icon: <ArrowDownCircle className="w-3.5 h-3.5" />, color: 'text-[var(--casino-blue)]', bg: 'bg-[var(--casino-blue)]/10' },
  withdrawal: { label: 'Withdrawal', icon: <ArrowUpCircle className="w-3.5 h-3.5" />, color: 'text-[var(--casino-accent)]', bg: 'bg-[var(--casino-accent)]/10' },
  bonus: { label: 'Bonus', icon: <DollarSign className="w-3.5 h-3.5" />, color: 'text-[var(--casino-purple-light)]', bg: 'bg-[var(--casino-purple)]/10' },
}

export default function WalletPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { balance } = useBalance(user?.id)

  const [transactions] = useState<Transaction[]>(MOCK_TRANSACTIONS)
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const perPage = 8

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

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 py-6">
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
            <p className="text-sm text-[var(--casino-text-muted)] mb-2">Available Balance</p>
            <h2 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#c9a227] via-[#e6c84a] to-[#c9a227] mb-6">
              ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
            <div className="flex gap-3 justify-center">
              <Button variant="success" size="lg" onClick={() => setShowDeposit(true)} icon={<ArrowDownCircle className="w-5 h-5" />}>
                Deposit
              </Button>
              <Button variant="ghost" size="lg" onClick={() => setShowWithdraw(true)} icon={<ArrowUpCircle className="w-5 h-5" />}>
                Withdraw
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
              transition={{ delay: i * 0.1 }}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--casino-border)]">
                  <th className="text-left py-3 px-2 text-[var(--casino-text-muted)] font-medium text-xs">Date</th>
                  <th className="text-left py-3 px-2 text-[var(--casino-text-muted)] font-medium text-xs">Type</th>
                  <th className="text-right py-3 px-2 text-[var(--casino-text-muted)] font-medium text-xs">Amount</th>
                  <th className="text-right py-3 px-2 text-[var(--casino-text-muted)] font-medium text-xs hidden sm:table-cell">Balance After</th>
                  <th className="text-left py-3 px-2 text-[var(--casino-text-muted)] font-medium text-xs hidden md:table-cell">Game</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="wait">
                  {paginated.map((tx, i) => {
                    const config = typeConfig[tx.type]
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
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-3 px-2">
                          <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', config.bg, config.color)}>
                            {config.icon}
                            {config.label}
                          </span>
                        </td>
                        <td className={cn(
                          'py-3 px-2 text-right font-mono font-bold text-sm',
                          tx.amount >= 0 ? 'text-[var(--casino-green)]' : 'text-[var(--casino-red)]'
                        )}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right text-[var(--casino-text-muted)] font-mono text-xs hidden sm:table-cell">
                          ${tx.balanceAfter.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-[var(--casino-text-muted)] text-xs hidden md:table-cell">
                          {tx.game || '-'}
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

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

      {/* Deposit Modal */}
      <Modal open={showDeposit} onClose={() => setShowDeposit(false)} title="Deposit Funds">
        <div className="space-y-4">
          <p className="text-sm text-[var(--casino-text-muted)]">Choose deposit amount:</p>
          <div className="grid grid-cols-2 gap-3">
            {[1000, 5000, 10000, 25000].map((amt) => (
              <button
                key={amt}
                className="py-4 rounded-xl bg-[var(--casino-surface)] border border-[var(--casino-border)] hover:border-[var(--casino-accent)] text-white font-bold text-lg transition-all cursor-pointer"
              >
                ${amt.toLocaleString()}
              </button>
            ))}
          </div>
          <input
            type="number"
            placeholder="Custom amount"
            className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--casino-accent)] transition-colors"
          />
          <Button variant="success" size="lg" className="w-full">
            Deposit
          </Button>
        </div>
      </Modal>

      {/* Withdraw Modal */}
      <Modal open={showWithdraw} onClose={() => setShowWithdraw(false)} title="Withdraw Funds">
        <div className="space-y-4">
          <p className="text-sm text-[var(--casino-text-muted)]">
            Available: <span className="text-[var(--casino-accent)] font-bold">${balance.toLocaleString()}</span>
          </p>
          <input
            type="number"
            placeholder="Withdrawal amount"
            className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--casino-accent)] transition-colors"
          />
          <Button variant="primary" size="lg" className="w-full">
            Withdraw
          </Button>
          <p className="text-xs text-[var(--casino-text-muted)] text-center">
            Withdrawals are processed within 24 hours
          </p>
        </div>
      </Modal>
    </div>
  )
}
