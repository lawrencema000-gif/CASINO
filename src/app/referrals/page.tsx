'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Users, Copy, Check, Gift, Loader2, Coins,
  UserPlus, TrendingUp, Clock, CheckCircle2
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface Referral {
  id: string
  referee_username: string
  referrer_reward: number
  referee_reward: number
  referrer_paid: boolean
  status: string
  referee_wagered: number
  qualification_wager: number
  qualified_at: string | null
  created_at: string
}

interface ReferralData {
  referral_code: string
  referral_count: number
  referral_earnings: number
  was_referred: boolean
  referrals: Referral[]
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'text-[var(--casino-accent)]', icon: <Clock className="w-3.5 h-3.5" /> },
  qualified: { label: 'Qualified', color: 'text-[var(--casino-blue)]', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rewarded: { label: 'Rewarded', color: 'text-[var(--casino-green)]', icon: <Gift className="w-3.5 h-3.5" /> },
  revoked: { label: 'Revoked', color: 'text-[var(--casino-red)]', icon: <Clock className="w-3.5 h-3.5" /> },
}

export default function ReferralsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [applyCode, setApplyCode] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<{ success?: boolean; error?: string } | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch('/api/referrals')
      const json = await res.json()
      if (res.ok) setData(json)
    } catch (err) {
      console.error('Failed to fetch referrals:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    fetchData()
  }, [user, authLoading, router, fetchData])

  const copyCode = async () => {
    if (!data?.referral_code) return
    await navigator.clipboard.writeText(data.referral_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!applyCode.trim() || applying) return
    setApplying(true)
    setApplyResult(null)
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: applyCode.trim() }),
      })
      const json = await res.json()
      if (res.ok) {
        setApplyResult({ success: true })
        setApplyCode('')
        await fetchData()
      } else {
        setApplyResult({ error: json.error })
      }
    } catch {
      setApplyResult({ error: 'Something went wrong' })
    } finally {
      setApplying(false)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--casino-accent)] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push('/')} className="text-[var(--casino-text-muted)] hover:text-white transition cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Users className="w-7 h-7 text-[var(--casino-accent)]" />
          <div>
            <h1 className="text-2xl font-bold text-white">Referrals</h1>
            <p className="text-xs text-[var(--casino-text-muted)]">Invite friends, earn bonus credits</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card hover={false} className="text-center">
            <UserPlus className="w-5 h-5 text-[var(--casino-accent)] mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{data?.referral_count || 0}</p>
            <p className="text-[10px] text-[var(--casino-text-muted)]">Friends Referred</p>
          </Card>
          <Card hover={false} className="text-center">
            <Coins className="w-5 h-5 text-[var(--casino-green)] mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{(data?.referral_earnings || 0).toLocaleString()}</p>
            <p className="text-[10px] text-[var(--casino-text-muted)]">Credits Earned</p>
          </Card>
          <Card hover={false} className="text-center">
            <TrendingUp className="w-5 h-5 text-[var(--casino-purple-light)] mx-auto mb-2" />
            <p className="text-xl font-bold text-white">500</p>
            <p className="text-[10px] text-[var(--casino-text-muted)]">Per Referral</p>
          </Card>
        </div>

        {/* Your Referral Code */}
        <Card hover={false} className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">Your Referral Code</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[var(--casino-bg)] border border-[var(--casino-border)] rounded-lg px-4 py-3 font-mono text-lg text-[var(--casino-accent)] font-bold tracking-widest text-center">
              {data?.referral_code || '---'}
            </div>
            <Button variant="secondary" size="sm" onClick={copyCode} className="flex items-center gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-[var(--casino-text-muted)] mt-3">
            Share this code with friends. They get <span className="text-[var(--casino-green)]">200 bonus credits</span> on signup,
            and you get <span className="text-[var(--casino-accent)]">500 bonus credits</span> when they wager 500 credits.
          </p>
        </Card>

        {/* Apply a Referral Code (if not already referred) */}
        {!data?.was_referred && (
          <Card hover={false} className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-3">Have a referral code?</h3>
            <form onSubmit={handleApply} className="flex items-center gap-3">
              <input
                type="text"
                value={applyCode}
                onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                maxLength={12}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--casino-bg)] border border-[var(--casino-border)] text-white placeholder-[var(--casino-text-muted)]/50 focus:border-[var(--casino-accent)] focus:outline-none text-sm font-mono uppercase tracking-widest"
              />
              <Button type="submit" variant="primary" size="sm" disabled={!applyCode.trim() || applying}>
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
              </Button>
            </form>
            {applyResult?.success && (
              <p className="text-xs text-[var(--casino-green)] mt-2">Referral code applied! Check your balance.</p>
            )}
            {applyResult?.error && (
              <p className="text-xs text-[var(--casino-red)] mt-2">{applyResult.error}</p>
            )}
          </Card>
        )}

        {/* Referral List */}
        <h3 className="text-sm font-semibold text-white mb-3">Your Referrals</h3>
        {(!data?.referrals || data.referrals.length === 0) ? (
          <Card hover={false} className="text-center py-10">
            <Users className="w-10 h-10 text-[var(--casino-text-muted)]/40 mx-auto mb-3" />
            <p className="text-[var(--casino-text-muted)]">No referrals yet</p>
            <p className="text-xs text-[var(--casino-text-muted)]/60 mt-1">Share your code to get started!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.referrals.map((ref, i) => {
              const sc = statusConfig[ref.status] || statusConfig.pending
              const wagerPct = Math.min(100, (ref.referee_wagered / ref.qualification_wager) * 100)
              return (
                <motion.div
                  key={ref.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card hover={false}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{ref.referee_username}</span>
                          <span className={cn('flex items-center gap-1 text-[10px] font-medium', sc.color)}>
                            {sc.icon} {sc.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--casino-text-muted)]">
                          Joined {formatDate(ref.created_at)}
                          {ref.qualified_at && ` · Qualified ${formatDate(ref.qualified_at)}`}
                        </p>
                        {ref.status === 'pending' && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-[var(--casino-text-muted)]">Wager progress</span>
                              <span className="text-[10px] text-[var(--casino-text-muted)] font-mono">
                                {ref.referee_wagered}/{ref.qualification_wager}
                              </span>
                            </div>
                            <div className="h-1.5 bg-[var(--casino-bg)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--casino-accent)] rounded-full transition-all"
                                style={{ width: `${wagerPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        {ref.referrer_paid ? (
                          <span className="text-xs text-[var(--casino-green)] font-medium">
                            +{ref.referrer_reward} credits
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--casino-text-muted)]">
                            {ref.referrer_reward} pending
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
