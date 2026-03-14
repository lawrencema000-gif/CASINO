'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Clock, ShieldAlert, Ban, TrendingDown, Wallet,
  ExternalLink, AlertTriangle, ChevronRight, Check, ArrowLeft
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface GamblingSettings {
  lossLimit: number | null
  depositLimit: number | null
  selfExclusionUntil: string | null
}

const COOL_OFF_OPTIONS = [
  { label: '24 Hours', value: 1 },
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
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

function getStoredSettings(): GamblingSettings {
  if (typeof window === 'undefined') {
    return { lossLimit: null, depositLimit: null, selfExclusionUntil: null }
  }
  try {
    const stored = localStorage.getItem('responsible-gambling-settings')
    if (stored) return JSON.parse(stored)
  } catch {
    // ignore parse errors
  }
  return { lossLimit: null, depositLimit: null, selfExclusionUntil: null }
}

function saveSettings(settings: GamblingSettings) {
  localStorage.setItem('responsible-gambling-settings', JSON.stringify(settings))
}

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
  const { user } = useAuth()

  const [settings, setSettings] = useState<GamblingSettings>(getStoredSettings)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [lossInput, setLossInput] = useState('')
  const [depositInput, setDepositInput] = useState('')
  const [showExclusionConfirm, setShowExclusionConfirm] = useState<number | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  // Session timer
  useEffect(() => {
    const sessionStart = getSessionStart()
    const interval = setInterval(() => {
      setSessionDuration(Date.now() - sessionStart)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Init input fields from stored settings
  useEffect(() => {
    const s = getStoredSettings()
    setSettings(s)
    if (s.lossLimit) setLossInput(s.lossLimit.toString())
    if (s.depositLimit) setDepositInput(s.depositLimit.toString())
  }, [])

  // Check if currently self-excluded
  const isExcluded = settings.selfExclusionUntil
    ? new Date(settings.selfExclusionUntil) > new Date()
    : false
  const exclusionEnd = settings.selfExclusionUntil
    ? new Date(settings.selfExclusionUntil)
    : null

  const flash = (msg: string) => {
    setSaved(msg)
    setTimeout(() => setSaved(null), 2500)
  }

  const handleSaveLossLimit = () => {
    const val = parseFloat(lossInput)
    if (isNaN(val) || val <= 0) {
      const updated = { ...settings, lossLimit: null }
      setSettings(updated)
      saveSettings(updated)
      setLossInput('')
      flash('Loss limit removed')
      return
    }
    const updated = { ...settings, lossLimit: val }
    setSettings(updated)
    saveSettings(updated)
    flash('Loss limit saved')
  }

  const handleSaveDepositLimit = () => {
    const val = parseFloat(depositInput)
    if (isNaN(val) || val <= 0) {
      const updated = { ...settings, depositLimit: null }
      setSettings(updated)
      saveSettings(updated)
      setDepositInput('')
      flash('Deposit limit removed')
      return
    }
    const updated = { ...settings, depositLimit: val }
    setSettings(updated)
    saveSettings(updated)
    flash('Deposit limit saved')
  }

  const handleSelfExclude = (days: number) => {
    const until = new Date()
    until.setDate(until.getDate() + days)
    const updated = { ...settings, selfExclusionUntil: until.toISOString() }
    setSettings(updated)
    saveSettings(updated)
    setShowExclusionConfirm(null)
    flash(`Self-exclusion active for ${days} day${days > 1 ? 's' : ''}`)
  }

  const handleRemoveExclusion = () => {
    const updated = { ...settings, selfExclusionUntil: null }
    setSettings(updated)
    saveSettings(updated)
    flash('Self-exclusion removed')
  }

  const fadeUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
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

        {/* Session Timer Card */}
        <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
          <Card hover={false} className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-6 h-6 text-[var(--casino-accent)]" />
              <h2 className="text-xl font-semibold text-white">Current Session</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-mono font-bold text-white">
                {formatDuration(sessionDuration)}
              </div>
              <span className="text-sm text-[var(--casino-text-muted)]">
                Time spent this session
              </span>
            </div>
          </Card>
        </motion.div>

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
              <div className="rounded-xl bg-[var(--casino-red)]/10 border border-[var(--casino-red)]/30 p-4 mb-4">
                <div className="flex items-center gap-2 text-[var(--casino-red)] mb-1">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">Self-Exclusion Active</span>
                </div>
                <p className="text-sm text-[var(--casino-text-muted)]">
                  Until {exclusionEnd.toLocaleDateString()} at {exclusionEnd.toLocaleTimeString()}
                </p>
                <button
                  onClick={handleRemoveExclusion}
                  className="mt-3 text-xs text-[var(--casino-text-muted)] underline hover:text-white transition-colors cursor-pointer"
                >
                  Remove exclusion (not recommended)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        onClick={() => setShowExclusionConfirm(opt.value)}
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
              <Button variant="primary" onClick={handleSaveLossLimit}>
                Save
              </Button>
            </div>
            {settings.lossLimit && (
              <p className="mt-3 text-sm text-[var(--casino-green)]">
                Current limit: ${settings.lossLimit.toLocaleString()} / day
              </p>
            )}
          </Card>
        </motion.div>

        {/* Deposit Limit Card */}
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
              <Button variant="primary" onClick={handleSaveDepositLimit}>
                Save
              </Button>
            </div>
            {settings.depositLimit && (
              <p className="mt-3 text-sm text-[var(--casino-green)]">
                Current limit: ${settings.depositLimit.toLocaleString()} / day
              </p>
            )}
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
