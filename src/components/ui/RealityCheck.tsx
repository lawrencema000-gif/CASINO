'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

const REALITY_CHECK_INTERVAL = 60 * 60 * 1000 // 60 minutes in ms

function getSessionStart(): number {
  if (typeof window === 'undefined') return Date.now()
  const stored = sessionStorage.getItem('session-start')
  if (stored) return parseInt(stored, 10)
  const now = Date.now()
  sessionStorage.setItem('session-start', now.toString())
  return now
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function getSessionNetResult(): number {
  if (typeof window === 'undefined') return 0
  try {
    const stored = sessionStorage.getItem('session-net-result')
    if (stored) return parseFloat(stored)
  } catch {
    // ignore
  }
  return 0
}

export default function RealityCheck() {
  const [show, setShow] = useState(false)
  const [timePlayed, setTimePlayed] = useState('')
  const [netResult, setNetResult] = useState(0)
  const { signOut } = useAuth()
  const router = useRouter()

  const handleContinue = useCallback(() => {
    setShow(false)
    // Record when we last dismissed so next check is another interval from now
    sessionStorage.setItem('reality-check-last', Date.now().toString())
  }, [])

  const handleTakeBreak = useCallback(async () => {
    setShow(false)
    await signOut()
    router.push('/')
  }, [signOut, router])

  useEffect(() => {
    const check = () => {
      const sessionStart = getSessionStart()
      const elapsed = Date.now() - sessionStart
      const lastCheck = sessionStorage.getItem('reality-check-last')
      const lastCheckTime = lastCheck ? parseInt(lastCheck, 10) : sessionStart

      if (Date.now() - lastCheckTime >= REALITY_CHECK_INTERVAL && elapsed >= REALITY_CHECK_INTERVAL) {
        setTimePlayed(formatDuration(elapsed))
        setNetResult(getSessionNetResult())
        setShow(true)
      }
    }

    // Check every minute
    const interval = setInterval(check, 60000)
    // Also check on mount in case user has been away and comes back
    check()

    return () => clearInterval(interval)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl bg-[var(--casino-card)] border border-[var(--casino-border)] shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Accent bar */}
            <div className="h-1 bg-gradient-to-r from-[var(--casino-accent)] via-[var(--casino-accent-light)] to-[var(--casino-accent)]" />

            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[var(--casino-accent)]/10">
                  <AlertTriangle className="w-6 h-6 text-[var(--casino-accent)]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Reality Check</h2>
                  <p className="text-sm text-[var(--casino-text-muted)]">Time for a quick check-in</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--casino-surface)] border border-[var(--casino-border)] p-4">
                  <div className="flex items-center gap-2 text-[var(--casino-text-muted)] text-xs mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    Time Played
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">{timePlayed}</div>
                </div>

                <div className="rounded-xl bg-[var(--casino-surface)] border border-[var(--casino-border)] p-4">
                  <div className="flex items-center gap-2 text-[var(--casino-text-muted)] text-xs mb-1">
                    {netResult >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    Net Result
                  </div>
                  <div
                    className={`text-2xl font-bold font-mono ${
                      netResult >= 0 ? 'text-[var(--casino-green)]' : 'text-[var(--casino-red)]'
                    }`}
                  >
                    {netResult >= 0 ? '+' : ''}
                    ${Math.abs(netResult).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Message */}
              <p className="text-sm text-[var(--casino-text-muted)] text-center">
                Remember to gamble responsibly. It&apos;s okay to take a break.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={handleTakeBreak}
                >
                  Take a Break
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleContinue}
                >
                  Continue Playing
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
