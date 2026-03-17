'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, ArrowLeft, Star, Lock, Loader2, Gift, Shield, Crown,
  Gamepad2, Users, Target, Filter
} from 'lucide-react'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  reward: number
  tier: string
  unlocked: boolean
  unlockedAt: string | null
}

interface AchievementsData {
  achievements: Achievement[]
  stats: Record<string, number | string>
  totalUnlocked: number
  totalAchievements: number
  newlyUnlocked: string[]
}

const tierColors: Record<string, string> = {
  bronze: 'from-[#cd7f32] to-[#a0522d]',
  silver: 'from-[#c0c0c0] to-[#808080]',
  gold: 'from-[#FFD700] to-[#c9a227]',
  platinum: 'from-[#e5e4e2] to-[#b0b0b0]',
  diamond: 'from-[#b9f2ff] to-[#00bcd4]',
}

const categoryIcons: Record<string, React.ReactNode> = {
  games: <Gamepad2 className="w-4 h-4" />,
  milestones: <Target className="w-4 h-4" />,
  vip: <Crown className="w-4 h-4" />,
  social: <Users className="w-4 h-4" />,
}

export default function AchievementsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<AchievementsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirectTo=/achievements')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return
    fetch('/api/achievements')
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--casino-accent)] animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const filtered = data.achievements.filter((a) => {
    if (filter !== 'all' && a.category !== filter) return false
    if (showUnlockedOnly && !a.unlocked) return false
    return true
  })

  const categories = ['all', 'games', 'milestones', 'vip', 'social']
  const progressPct = Math.round((data.totalUnlocked / data.totalAchievements) * 100)

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-[var(--casino-text-muted)] hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Trophy className="w-7 h-7 text-[var(--casino-accent)]" />
          <h1 className="text-2xl font-bold text-white">Achievements</h1>
        </div>

        {/* Progress Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card hover={false} glow="gold" className="mb-8 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Your Progress</h2>
                <p className="text-sm text-[var(--casino-text-muted)]">
                  {data.totalUnlocked} of {data.totalAchievements} achievements unlocked
                </p>
              </div>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#c9a227]">
                {progressPct}%
              </div>
            </div>
            <div className="w-full h-3 rounded-full bg-[var(--casino-border)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#c9a227] to-[#FFD700]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </Card>
        </motion.div>

        {/* Newly Unlocked */}
        <AnimatePresence>
          {data.newlyUnlocked.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-xl border border-[var(--casino-accent)]/30 bg-[var(--casino-accent)]/5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-[var(--casino-accent)]" />
                <h3 className="font-bold text-[var(--casino-accent)]">New Achievements Unlocked!</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.newlyUnlocked.map((id) => {
                  const a = data.achievements.find((x) => x.id === id)
                  if (!a) return null
                  return (
                    <span key={id} className="px-3 py-1 rounded-full bg-[var(--casino-accent)]/10 text-sm text-[var(--casino-accent)] font-medium">
                      {a.icon} {a.name} (+{a.reward.toLocaleString()})
                    </span>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
                filter === cat
                  ? 'bg-[var(--casino-accent)] text-black'
                  : 'bg-[var(--casino-card)] text-[var(--casino-text-muted)] hover:text-white border border-[var(--casino-border)]'
              )}
            >
              {cat !== 'all' && categoryIcons[cat]}
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
          <div className="ml-auto">
            <button
              onClick={() => setShowUnlockedOnly(!showUnlockedOnly)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
                showUnlockedOnly
                  ? 'bg-[var(--casino-green)]/20 text-[var(--casino-green)] border border-[var(--casino-green)]/30'
                  : 'bg-[var(--casino-card)] text-[var(--casino-text-muted)] border border-[var(--casino-border)]'
              )}
            >
              <Filter className="w-3 h-3" />
              {showUnlockedOnly ? 'Showing Unlocked' : 'Show All'}
            </button>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((achievement, i) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div
                className={cn(
                  'relative rounded-xl border p-4 transition-all',
                  achievement.unlocked
                    ? 'bg-[var(--casino-card)] border-[var(--casino-accent)]/30 hover:border-[var(--casino-accent)]/60'
                    : 'bg-[var(--casino-card)]/50 border-[var(--casino-border)] opacity-60'
                )}
              >
                {/* Tier badge */}
                <div className={cn(
                  'absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gradient-to-r text-white',
                  tierColors[achievement.tier]
                )}>
                  {achievement.tier}
                </div>

                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0',
                    achievement.unlocked
                      ? 'bg-[var(--casino-accent)]/10'
                      : 'bg-[var(--casino-border)]/30'
                  )}>
                    {achievement.unlocked ? achievement.icon : <Lock className="w-5 h-5 text-[var(--casino-text-muted)]" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className={cn(
                      'font-bold text-sm',
                      achievement.unlocked ? 'text-white' : 'text-[var(--casino-text-muted)]'
                    )}>
                      {achievement.name}
                    </h3>
                    <p className="text-xs text-[var(--casino-text-muted)] mt-0.5">{achievement.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-semibold text-[var(--casino-accent)]">
                        +{achievement.reward.toLocaleString()} credits
                      </span>
                      {achievement.unlocked && (
                        <span className="text-[10px] text-[var(--casino-green)] font-medium flex items-center gap-0.5">
                          <Star className="w-3 h-3" /> Unlocked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-[var(--casino-text-muted)] mx-auto mb-3" />
            <p className="text-[var(--casino-text-muted)]">No achievements match your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
