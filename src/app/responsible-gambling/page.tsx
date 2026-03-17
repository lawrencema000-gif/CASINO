'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Clock, ShieldAlert, Ban, TrendingDown, Wallet,
  ExternalLink, AlertTriangle, ChevronRight, Check, ArrowLeft,
  Timer, Activity, BarChart3, Loader2
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface GamblingLimits {
  daily_loss_limit: number | null
  daily_deposit_limit: number | null
  session_time_limit: number | null // in minutes
  self_excluded_until: string | null
}

interface GamblingStats {
  today_losses: number
  today_deposits: number
  session_minutes: number
  week_wagered: number
  week_games: number
}

const COOL_OFF_OPTIONS = [
  { label: '24 Hours', value: '24h', days: 1 },
  { label: '7 Days', value: '7d', days: 7 },
  { label: '30 Days', value: '30d', days: 30 },
  { label: '90 Days', value: '90d', days: 90 },
]

const SESSION_TIME_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
  { label: '8 hours', value: 480 },
  { label: 'No limit', value: 0 },
]

const RESOURCES = [
  {
    name: 'BeGambleAware',
    url: 'https://www.begambleaware.org',
    description: 'Free, confidential help and support with gambling.',
  },
  {
    name: 'GamCare',
    url: 'https://www.gamcare.org.uk',
    description: 'Support, information and advice for anyone affected by gambling.',
  },
  {
    name: 'Gamblers Anonymous',
    url: 'https://www.gamblersanonymous.org',
    description: 'A fellowship of people who have joined together to do something about their gambling problem.',
  },
  {
    name: 'National Council on Problem Gambling',
    url: 'https://www.ncpgambling.org',
    description: 'The national advocate for programs and services to assist problem gamblers.',
  },
  {
    name: 'Gambling Therapy',
    url: 'https://www.gamblingtherapy.org',
    description: 'Free practical advice and emotional support for anyone affected by gambling.',
  },
]

function getSessionStart(): number {
  if (typeof window === 'undefined') return Date.now()
  const stored = sessionStorage.getItem('session-start')
  if (stored) return parseInt(stored, 10)
  const now = Date.now()
  sessionStorage.setItem('session-start', now.toString())
  return now
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export default function ResponsibleGamblingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [limits, setLimits] = useState<GamblingLimits>({
    daily_loss_limit: null, daily_deposit_limit: null,
    session_time_limit: null, self_excluded_until: null,
  })
  const [stats, setStats] = useState<GamblingStats>({
    today_losses: 0, today_deposits: 0, session_minutes: 0,
    week_wagered: 0, week_games: 0,
  })
  const [sessionDuration, setSessionDuration] = useState(0)
  const [lossInput, setLossInput] = useState('')
  const [depositInput, setDepositInput] = useState('')
  const [showExclusionConfirm, setShowExclusionConfirm] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Session timer
  useEffect(() => {
    const sessionStart = getSessionStart()
    const interval = setInterval(() => {
      setSessionDuration(Date.now() - sessionStart)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Fetch server-backed limits + stats
  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return }
    try {
      const [limitsRes, statsRes] = await Promise.all([
        fetch('/api/responsible-gambling'),
        fetch('/api/responsible-gambling/stats'),
      ])
      if (limitsRes.ok) {
        const data = await limitsRes.json()
        setLimits(data)
        if (data.daily_loss_limit) setLossInput(data.daily_loss_limit.toString())
        if (data.daily_deposit_limit) setDepositInput(data.daily_deposit_limit.toString())
      }
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch gambling settings:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const isExcluded = limits.self_excluded_until
    ? new Date(limits.self_excluded_until) > new Date()
    : false
  const exclusionEnd = limits.self_excluded_until
    ? new Date(limits.self_excluded_until)
    : null

  const sessionMinutes = Math.floor(sessionDuration / 60000)
  const sessionLimitActive = limits.session_time_limit && limits.session_time_limit > 0
  const sessionLimitExceeded = sessionLimitActive && sessionMinutes >= (limits.session_time_limit ?? 0)

  const flash = (msg: string) => {
    setSaved(msg)
    setTimeout(() => setSaved(null), 2500)
  }

  const saveLimit = async (field: string, value: number | null) => {
    if (!user) return
    setSaving(true)
    try {
      const res = await fetch('/api/responsible-gambling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_limits', [field]: value }),
      })
      if (res.ok) {
        setLimits(prev => ({ ...prev, [field]: value }))
        flash(`${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} ${value ? 'saved' : 'removed'}`)
      }
    } catch {
      flash('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLossLimit = () => {
    const val = parseFloat(lossInput)
    if (isNaN(val) || val <= 0) {
      saveLimit('daily_loss_limit', null)
      setLossInput('')
      return
    }
    saveLimit('daily_loss_limit', Math.floor(val))
  }

  const handleSaveDepositLimit = () => {
    const val = parseFloat(depositInput)
    if (isNaN(val) || val <= 0) {
      saveLimit('daily_deposit_limit', null)
      setDepositInput('')
      return
    }
    saveLimit('daily_deposit_limit', Math.floor(val))
  }

  const handleSessionTimeLimit = (minutes: number) => {
    saveLimit('session_time_limit', minutes === 0 ? null : minutes)
  }

  const handleSelfExclude = async (duration: string) => {
    if (!user) return
    setSaving(true)
    try {
      const res = await fetch('/api/responsible-gambling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'self_exclude', duration }),
      })
      if (res.ok) {
        const data = await res.json()
        setLimits(prev => ({ ...prev, self_excluded_until: data.excluded_until }))
        setShowExclusionConfirm(null)
        flash('Self-exclusion activated')
      }
    } catch {
      flash('Failed to activate self-exclusion')
    } finally {
      setSaving(false)
    }
  }

  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  }

  const lossLimitPct = limits.daily_loss_limit && stats.today_losses > 0
    ? Math.min(100, (stats.today_losses / limits.daily_loss_limit) * 100) : 0
  const depositLimitPct = limits.daily_deposit_limit && stats.today_deposits > 0
    ? Math.min(100, (stats.today_deposits / limits.daily_deposit_limit) * 100) : 0

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--casino-accent)] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--casino-bg)] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ delay: 0 }}>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[var(--casino-text-muted)] hover:text-white transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-8 h-8 text-[var(--casino-accent)]" />
            <h1 className="text-3xl font-bold text-white">Responsible Gambling</h1>
          </div>
          <p className="text-[var(--casino-text-muted)]">
            Gambling should be fun. Set limits, take breaks, and stay in control.
          </p>
        </motion.div>

        {/* Saved flash */}
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--casino-green)]/10 border border-[var(--casino-green)]/30 text-[var(--casino-green)]"
          >
            <Check className="w-5 h-5" />
            <span className="font-medium">{saved}</span>
          </motion.div>
        )}

        {/* Activity Stats (logged in users) */}
        {user && (
          <motion.div {...fadeUp} transition={{ delay: 0.03 }}>
            <Card hover={false} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-6 h-6 text-[var(--casino-accent)]" />
                <h2 className="text-xl font-semibold text-white">Your Activity</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">${stats.today_losses.toLocaleString()}</p>
                  <p className="text-xs text-[var(--casino-text-muted)]">Today&apos;s Losses</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">${stats.today_deposits.toLocaleString()}</p>
                  <p className="text-xs text-[var(--casino-text-muted)]">Today&apos;s Deposits</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">${stats.week_wagered.toLocaleString()}</p>
                  <p className="text-xs text-[var(--casino-text-muted)]">This Week Wagered</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats.week_games}</p>
                  <p className="text-xs text-[var(--casino-text-muted)]">Games This Week</p>
                </div>
              </div>

              {/* Progress bars for active limits */}
              {(limits.daily_loss_limit || limits.daily_deposit_limit) && (
                <div className="mt-4 space-y-3 pt-4 border-t border-[var(--casino-border)]">
                  {limits.daily_loss_limit && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--casino-text-muted)]">Loss limit usage</span>
                        <span className={lossLimitPct >= 80 ? 'text-[var(--casino-red)]' : 'text-[var(--casino-text-muted)]'}>
                          ${stats.today_losses} / ${limits.daily_loss_limit}
                        </span>
                      </div>
                      <div className="h-2 bg-[var(--casino-bg)] rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            lossLimitPct >= 80 ? 'bg-[var(--casino-red)]' : lossLimitPct >= 50 ? 'bg-[var(--casino-accent)]' : 'bg-[var(--casino-green)]'
                          )}
                          style={{ width: `${lossLimitPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {limits.daily_deposit_limit && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--casino-text-muted)]">Deposit limit usage</span>
                        <span className={depositLimitPct >= 80 ? 'text-[var(--casino-red)]' : 'text-[var(--casino-text-muted)]'}>
                          ${stats.today_deposits} / ${limits.daily_deposit_limit}
                        </span>
                      </div>
                      <div className="h-2 bg-[var(--casino-bg)] rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            depositLimitPct >= 80 ? 'bg-[var(--casino-red)]' : depositLimitPct >= 50 ? 'bg-[var(--casino-accent)]' : 'bg-[var(--casino-green)]'
                          )}
                          style={{ width: `${depositLimitPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Session Timer Card */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
          <Card hover={false} className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-6 h-6 text-[var(--casino-accent)]" />
              <h2 className="text-xl font-semibold text-white">Current Session</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className={cn(
                'text-4xl font-mono font-bold',
                sessionLimitExceeded ? 'text-[var(--casino-red)]' : 'text-white'
              )}>
                {formatDuration(sessionDuration)}
              </div>
              {sessionLimitExceeded && (
                <span className="px-3 py-1 rounded-lg bg-[var(--casino-red)]/10 border border-[var(--casino-red)]/30 text-xs font-semibold text-[var(--casino-red)]">
                  TIME LIMIT REACHED
                </span>
              )}
            </div>
            {sessionLimitActive && !sessionLimitExceeded && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--casino-text-muted)]">Session time</span>
                  <span className="text-[var(--casino-text-muted)]">
                    {sessionMinutes}m / {limits.session_time_limit}m
                  </span>
                </div>
                <div className="h-1.5 bg-[var(--casino-bg)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--casino-accent)] rounded-full transition-all"
                    style={{ width: `${Math.min(100, (sessionMinutes / (limits.session_time_limit ?? 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Session Time Limit */}
        {user && (
          <motion.div {...fadeUp} transition={{ delay: 0.08 }}>
            <Card hover={false} className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Timer className="w-6 h-6 text-[var(--casino-accent)]" />
                <h2 className="text-xl font-semibold text-white">Session Time Limit</h2>
              </div>
              <p className="text-[var(--casino-text-muted)] mb-4 text-sm">
                Set a maximum session duration. You&apos;ll receive a warning when time is up.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SESSION_TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSessionTimeLimit(opt.value)}
                    disabled={saving}
                    className={cn(
                      'rounded-xl border p-3 text-center transition-all cursor-pointer',
                      (limits.session_time_limit === opt.value || (!limits.session_time_limit && opt.value === 0))
                        ? 'border-[var(--casino-accent)]/50 bg-[var(--casino-accent)]/10 text-[var(--casino-accent)]'
                        : 'border-[var(--casino-border)] bg-[var(--casino-surface)] text-[var(--casino-text-muted)] hover:border-[var(--casino-accent)]/30 hover:text-white'
                    )}
                  >
                    <div className="text-sm font-semibold">{opt.label}</div>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Self-Exclusion Card */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
          <Card hover={false} className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Ban className="w-6 h-6 text-[var(--casino-red)]" />
              <h2 className="text-xl font-semibold text-white">Self-Exclusion</h2>
            </div>
            <p className="text-[var(--casino-text-muted)] mb-4 text-sm">
              Take a break from gambling. During a self-exclusion period you will not be able to play.
            </p>

            {isExcluded && exclusionEnd ? (
              <div className="rounded-xl bg-[var(--casino-red)]/10 border border-[var(--casino-red)]/30 p-4">
                <div className="flex items-center gap-2 text-[var(--casino-red)] mb-1">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">Self-Exclusion Active</span>
                </div>
                <p className="text-sm text-[var(--casino-text-muted)]">
                  Until {exclusionEnd.toLocaleDateString()} at {exclusionEnd.toLocaleTimeString()}
                </p>
                <p className="text-xs text-[var(--casino-text-muted)]/60 mt-2">
                  Self-exclusion cannot be removed early. This protects you from impulsive decisions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COOL_OFF_OPTIONS.map((opt) => (
                  <div key={opt.value}>
                    {showExclusionConfirm === opt.value ? (
                      <div className="rounded-xl border border-[var(--casino-red)]/40 bg-[var(--casino-red)]/5 p-3 space-y-2">
                        <p className="text-xs text-[var(--casino-red)]">
                          Are you sure? You won&apos;t be able to play for {opt.label.toLowerCase()}.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleSelfExclude(opt.value)}
                            className="flex-1"
                            disabled={saving}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowExclusionConfirm(null)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => user ? setShowExclusionConfirm(opt.value) : router.push('/login')}
                        className={cn(
                          'w-full rounded-xl border border-[var(--casino-border)] bg-[var(--casino-surface)] p-4',
                          'hover:border-[var(--casino-red)]/50 hover:bg-[var(--casino-red)]/5 transition-all cursor-pointer',
                          'text-center'
                        )}
                      >
                        <div className="text-lg font-semibold text-white">{opt.label}</div>
                        <div className="text-xs text-[var(--casino-text-muted)]">Cool-off</div>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Loss Limit Card */}
        {user && (
          <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
            <Card hover={false} className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingDown className="w-6 h-6 text-[var(--casino-accent)]" />
                <h2 className="text-xl font-semibold text-white">Daily Loss Limit</h2>
              </div>
              <p className="text-[var(--casino-text-muted)] mb-4 text-sm">
                Set a maximum amount you&apos;re willing to lose per day. Leave empty to remove the limit.
              </p>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--casino-text-muted)] font-semibold">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={lossInput}
                    onChange={(e) => setLossInput(e.target.value)}
                    placeholder="e.g. 100"
                    className={cn(
                      'w-full pl-8 pr-4 py-3 rounded-xl bg-[var(--casino-surface)] border border-[var(--casino-border)]',
                      'text-white placeholder:text-[var(--casino-text-muted)]/50',
                      'focus:outline-none focus:border-[var(--casino-accent)]/50 transition-colors'
                    )}
                  />
                </div>
                <Button variant="primary" onClick={handleSaveLossLimit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
              {limits.daily_loss_limit && (
                <p className="mt-3 text-sm text-[var(--casino-green)]">
                  Current limit: ${limits.daily_loss_limit.toLocaleString()} / day
                </p>
              )}
            </Card>
          </motion.div>
        )}

        {/* Deposit Limit Card */}
        {user && (
          <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <Card hover={false} className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Wallet className="w-6 h-6 text-[var(--casino-accent)]" />
                <h2 className="text-xl font-semibold text-white">Daily Deposit Limit</h2>
              </div>
              <p className="text-[var(--casino-text-muted)] mb-4 text-sm">
                Cap how much you can deposit each day. Leave empty to remove the limit.
              </p>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--casino-text-muted)] font-semibold">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={depositInput}
                    onChange={(e) => setDepositInput(e.target.value)}
                    placeholder="e.g. 200"
                    className={cn(
                      'w-full pl-8 pr-4 py-3 rounded-xl bg-[var(--casino-surface)] border border-[var(--casino-border)]',
                      'text-white placeholder:text-[var(--casino-text-muted)]/50',
                      'focus:outline-none focus:border-[var(--casino-accent)]/50 transition-colors'
                    )}
                  />
                </div>
                <Button variant="primary" onClick={handleSaveDepositLimit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
              {limits.daily_deposit_limit && (
                <p className="mt-3 text-sm text-[var(--casino-green)]">
                  Current limit: ${limits.daily_deposit_limit.toLocaleString()} / day
                </p>
              )}
            </Card>
          </motion.div>
        )}

        {/* Reality Check / Self-Assessment */}
        <motion.div {...fadeUp} transition={{ delay: 0.22 }}>
          <Card hover={false} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-6 h-6 text-[var(--casino-accent)]" />
              <h2 className="text-xl font-semibold text-white">Self-Assessment</h2>
            </div>
            <p className="text-[var(--casino-text-muted)] mb-4 text-sm">
              Ask yourself these questions honestly. If you answer &quot;yes&quot; to any of them, consider taking a break.
            </p>
            <div className="space-y-3">
              {[
                'Do you spend more money gambling than you can afford to lose?',
                'Do you borrow money or sell things to gamble?',
                'Have you tried to win back money you have lost (chasing losses)?',
                'Has gambling caused you any health problems, including stress or anxiety?',
                'Have people criticized your gambling or told you that you have a problem?',
                'Has your gambling caused any financial problems for you or your household?',
              ].map((q, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--casino-surface)] border border-[var(--casino-border)]">
                  <div className="w-6 h-6 rounded-full bg-[var(--casino-accent)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[var(--casino-accent)]">{i + 1}</span>
                  </div>
                  <p className="text-sm text-[var(--casino-text-muted)]">{q}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Resources */}
        <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
          <Card hover={false} className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <ExternalLink className="w-6 h-6 text-[var(--casino-accent)]" />
              <h2 className="text-xl font-semibold text-white">Help &amp; Resources</h2>
            </div>
            <p className="text-[var(--casino-text-muted)] mb-4 text-sm">
              If you or someone you know has a gambling problem, please reach out to one of these organizations.
            </p>
            <div className="space-y-2">
              {RESOURCES.map((r) => (
                <a
                  key={r.name}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl',
                    'bg-[var(--casino-surface)] border border-[var(--casino-border)]',
                    'hover:border-[var(--casino-accent)]/40 hover:bg-[var(--casino-card-hover)] transition-all group'
                  )}
                >
                  <div>
                    <div className="font-semibold text-white group-hover:text-[var(--casino-accent)] transition-colors">
                      {r.name}
                    </div>
                    <div className="text-xs text-[var(--casino-text-muted)]">{r.description}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--casino-text-muted)] group-hover:text-[var(--casino-accent)] transition-colors shrink-0 ml-3" />
                </a>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Footer message */}
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <p className="text-center text-xs text-[var(--casino-text-muted)] pb-8">
            Fortuna Casino is committed to responsible gambling. Play responsibly and within your means.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
