'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  User, Mail, Shield, Gamepad2, Trophy, TrendingUp, Star,
  Settings, Lock, Clock, Edit2, Camera, ArrowLeft, Crown,
  Zap, Target, ChevronRight
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useRouter } from 'next/navigation'

interface RecentGame {
  id: string
  game: string
  bet: number
  payout: number
  result: 'win' | 'loss' | 'push'
  time: string
}

const VIP_TIERS = [
  { name: 'Bronze', min: 0, max: 10000, color: 'from-[#cd7f32] to-[#a0522d]', icon: Shield },
  { name: 'Silver', min: 10000, max: 50000, color: 'from-[#c0c0c0] to-[#808080]', icon: Shield },
  { name: 'Gold', min: 50000, max: 200000, color: 'from-[#c9a227] to-[#e6c84a]', icon: Crown },
  { name: 'Platinum', min: 200000, max: 500000, color: 'from-[#e5e4e2] to-[#b0b0b0]', icon: Crown },
  { name: 'Diamond', min: 500000, max: 1000000, color: 'from-[#b9f2ff] to-[#00bcd4]', icon: Star },
]

const MOCK_RECENT_GAMES: RecentGame[] = [
  { id: '1', game: 'Blackjack', bet: 500, payout: 1000, result: 'win', time: '5m ago' },
  { id: '2', game: 'Slots', bet: 100, payout: 0, result: 'loss', time: '12m ago' },
  { id: '3', game: 'Roulette', bet: 200, payout: 400, result: 'win', time: '18m ago' },
  { id: '4', game: 'Plinko', bet: 1000, payout: 5200, result: 'win', time: '25m ago' },
  { id: '5', game: 'Poker', bet: 500, payout: 0, result: 'loss', time: '30m ago' },
  { id: '6', game: 'Dice', bet: 100, payout: 196, result: 'win', time: '35m ago' },
  { id: '7', game: 'Crash', bet: 250, payout: 0, result: 'loss', time: '40m ago' },
  { id: '8', game: 'Blackjack', bet: 1000, payout: 1000, result: 'push', time: '45m ago' },
  { id: '9', game: 'Slots', bet: 50, payout: 2500, result: 'win', time: '1h ago' },
  { id: '10', game: 'Lottery', bet: 100, payout: 0, result: 'loss', time: '1h ago' },
  { id: '11', game: 'Roulette', bet: 500, payout: 1750, result: 'win', time: '2h ago' },
  { id: '12', game: 'Poker', bet: 200, payout: 600, result: 'win', time: '2h ago' },
  { id: '13', game: 'Coinflip', bet: 500, payout: 950, result: 'win', time: '3h ago' },
  { id: '14', game: 'Crash', bet: 100, payout: 320, result: 'win', time: '3h ago' },
  { id: '15', game: 'Slots', bet: 200, payout: 0, result: 'loss', time: '4h ago' },
  { id: '16', game: 'Blackjack', bet: 300, payout: 0, result: 'loss', time: '4h ago' },
  { id: '17', game: 'Jackpot', bet: 1000, payout: 0, result: 'loss', time: '5h ago' },
  { id: '18', game: 'Dice', bet: 50, payout: 98, result: 'win', time: '5h ago' },
  { id: '19', game: 'Plinko', bet: 100, payout: 290, result: 'win', time: '6h ago' },
  { id: '20', game: 'Roulette', bet: 400, payout: 0, result: 'loss', time: '6h ago' },
]

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { balance } = useBalance(user?.id)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showLimitsModal, setShowLimitsModal] = useState(false)
  const [recentGames] = useState<RecentGame[]>(MOCK_RECENT_GAMES)

  const username = profile?.username || 'Player'
  const email = user?.email || 'player@example.com'
  const level = profile?.level || 12
  const exp = profile?.exp || 7450
  const totalWagered = profile?.total_wagered || 125000
  const totalWon = profile?.total_won || 138500
  const vipTier = profile?.vip_tier || 'gold'

  const gamesPlayed = recentGames.length * 5 // mock
  const wins = recentGames.filter((g) => g.result === 'win').length * 5
  const winRate = gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : '0.0'

  const expForNextLevel = level * 1000
  const expProgress = (exp / expForNextLevel) * 100

  const currentVip = VIP_TIERS.find((t) => t.name.toLowerCase() === vipTier.toLowerCase()) || VIP_TIERS[0]
  const nextVip = VIP_TIERS[VIP_TIERS.indexOf(currentVip) + 1]
  const vipProgress = nextVip
    ? ((totalWagered - currentVip.min) / (nextVip.min - currentVip.min)) * 100
    : 100

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-[var(--casino-text-muted)] hover:text-white transition-colors cursor-pointer mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back to Lobby</span>
        </button>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card hover={false} glow="gold" className="mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--casino-accent)] to-[var(--casino-purple)] flex items-center justify-center text-4xl font-black text-white shadow-lg">
                  {username.charAt(0).toUpperCase()}
                </div>
                <button className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                </button>
                {/* VIP Badge */}
                <div className={cn(
                  'absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-gradient-to-r text-black',
                  currentVip.color
                )}>
                  {currentVip.name}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                  {username}
                  <button className="text-[var(--casino-text-muted)] hover:text-[var(--casino-accent)] cursor-pointer transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </h1>
                <p className="text-sm text-[var(--casino-text-muted)] flex items-center gap-1.5 justify-center sm:justify-start mt-1">
                  <Mail className="w-3.5 h-3.5" /> {email}
                </p>

                {/* Level / XP Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--casino-text-muted)] flex items-center gap-1">
                      <Zap className="w-3 h-3 text-[var(--casino-accent)]" />
                      Level {level}
                    </span>
                    <span className="text-xs text-[var(--casino-text-muted)]">
                      {exp.toLocaleString()} / {expForNextLevel.toLocaleString()} XP
                    </span>
                  </div>
                  <div className="h-2.5 bg-[var(--casino-surface)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[var(--casino-accent)] to-[var(--casino-green)] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(expProgress, 100)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>

              {/* Balance */}
              <div className="text-center">
                <p className="text-xs text-[var(--casino-text-muted)] mb-1">Balance</p>
                <p className="text-2xl font-black text-[var(--casino-accent)]">
                  ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Games Played', value: gamesPlayed.toLocaleString(), icon: <Gamepad2 className="w-5 h-5" />, color: 'text-[var(--casino-blue)]' },
            { label: 'Win Rate', value: `${winRate}%`, icon: <Target className="w-5 h-5" />, color: 'text-[var(--casino-green)]' },
            { label: 'Total Wagered', value: `$${totalWagered.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-[var(--casino-accent)]' },
            { label: 'Total Won', value: `$${totalWon.toLocaleString()}`, icon: <Trophy className="w-5 h-5" />, color: 'text-[var(--casino-purple-light)]' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
            >
              <Card hover={false}>
                <div className={cn('mb-2', stat.color)}>{stat.icon}</div>
                <p className="text-xs text-[var(--casino-text-muted)]">{stat.label}</p>
                <p className={cn('text-xl font-bold', stat.color)}>{stat.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Recent Games */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card hover={false}>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-[var(--casino-text-muted)]" />
                <h3 className="text-lg font-bold text-white">Recent Games</h3>
              </div>
              <div className="space-y-1">
                {recentGames.map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[var(--casino-surface)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                        game.result === 'win' ? 'bg-[var(--casino-green)]/10 text-[var(--casino-green)]' :
                        game.result === 'push' ? 'bg-[var(--casino-accent)]/10 text-[var(--casino-accent)]' :
                        'bg-[var(--casino-red)]/10 text-[var(--casino-red)]'
                      )}>
                        {game.result === 'win' ? 'W' : game.result === 'push' ? 'P' : 'L'}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{game.game}</p>
                        <p className="text-[10px] text-[var(--casino-text-muted)]">{game.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[var(--casino-text-muted)]">Bet ${game.bet}</p>
                      <p className={cn(
                        'text-sm font-bold',
                        game.result === 'win' ? 'text-[var(--casino-green)]' :
                        game.result === 'push' ? 'text-[var(--casino-accent)]' :
                        'text-[var(--casino-red)]'
                      )}>
                        {game.result === 'win' ? `+$${game.payout.toLocaleString()}` :
                         game.result === 'push' ? `$${game.payout.toLocaleString()}` :
                         `-$${game.bet.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* VIP Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card hover={false} glow="purple">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-[var(--casino-accent)]" />
                  <h3 className="text-sm font-bold text-white">VIP Status</h3>
                </div>
                <div className={cn(
                  'text-center py-4 px-3 rounded-xl mb-4 bg-gradient-to-r',
                  currentVip.color
                )}>
                  <currentVip.icon className="w-8 h-8 mx-auto mb-1 text-black/70" />
                  <h4 className="text-xl font-black text-black">{currentVip.name}</h4>
                </div>
                {nextVip && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[var(--casino-text-muted)]">Progress to {nextVip.name}</span>
                      <span className="text-[var(--casino-accent)]">{Math.min(vipProgress, 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-[var(--casino-surface)] rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full bg-gradient-to-r', nextVip.color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(vipProgress, 100)}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--casino-text-muted)] mt-1">
                      Wager ${(nextVip.min - totalWagered).toLocaleString()} more to reach {nextVip.name}
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card hover={false}>
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-[var(--casino-text-muted)]" />
                  <h3 className="text-sm font-bold text-white">Settings</h3>
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[var(--casino-surface)] transition-colors cursor-pointer group"
                  >
                    <span className="flex items-center gap-2 text-sm text-[var(--casino-text)]">
                      <Lock className="w-4 h-4 text-[var(--casino-text-muted)]" />
                      Change Password
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--casino-text-muted)] group-hover:text-white transition-colors" />
                  </button>
                  <button
                    onClick={() => setShowLimitsModal(true)}
                    className="w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[var(--casino-surface)] transition-colors cursor-pointer group"
                  >
                    <span className="flex items-center gap-2 text-sm text-[var(--casino-text)]">
                      <Shield className="w-4 h-4 text-[var(--casino-text-muted)]" />
                      Responsible Gaming
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--casino-text-muted)] group-hover:text-white transition-colors" />
                  </button>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-[var(--casino-text-muted)] mb-1 block">Current Password</label>
            <input
              type="password"
              className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--casino-accent)] transition-colors"
            />
          </div>
          <div>
            <label className="text-sm text-[var(--casino-text-muted)] mb-1 block">New Password</label>
            <input
              type="password"
              className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--casino-accent)] transition-colors"
            />
          </div>
          <div>
            <label className="text-sm text-[var(--casino-text-muted)] mb-1 block">Confirm New Password</label>
            <input
              type="password"
              className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--casino-accent)] transition-colors"
            />
          </div>
          <Button variant="primary" size="lg" className="w-full">
            Update Password
          </Button>
        </div>
      </Modal>

      {/* Responsible Gaming Modal */}
      <Modal open={showLimitsModal} onClose={() => setShowLimitsModal(false)} title="Responsible Gaming" size="lg">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Deposit Limits</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['Daily', 'Weekly', 'Monthly'].map((period) => (
                <div key={period}>
                  <label className="text-xs text-[var(--casino-text-muted)] mb-1 block">{period} Limit</label>
                  <input
                    type="number"
                    placeholder="No limit"
                    className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--casino-accent)] transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Loss Limits</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['Daily', 'Weekly', 'Monthly'].map((period) => (
                <div key={period}>
                  <label className="text-xs text-[var(--casino-text-muted)] mb-1 block">{period} Limit</label>
                  <input
                    type="number"
                    placeholder="No limit"
                    className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--casino-accent)] transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Session Time Limit</h4>
            <select className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--casino-accent)] transition-colors">
              <option value="">No limit</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="240">4 hours</option>
            </select>
          </div>
          <Button variant="primary" size="lg" className="w-full">
            Save Limits
          </Button>
          <div className="border-t border-[var(--casino-border)] pt-4">
            <Button variant="danger" size="lg" className="w-full">
              Self-Exclude (24 hours)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
