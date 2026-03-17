'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Sword, Loader2, Gift, Check, Lock, Coins,
  Star, Crown, Zap, ChevronRight
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface Season {
  id: string
  name: string
  description: string
  season_number: number
  starts_at: string
  ends_at: string
  max_tier: number
  xp_per_tier: number
}

interface Progress {
  current_tier: number
  current_xp: number
  total_xp: number
  is_premium: boolean
}

interface Reward {
  id: string
  tier: number
  reward_type: string
  reward_value: number
  reward_label: string
  reward_description: string
  is_premium: boolean
  claimed: boolean
  unlocked: boolean
}

export default function BattlePassPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [season, setSeason] = useState<Season | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch('/api/battle-pass')
      const data = await res.json()
      if (res.ok) {
        setSeason(data.season)
        setProgress(data.progress)
        setRewards(data.rewards || [])
      }
    } catch (err) {
      console.error('Failed to fetch battle pass:', err)
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

  const handleClaim = async (rewardId: string) => {
    setClaiming(rewardId)
    try {
      const res = await fetch('/api/battle-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId }),
      })
      if (res.ok) await fetchData()
    } catch (err) {
      console.error('Failed to claim:', err)
    } finally {
      setClaiming(null)
    }
  }

  const getDaysRemaining = () => {
    if (!season) return 0
    const diff = new Date(season.ends_at).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const tierXpProgress = progress && season
    ? (progress.current_xp / season.xp_per_tier) * 100
    : 0

  const claimableCount = rewards.filter(r => r.unlocked && !r.claimed && !r.is_premium).length

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--casino-accent)] animate-spin" />
      </div>
    )
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center px-4">
        <Card hover={false} className="text-center py-12 max-w-md">
          <Sword className="w-12 h-12 text-[var(--casino-text-muted)]/40 mx-auto mb-4" />
          <p className="text-[var(--casino-text-muted)]">No active season</p>
          <p className="text-sm text-[var(--casino-text-muted)]/60 mt-1">Check back soon for the next Battle Pass!</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/')} className="text-[var(--casino-text-muted)] hover:text-white transition cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Sword className="w-7 h-7 text-[var(--casino-accent)]" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{season.name}</h1>
            <p className="text-xs text-[var(--casino-text-muted)]">{season.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--casino-text-muted)]">{getDaysRemaining()} days left</p>
          </div>
        </div>

        {/* Current Progress */}
        <Card hover={false} className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--casino-accent)] to-[var(--casino-gold)] flex items-center justify-center">
                <span className="text-xl font-bold text-black">{progress?.current_tier || 0}</span>
              </div>
              <div>
                <p className="text-xs text-[var(--casino-text-muted)]">Current Tier</p>
                <p className="text-lg font-bold text-white">Tier {progress?.current_tier || 0} / {season.max_tier}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--casino-text-muted)]">Total XP</p>
              <p className="text-lg font-bold text-[var(--casino-accent)]">{(progress?.total_xp || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* XP Progress to next tier */}
          {(progress?.current_tier || 0) < season.max_tier && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--casino-text-muted)]">
                  Tier {(progress?.current_tier || 0) + 1}
                </span>
                <span className="text-xs text-[var(--casino-text-muted)] font-mono">
                  {progress?.current_xp || 0} / {season.xp_per_tier} XP
                </span>
              </div>
              <div className="h-3 bg-[var(--casino-bg)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--casino-accent)] to-[var(--casino-gold)] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${tierXpProgress}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
          )}

          {claimableCount > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--casino-green)]">
              <Gift className="w-4 h-4" />
              {claimableCount} reward{claimableCount > 1 ? 's' : ''} ready to claim!
            </div>
          )}
        </Card>

        {/* Tier Rewards */}
        <h3 className="text-sm font-semibold text-white mb-3">Tier Rewards</h3>
        <div className="space-y-2">
          {rewards.filter(r => !r.is_premium).map((reward, i) => {
            const isCurrent = (progress?.current_tier || 0) === reward.tier - 1
            return (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <div className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border transition',
                  reward.claimed
                    ? 'bg-[var(--casino-surface)]/50 border-[var(--casino-border)]/50 opacity-60'
                    : reward.unlocked
                      ? 'bg-[var(--casino-green)]/5 border-[var(--casino-green)]/20'
                      : isCurrent
                        ? 'bg-[var(--casino-accent)]/5 border-[var(--casino-accent)]/20'
                        : 'bg-[var(--casino-surface)] border-[var(--casino-border)]'
                )}>
                  {/* Tier Number */}
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold',
                    reward.unlocked
                      ? 'bg-gradient-to-br from-[var(--casino-accent)] to-[var(--casino-gold)] text-black'
                      : 'bg-[var(--casino-bg)] text-[var(--casino-text-muted)] border border-[var(--casino-border)]'
                  )}>
                    {reward.tier}
                  </div>

                  {/* Reward Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {reward.reward_type === 'credits' ? (
                        <Coins className="w-3.5 h-3.5 text-[var(--casino-accent)]" />
                      ) : reward.reward_type === 'exp' ? (
                        <Star className="w-3.5 h-3.5 text-[var(--casino-purple-light)]" />
                      ) : (
                        <Crown className="w-3.5 h-3.5 text-[var(--casino-gold)]" />
                      )}
                      <span className="text-sm font-medium text-white">{reward.reward_label}</span>
                    </div>
                    {reward.reward_description && (
                      <p className="text-[10px] text-[var(--casino-text-muted)] mt-0.5">{reward.reward_description}</p>
                    )}
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    {reward.claimed ? (
                      <div className="flex items-center gap-1 text-xs text-[var(--casino-green)]">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : reward.unlocked ? (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleClaim(reward.id)}
                        disabled={claiming === reward.id}
                        className="flex items-center gap-1"
                      >
                        {claiming === reward.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Gift className="w-3.5 h-3.5" />
                        )}
                        Claim
                      </Button>
                    ) : (
                      <Lock className="w-4 h-4 text-[var(--casino-text-muted)]/40" />
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* How to earn XP */}
        <Card hover={false} className="mt-6">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--casino-accent)]" />
            How to Earn XP
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              { action: 'Play any game', xp: '10 XP per round' },
              { action: 'Win a game', xp: '+5 bonus XP' },
              { action: 'Wager 100 credits', xp: '+2 XP' },
              { action: 'Complete daily mission', xp: '+20 XP' },
            ].map(({ action, xp }) => (
              <div key={action} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--casino-bg)]">
                <span className="text-[var(--casino-text-muted)]">{action}</span>
                <span className="text-[var(--casino-accent)] font-medium flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" /> {xp}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
