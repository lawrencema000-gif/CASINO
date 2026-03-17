'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Trophy, Coins, Gamepad2, Target, Flame, Star,
  Crown, Award, Shield, Zap, Gem, Medal, Loader2, Gift, Check,
  Clock
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface Mission {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  frequency: string
  requirement_type: string
  game_type: string | null
  target_value: number
  reward_credits: number
  reward_exp: number
  sort_order: number
  tier: string
}

interface UserMission {
  id: string
  progress: number
  completed: boolean
  claimed: boolean
  period_start: string
  period_end: string
  completed_at: string | null
  claimed_at: string | null
  mission: Mission
}

const iconMap: Record<string, React.ReactNode> = {
  trophy: <Trophy className="w-5 h-5" />,
  coins: <Coins className="w-5 h-5" />,
  'gamepad-2': <Gamepad2 className="w-5 h-5" />,
  target: <Target className="w-5 h-5" />,
  flame: <Flame className="w-5 h-5" />,
  star: <Star className="w-5 h-5" />,
  crown: <Crown className="w-5 h-5" />,
  award: <Award className="w-5 h-5" />,
  shield: <Shield className="w-5 h-5" />,
  zap: <Zap className="w-5 h-5" />,
  gem: <Gem className="w-5 h-5" />,
  medal: <Medal className="w-5 h-5" />,
  cherry: <Star className="w-5 h-5" />,
  spade: <Shield className="w-5 h-5" />,
  'trending-up': <Flame className="w-5 h-5" />,
  'circle-dot': <Target className="w-5 h-5" />,
  sparkles: <Gem className="w-5 h-5" />,
}

const tierColors: Record<string, { bg: string; border: string; text: string }> = {
  bronze: { bg: 'bg-amber-900/20', border: 'border-amber-700/30', text: 'text-amber-500' },
  silver: { bg: 'bg-gray-400/10', border: 'border-gray-400/30', text: 'text-gray-300' },
  gold: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  diamond: { bg: 'bg-cyan-400/10', border: 'border-cyan-400/30', text: 'text-cyan-400' },
}

const frequencyLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  one_time: 'Achievements',
}

export default function MissionsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [missions, setMissions] = useState<UserMission[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('daily')
  const [claiming, setClaiming] = useState<string | null>(null)

  const fetchMissions = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch('/api/missions')
      const data = await res.json()
      if (res.ok) setMissions(data.missions)
    } catch (err) {
      console.error('Failed to fetch missions:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    fetchMissions()
  }, [user, authLoading, router, fetchMissions])

  const handleClaim = async (userMissionId: string) => {
    setClaiming(userMissionId)
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMissionId }),
      })
      if (res.ok) {
        await fetchMissions()
      }
    } catch (err) {
      console.error('Failed to claim:', err)
    } finally {
      setClaiming(null)
    }
  }

  const filtered = missions.filter(um => {
    const m = um.mission
    return m?.frequency === activeTab
  })

  const completedCount = filtered.filter(um => um.completed).length
  const totalCount = filtered.length

  const getTimeRemaining = (periodEnd: string) => {
    const diff = new Date(periodEnd).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--casino-accent)] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push('/')} className="text-[var(--casino-text-muted)] hover:text-white transition cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Trophy className="w-7 h-7 text-[var(--casino-accent)]" />
          <div>
            <h1 className="text-2xl font-bold text-white">Missions</h1>
            <p className="text-xs text-[var(--casino-text-muted)]">Complete missions to earn bonus credits & XP</p>
          </div>
        </div>

        {/* Progress Summary */}
        <Card hover={false} className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--casino-text-muted)]">{frequencyLabels[activeTab]} Progress</p>
              <p className="text-2xl font-bold text-white">{completedCount} / {totalCount}</p>
            </div>
            {activeTab !== 'one_time' && filtered[0] && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--casino-text-muted)]">
                <Clock className="w-3.5 h-3.5" />
                Resets in {getTimeRemaining(filtered[0].period_end)}
              </div>
            )}
          </div>
          {totalCount > 0 && (
            <div className="mt-3 h-2 bg-[var(--casino-bg)] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[var(--casino-accent)] to-[var(--casino-gold)]"
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </Card>

        {/* Tab Bar */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {['daily', 'weekly', 'monthly', 'one_time'].map((tab) => {
            const tabMissions = missions.filter(um => um.mission?.frequency === tab)
            const tabCompleted = tabMissions.filter(um => um.completed).length
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-2',
                  activeTab === tab
                    ? 'bg-[var(--casino-accent)]/20 text-[var(--casino-accent)] border border-[var(--casino-accent)]/30'
                    : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)] border border-[var(--casino-border)] hover:text-white'
                )}
              >
                {frequencyLabels[tab]}
                {tabMissions.length > 0 && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full',
                    tabCompleted === tabMissions.length
                      ? 'bg-[var(--casino-green)]/20 text-[var(--casino-green)]'
                      : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)]'
                  )}>
                    {tabCompleted}/{tabMissions.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Mission List */}
        {filtered.length === 0 ? (
          <Card hover={false} className="text-center py-12">
            <Trophy className="w-12 h-12 text-[var(--casino-text-muted)]/40 mx-auto mb-4" />
            <p className="text-[var(--casino-text-muted)]">No missions available</p>
            <p className="text-sm text-[var(--casino-text-muted)]/60 mt-1">Play some games to unlock missions!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((um, i) => {
              const m = um.mission
              if (!m) return null
              const tc = tierColors[m.tier] || tierColors.bronze
              const progress = Math.min(um.progress, m.target_value)
              const pct = (progress / m.target_value) * 100

              return (
                <motion.div
                  key={um.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card hover={false} className={cn(
                    'relative overflow-hidden',
                    um.claimed && 'opacity-60'
                  )}>
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                        tc.bg, tc.border, 'border'
                      )}>
                        <span className={tc.text}>
                          {iconMap[m.icon] || <Trophy className="w-5 h-5" />}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-white">{m.title}</h3>
                          <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded', tc.bg, tc.text)}>
                            {m.tier}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--casino-text-muted)] mb-2">{m.description}</p>

                        {/* Progress Bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[var(--casino-bg)] rounded-full overflow-hidden">
                            <motion.div
                              className={cn(
                                'h-full rounded-full',
                                um.completed
                                  ? 'bg-[var(--casino-green)]'
                                  : 'bg-gradient-to-r from-[var(--casino-accent)] to-[var(--casino-gold)]'
                              )}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, delay: i * 0.04 }}
                            />
                          </div>
                          <span className="text-xs text-[var(--casino-text-muted)] whitespace-nowrap font-mono">
                            {progress >= 1000 ? `${(progress / 1000).toFixed(1)}k` : Math.floor(progress)}
                            /
                            {m.target_value >= 1000 ? `${(m.target_value / 1000).toFixed(1)}k` : m.target_value}
                          </span>
                        </div>

                        {/* Rewards */}
                        <div className="flex items-center gap-3 mt-2">
                          {m.reward_credits > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-[var(--casino-accent)]">
                              <Coins className="w-3 h-3" />
                              +{m.reward_credits.toLocaleString()} credits
                            </span>
                          )}
                          {m.reward_exp > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-[var(--casino-purple-light)]">
                              <Star className="w-3 h-3" />
                              +{m.reward_exp} XP
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Claim Button */}
                      <div className="flex-shrink-0 self-center">
                        {um.claimed ? (
                          <div className="flex items-center gap-1 text-xs text-[var(--casino-green)]">
                            <Check className="w-4 h-4" />
                            Claimed
                          </div>
                        ) : um.completed ? (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleClaim(um.id)}
                            disabled={claiming === um.id}
                            className="flex items-center gap-1.5"
                          >
                            {claiming === um.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Gift className="w-3.5 h-3.5" />
                            )}
                            Claim
                          </Button>
                        ) : (
                          <span className="text-xs text-[var(--casino-text-muted)]">
                            {Math.floor(pct)}%
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
