'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  User, Mail, Shield, Gamepad2, Trophy, TrendingUp, Star,
  Settings, Lock, Clock, Edit2, Camera, ArrowLeft, Crown,
  Zap, Target, ChevronRight, Check, X, Calendar, Loader2
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface GameRecord {
  id: string
  game_type: string
  bet_amount: number
  payout: number
  multiplier: number
  settled: boolean
  created_at: string
}

const VIP_TIERS = [
  { name: 'Bronze', min: 0, max: 10000, color: 'from-[#cd7f32] to-[#a0522d]', icon: Shield },
  { name: 'Silver', min: 10000, max: 50000, color: 'from-[#c0c0c0] to-[#808080]', icon: Shield },
  { name: 'Gold', min: 50000, max: 200000, color: 'from-[#c9a227] to-[#e6c84a]', icon: Crown },
  { name: 'Platinum', min: 200000, max: 500000, color: 'from-[#e5e4e2] to-[#b0b0b0]', icon: Crown },
  { name: 'Diamond', min: 500000, max: 1000000, color: 'from-[#b9f2ff] to-[#00bcd4]', icon: Star },
]

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuth()
  const { balance } = useBalance(user?.id)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showLimitsModal, setShowLimitsModal] = useState(false)
  const [show2FAModal, setShow2FAModal] = useState(false)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaQrCode, setMfaQrCode] = useState('')
  const [mfaSecret, setMfaSecret] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [mfaSuccess, setMfaSuccess] = useState(false)
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [recentGames, setRecentGames] = useState<GameRecord[]>([])
  const [gamesLoading, setGamesLoading] = useState(true)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const username = profile?.username || 'Player'
  const email = user?.email || 'player@example.com'
  const level = profile?.level || 1
  const exp = profile?.exp || 0
  const totalWagered = profile?.total_wagered || 0
  const totalWon = profile?.total_won || 0
  const vipTier = profile?.vip_tier || 'bronze'
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'N/A'

  // Fetch game history from Supabase
  const fetchGames = useCallback(async () => {
    if (!user) {
      setGamesLoading(false)
      return
    }
    const supabase = createClient()
    const { data } = await supabase
      .from('games')
      .select('id, game_type, bet_amount, payout, multiplier, settled, created_at')
      .eq('player_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setRecentGames(data)
    setGamesLoading(false)
  }, [user])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  // Check MFA status
  useEffect(() => {
    fetch('/api/auth/mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.enabled) {
          setMfaEnabled(true)
          const verified = data.factors?.find((f: { status: string }) => f.status === 'verified')
          if (verified) setMfaFactorId(verified.id)
        }
      })
      .catch(() => {})
  }, [])

  const handleEnroll2FA = async () => {
    setMfaLoading(true)
    setMfaError(null)
    try {
      const res = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enroll' }),
      })
      const data = await res.json()
      if (!res.ok) { setMfaError(data.error); return }
      setMfaFactorId(data.factorId)
      setMfaQrCode(data.qrCode)
      setMfaSecret(data.secret)
    } catch {
      setMfaError('Failed to start enrollment')
    } finally {
      setMfaLoading(false)
    }
  }

  const handleVerify2FA = async () => {
    if (!mfaCode || mfaCode.length !== 6) { setMfaError('Enter a 6-digit code'); return }
    setMfaLoading(true)
    setMfaError(null)
    try {
      const res = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', factorId: mfaFactorId, code: mfaCode }),
      })
      const data = await res.json()
      if (!res.ok) { setMfaError(data.error); return }
      setMfaEnabled(true)
      setMfaSuccess(true)
      setMfaQrCode('')
      setMfaSecret('')
      setMfaCode('')
    } catch {
      setMfaError('Verification failed')
    } finally {
      setMfaLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!mfaFactorId) return
    setMfaLoading(true)
    setMfaError(null)
    try {
      const res = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unenroll', factorId: mfaFactorId }),
      })
      const data = await res.json()
      if (!res.ok) { setMfaError(data.error); return }
      setMfaEnabled(false)
      setMfaFactorId(null)
      setMfaSuccess(false)
    } catch {
      setMfaError('Failed to disable 2FA')
    } finally {
      setMfaLoading(false)
    }
  }

  // Compute stats from profile data (games_played may not exist on profile type, fall back to recent games count)
  const gamesPlayed = (profile as Record<string, unknown> | null)?.games_played as number ?? recentGames.length
  const winCount = recentGames.filter((g) => g.payout > 0).length
  const winRate = gamesPlayed > 0 ? ((winCount / Math.max(gamesPlayed, recentGames.length)) * 100).toFixed(1) : '0.0'

  const expForNextLevel = level * 1000
  const expProgress = (exp / expForNextLevel) * 100

  const currentVip = VIP_TIERS.find((t) => t.name.toLowerCase() === vipTier.toLowerCase()) || VIP_TIERS[0]
  const nextVip = VIP_TIERS[VIP_TIERS.indexOf(currentVip) + 1]
  const vipProgress = nextVip
    ? ((totalWagered - currentVip.min) / (nextVip.min - currentVip.min)) * 100
    : 100

  const handleUsernameEdit = async () => {
    if (!user || !newUsername.trim() || newUsername === username) {
      setEditingUsername(false)
      return
    }
    setUsernameSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ username: newUsername.trim() })
      .eq('id', user.id)

    if (!error) {
      await refreshProfile()
    }
    setUsernameSaving(false)
    setEditingUsername(false)
  }

  const handlePasswordChange = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    }
    setPasswordLoading(false)
  }

  const formatGameTime = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDays = Math.floor(diffHr / 24)
    return `${diffDays}d ago`
  }

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
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  {editingUsername ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-lg px-3 py-1 text-white text-lg font-bold focus:outline-none focus:border-[var(--casino-accent)]"
                        maxLength={20}
                        autoFocus
                      />
                      <button
                        onClick={handleUsernameEdit}
                        disabled={usernameSaving}
                        className="p-1 text-[var(--casino-green)] hover:bg-[var(--casino-green)]/10 rounded cursor-pointer"
                      >
                        {usernameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingUsername(false)}
                        className="p-1 text-[var(--casino-red)] hover:bg-[var(--casino-red)]/10 rounded cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-white">{username}</h1>
                      <button
                        onClick={() => { setNewUsername(username); setEditingUsername(true) }}
                        className="text-[var(--casino-text-muted)] hover:text-[var(--casino-accent)] cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-sm text-[var(--casino-text-muted)] flex items-center gap-1.5 justify-center sm:justify-start mt-1">
                  <Mail className="w-3.5 h-3.5" /> {email}
                </p>
                <p className="text-xs text-[var(--casino-text-muted)] flex items-center gap-1.5 justify-center sm:justify-start mt-0.5">
                  <Calendar className="w-3 h-3" /> Member since {memberSince}
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Games Played', value: gamesPlayed.toLocaleString(), icon: <Gamepad2 className="w-5 h-5" />, color: 'text-[var(--casino-blue)]' },
            { label: 'Win Rate', value: `${winRate}%`, icon: <Target className="w-5 h-5" />, color: 'text-[var(--casino-green)]' },
            { label: 'Total Wagered', value: `$${totalWagered.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-[var(--casino-accent)]' },
            { label: 'Total Won', value: `$${totalWon.toLocaleString()}`, icon: <Trophy className="w-5 h-5" />, color: 'text-[var(--casino-purple-light)]' },
            { label: 'Member Since', value: memberSince, icon: <Calendar className="w-5 h-5" />, color: 'text-zinc-400' },
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
                <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* Game History Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card hover={false}>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-[var(--casino-text-muted)]" />
                <h3 className="text-lg font-bold text-white">Game History</h3>
                <span className="text-xs text-[var(--casino-text-muted)] ml-auto">Last 20 games</span>
              </div>

              {gamesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--casino-accent)]" />
                </div>
              ) : recentGames.length === 0 ? (
                <div className="text-center py-12">
                  <Gamepad2 className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
                  <p className="text-sm text-[var(--casino-text-muted)]">No games played yet</p>
                  <button
                    onClick={() => router.push('/')}
                    className="mt-3 text-sm text-[var(--casino-accent)] hover:underline cursor-pointer"
                  >
                    Start playing
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--casino-border)]">
                        <th className="text-left py-2.5 px-2 text-[var(--casino-text-muted)] font-medium text-xs">Game</th>
                        <th className="text-right py-2.5 px-2 text-[var(--casino-text-muted)] font-medium text-xs">Bet</th>
                        <th className="text-right py-2.5 px-2 text-[var(--casino-text-muted)] font-medium text-xs">Payout</th>
                        <th className="text-right py-2.5 px-2 text-[var(--casino-text-muted)] font-medium text-xs hidden sm:table-cell">Multi</th>
                        <th className="text-right py-2.5 px-2 text-[var(--casino-text-muted)] font-medium text-xs">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentGames.map((game) => {
                        const isWin = game.payout > 0
                        const isPush = game.payout === game.bet_amount
                        return (
                          <tr
                            key={game.id}
                            className="border-b border-[var(--casino-border)]/50 hover:bg-[var(--casino-surface)] transition-colors"
                          >
                            <td className="py-2.5 px-2">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  'w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold',
                                  isWin ? 'bg-[var(--casino-green)]/10 text-[var(--casino-green)]' :
                                  isPush ? 'bg-[var(--casino-accent)]/10 text-[var(--casino-accent)]' :
                                  'bg-[var(--casino-red)]/10 text-[var(--casino-red)]'
                                )}>
                                  {isWin ? 'W' : isPush ? 'P' : 'L'}
                                </div>
                                <span className="text-white font-medium capitalize">{game.game_type}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right text-[var(--casino-text-muted)] font-mono text-xs">
                              ${game.bet_amount.toLocaleString()}
                            </td>
                            <td className={cn(
                              'py-2.5 px-2 text-right font-mono font-bold text-sm',
                              isWin ? 'text-[var(--casino-green)]' :
                              isPush ? 'text-[var(--casino-accent)]' :
                              'text-[var(--casino-red)]'
                            )}>
                              {isWin ? `+$${game.payout.toLocaleString()}` :
                               isPush ? `$${game.payout.toLocaleString()}` :
                               `-$${game.bet_amount.toLocaleString()}`}
                            </td>
                            <td className="py-2.5 px-2 text-right text-[var(--casino-text-muted)] text-xs hidden sm:table-cell">
                              {game.multiplier ? `${game.multiplier}x` : '-'}
                            </td>
                            <td className="py-2.5 px-2 text-right text-[var(--casino-text-muted)] text-xs whitespace-nowrap">
                              {formatGameTime(game.created_at)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
                      Wager ${Math.max(0, nextVip.min - totalWagered).toLocaleString()} more to reach {nextVip.name}
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
                    onClick={() => { setShow2FAModal(true); setMfaError(null); setMfaSuccess(false); setMfaCode('') }}
                    className="w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-[var(--casino-surface)] transition-colors cursor-pointer group"
                  >
                    <span className="flex items-center gap-2 text-sm text-[var(--casino-text)]">
                      <Zap className="w-4 h-4 text-[var(--casino-text-muted)]" />
                      Two-Factor Auth
                    </span>
                    <span className="flex items-center gap-1.5">
                      {mfaEnabled && <span className="text-xs text-[var(--casino-green)]">Enabled</span>}
                      <ChevronRight className="w-4 h-4 text-[var(--casino-text-muted)] group-hover:text-white transition-colors" />
                    </span>
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
      <Modal open={showPasswordModal} onClose={() => { setShowPasswordModal(false); setPasswordError(null); setPasswordSuccess(false) }} title="Change Password">
        <div className="space-y-4">
          {passwordError && (
            <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-2 text-sm text-[#EF4444]">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-lg border border-[#00FF88]/30 bg-[#00FF88]/10 px-4 py-2 text-sm text-[#00FF88]">
              Password updated successfully!
            </div>
          )}
          <div>
            <label className="text-sm text-[var(--casino-text-muted)] mb-1 block">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--casino-accent)] transition-colors"
            />
          </div>
          <div>
            <label className="text-sm text-[var(--casino-text-muted)] mb-1 block">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--casino-accent)] transition-colors"
            />
          </div>
          <div>
            <label className="text-sm text-[var(--casino-text-muted)] mb-1 block">Confirm New Password</label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--casino-accent)] transition-colors"
            />
          </div>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            loading={passwordLoading}
            onClick={handlePasswordChange}
          >
            Update Password
          </Button>
        </div>
      </Modal>

      {/* 2FA Modal */}
      <Modal open={show2FAModal} onClose={() => { setShow2FAModal(false); setMfaQrCode(''); setMfaSecret('') }} title="Two-Factor Authentication">
        <div className="space-y-4">
          {mfaError && (
            <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-2 text-sm text-[#EF4444]">
              {mfaError}
            </div>
          )}
          {mfaSuccess && (
            <div className="rounded-lg border border-[#00FF88]/30 bg-[#00FF88]/10 px-4 py-2 text-sm text-[#00FF88]">
              2FA {mfaEnabled ? 'enabled' : 'disabled'} successfully!
            </div>
          )}

          {mfaEnabled && !mfaQrCode ? (
            <>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--casino-green)]/10 border border-[var(--casino-green)]/20">
                <Check className="w-5 h-5 text-[var(--casino-green)]" />
                <div>
                  <p className="text-sm font-medium text-white">2FA is enabled</p>
                  <p className="text-xs text-[var(--casino-text-muted)]">Your account is protected with an authenticator app</p>
                </div>
              </div>
              <Button
                variant="danger"
                size="lg"
                className="w-full"
                loading={mfaLoading}
                onClick={handleDisable2FA}
              >
                Disable 2FA
              </Button>
            </>
          ) : mfaQrCode ? (
            <>
              <p className="text-sm text-[var(--casino-text-muted)]">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
              </p>
              <div className="flex justify-center p-4 bg-white rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mfaQrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              <div className="text-center">
                <p className="text-xs text-[var(--casino-text-muted)] mb-1">Or enter this code manually:</p>
                <code className="text-xs text-[var(--casino-accent)] font-mono bg-[var(--casino-surface)] px-3 py-1.5 rounded-lg select-all">
                  {mfaSecret}
                </code>
              </div>
              <div>
                <label className="text-sm text-[var(--casino-text-muted)] mb-1 block">Enter 6-digit code from your app</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-[var(--casino-accent)] transition-colors"
                />
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                loading={mfaLoading}
                onClick={handleVerify2FA}
              >
                Verify & Enable 2FA
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--casino-text-muted)]">
                Add an extra layer of security to your account. You&apos;ll need an authenticator app like Google Authenticator or Authy.
              </p>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                loading={mfaLoading}
                onClick={handleEnroll2FA}
              >
                Set Up 2FA
              </Button>
            </>
          )}
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
