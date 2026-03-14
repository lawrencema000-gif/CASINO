'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy, Flame, Gamepad2, Star, Crown, Medal,
  ArrowLeft, Loader2, ChevronUp, Shield, User
} from 'lucide-react'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface LeaderboardProfile {
  id: string
  username: string
  avatar_url: string | null
  total_won: number
  total_wagered: number
  games_played: number
  level: number
  exp: number
  vip_tier: string
}

type Category = 'wins' | 'wagered' | 'active' | 'level'

const TABS: { key: Category; label: string; icon: typeof Trophy; column: keyof LeaderboardProfile }[] = [
  { key: 'wins', label: 'Top Winners', icon: Trophy, column: 'total_won' },
  { key: 'wagered', label: 'High Rollers', icon: Flame, column: 'total_wagered' },
  { key: 'active', label: 'Most Active', icon: Gamepad2, column: 'games_played' },
  { key: 'level', label: 'Highest Level', icon: Star, column: 'level' },
]

const VIP_COLORS: Record<string, string> = {
  bronze: 'from-[#cd7f32] to-[#a0522d]',
  silver: 'from-[#c0c0c0] to-[#808080]',
  gold: 'from-[#c9a227] to-[#e6c84a]',
  platinum: 'from-[#e5e4e2] to-[#b0b0b0]',
  diamond: 'from-[#b9f2ff] to-[#00bcd4]',
}

function formatStat(value: number, category: Category): string {
  if (category === 'active') return value.toLocaleString() + ' games'
  if (category === 'level') return 'Lvl ' + value.toLocaleString()
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0 })
}

function VipBadge({ tier }: { tier: string }) {
  const t = tier.toLowerCase()
  const gradient = VIP_COLORS[t] || VIP_COLORS.bronze
  return (
    <span className={cn(
      'inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-gradient-to-r text-black whitespace-nowrap',
      gradient
    )}>
      {tier}
    </span>
  )
}

function AvatarPlaceholder({ username, size = 'sm' }: { username: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-lg', lg: 'w-16 h-16 text-2xl' }
  return (
    <div className={cn(
      'rounded-full bg-gradient-to-br from-[var(--casino-accent)] to-[var(--casino-purple)] flex items-center justify-center font-black text-white flex-shrink-0',
      sizes[size]
    )}>
      {username ? username.charAt(0).toUpperCase() : '?'}
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 px-4 animate-pulse">
      <div className="w-6 h-4 bg-zinc-800 rounded" />
      <div className="w-8 h-8 bg-zinc-800 rounded-full" />
      <div className="flex-1">
        <div className="w-24 h-4 bg-zinc-800 rounded mb-1" />
        <div className="w-16 h-3 bg-zinc-800 rounded" />
      </div>
      <div className="w-20 h-4 bg-zinc-800 rounded" />
    </div>
  )
}

export default function LeaderboardsPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<Category>('wins')
  const [data, setData] = useState<Record<Category, LeaderboardProfile[]>>({
    wins: [], wagered: [], active: [], level: [],
  })
  const [loading, setLoading] = useState(true)
  const [userRank, setUserRank] = useState<number | null>(null)

  const currentTabConfig = TABS.find(t => t.key === activeTab)!

  const fetchLeaderboard = useCallback(async (category: Category) => {
    const columnMap: Record<Category, string> = {
      wins: 'total_won',
      wagered: 'total_wagered',
      active: 'games_played',
      level: 'level',
    }
    const supabase = createClient()
    const { data: rows } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, total_won, total_wagered, games_played, level, exp, vip_tier')
      .order(columnMap[category], { ascending: false })
      .limit(50)

    return rows as LeaderboardProfile[] | null
  }, [])

  // Fetch the user's rank for the active category
  const fetchUserRank = useCallback(async (category: Category) => {
    if (!user) return null
    const columnMap: Record<Category, string> = {
      wins: 'total_won',
      wagered: 'total_wagered',
      active: 'games_played',
      level: 'level',
    }
    const col = columnMap[category]
    const supabase = createClient()

    // Get current user's stat value
    const { data: myProfile } = await supabase
      .from('profiles')
      .select(col)
      .eq('id', user.id)
      .single()

    if (!myProfile) return null
    const myValue = (myProfile as unknown as Record<string, number>)[col]

    // Count how many players have a higher value
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gt(col, myValue)

    return count !== null ? count + 1 : null
  }, [user])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const load = async () => {
      const [rows, rank] = await Promise.all([
        fetchLeaderboard(activeTab),
        fetchUserRank(activeTab),
      ])
      if (cancelled) return
      if (rows) {
        setData(prev => ({ ...prev, [activeTab]: rows }))
      }
      setUserRank(rank)
      setLoading(false)
    }
    load()

    return () => { cancelled = true }
  }, [activeTab, fetchLeaderboard, fetchUserRank])

  const leaderboard = data[activeTab]
  const top3 = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)

  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3
  const podiumRanks = top3.length === 3 ? [2, 1, 3] : top3.map((_, i) => i + 1)
  const podiumHeights = ['h-28', 'h-36', 'h-24']
  const podiumColors = ['bg-gradient-to-t from-zinc-400/20 to-zinc-400/5', 'bg-gradient-to-t from-[#FFD700]/20 to-[#FFD700]/5', 'bg-gradient-to-t from-[#cd7f32]/20 to-[#cd7f32]/5']
  const crownColors = ['text-zinc-300', 'text-[#FFD700]', 'text-[#cd7f32]']
  const borderColors = ['border-zinc-400/40', 'border-[#FFD700]/40', 'border-[#cd7f32]/40']
  const rankLabels = ['2nd', '1st', '3rd']

  const isUserInList = user && leaderboard.some(p => p.id === user.id)

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-[var(--casino-text-muted)] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-[#FFD700]" />
              Leaderboards
            </h1>
            <p className="text-sm text-[var(--casino-text-muted)]">See who&apos;s dominating the tables</p>
          </div>
        </div>

        {/* Current User Rank Banner */}
        {user && profile && userRank !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <div className="flex items-center gap-3 bg-[var(--casino-accent)]/10 border border-[var(--casino-accent)]/30 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <ChevronUp className="w-4 h-4 text-[var(--casino-accent)]" />
                <span className="text-sm text-[var(--casino-text-muted)]">Your rank:</span>
                <span className="text-lg font-black text-[var(--casino-accent)]">#{userRank}</span>
              </div>
              <span className="text-sm text-[var(--casino-text-muted)]">|</span>
              <span className="text-sm text-white font-semibold">{profile.username}</span>
              <div className="ml-auto">
                <VipBadge tier={profile.vip_tier || 'bronze'} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-[var(--casino-card)] border border-[var(--casino-border)] rounded-xl p-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex-1 justify-center',
                  isActive
                    ? 'bg-gradient-to-r from-[var(--casino-accent)]/20 to-[var(--casino-accent)]/5 text-[var(--casino-accent)] border border-[var(--casino-accent)]/30'
                    : 'text-[var(--casino-text-muted)] hover:text-white hover:bg-[var(--casino-surface)]'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? (
              <Card hover={false}>
                <div className="space-y-1">
                  {/* Podium skeleton */}
                  <div className="flex items-end justify-center gap-4 py-8">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                        <div className="w-12 h-12 bg-zinc-800 rounded-full" />
                        <div className="w-16 h-3 bg-zinc-800 rounded" />
                        <div className={cn('w-20 rounded-t-lg bg-zinc-800/50', i === 1 ? 'h-28' : i === 0 ? 'h-20' : 'h-16')} />
                      </div>
                    ))}
                  </div>
                  {Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}
                </div>
              </Card>
            ) : leaderboard.length === 0 ? (
              <Card hover={false}>
                <div className="text-center py-16">
                  <User className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                  <p className="text-lg font-semibold text-white mb-1">No players yet</p>
                  <p className="text-sm text-[var(--casino-text-muted)]">Be the first to claim the top spot!</p>
                </div>
              </Card>
            ) : (
              <>
                {/* Podium - Top 3 */}
                {top3.length >= 3 && (
                  <div className="mb-4">
                    <div className="flex items-end justify-center gap-3 sm:gap-6 pt-8 pb-2">
                      {podiumOrder.map((player, i) => (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.15 }}
                          className="flex flex-col items-center"
                        >
                          {/* Crown / Medal */}
                          <div className={cn('mb-1', crownColors[i])}>
                            {podiumRanks[i] === 1 ? (
                              <Crown className="w-7 h-7" />
                            ) : (
                              <Medal className="w-5 h-5" />
                            )}
                          </div>

                          {/* Avatar */}
                          <div className={cn(
                            'relative rounded-full border-2 p-0.5 mb-2',
                            borderColors[i]
                          )}>
                            <AvatarPlaceholder
                              username={player.username}
                              size={podiumRanks[i] === 1 ? 'lg' : 'md'}
                            />
                          </div>

                          {/* Name & stat */}
                          <p className={cn(
                            'font-bold text-white text-center truncate max-w-[80px] sm:max-w-[120px]',
                            podiumRanks[i] === 1 ? 'text-sm' : 'text-xs'
                          )}>
                            {player.username}
                          </p>
                          <p className={cn(
                            'font-semibold mt-0.5',
                            podiumRanks[i] === 1 ? 'text-[#FFD700] text-sm' :
                            podiumRanks[i] === 2 ? 'text-zinc-300 text-xs' :
                            'text-[#cd7f32] text-xs'
                          )}>
                            {formatStat(player[currentTabConfig.column] as number, activeTab)}
                          </p>
                          <VipBadge tier={player.vip_tier || 'bronze'} />

                          {/* Podium block */}
                          <div className={cn(
                            'w-20 sm:w-24 rounded-t-lg mt-2 flex items-center justify-center',
                            podiumHeights[i],
                            podiumColors[i],
                            'border-t border-l border-r',
                            borderColors[i]
                          )}>
                            <span className={cn('text-2xl font-black', crownColors[i])}>
                              {rankLabels[i]}
                            </span>
                          </div>

                          {/* Highlight current user */}
                          {user && player.id === user.id && (
                            <span className="text-[10px] text-[var(--casino-accent)] font-bold mt-1">YOU</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Table for ranks 4-50 */}
                {rest.length > 0 && (
                  <Card hover={false}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--casino-border)]">
                            <th className="text-left py-3 px-3 text-[var(--casino-text-muted)] font-medium text-xs w-12">Rank</th>
                            <th className="text-left py-3 px-3 text-[var(--casino-text-muted)] font-medium text-xs">Player</th>
                            <th className="text-right py-3 px-3 text-[var(--casino-text-muted)] font-medium text-xs hidden sm:table-cell">VIP</th>
                            <th className="text-right py-3 px-3 text-[var(--casino-text-muted)] font-medium text-xs">{currentTabConfig.label}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rest.map((player, i) => {
                            const rank = i + 4
                            const isCurrentUser = user && player.id === user.id
                            return (
                              <motion.tr
                                key={player.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.02 * i }}
                                className={cn(
                                  'border-b border-[var(--casino-border)]/50 transition-colors',
                                  isCurrentUser
                                    ? 'bg-[var(--casino-accent)]/10 border-l-2 border-l-[var(--casino-accent)]'
                                    : 'hover:bg-[var(--casino-surface)]'
                                )}
                              >
                                <td className="py-3 px-3">
                                  <span className={cn(
                                    'text-sm font-bold',
                                    isCurrentUser ? 'text-[var(--casino-accent)]' : 'text-[var(--casino-text-muted)]'
                                  )}>
                                    #{rank}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-3">
                                    <AvatarPlaceholder username={player.username} size="sm" />
                                    <div>
                                      <p className={cn(
                                        'font-semibold',
                                        isCurrentUser ? 'text-[var(--casino-accent)]' : 'text-white'
                                      )}>
                                        {player.username}
                                        {isCurrentUser && (
                                          <span className="ml-2 text-[10px] bg-[var(--casino-accent)]/20 text-[var(--casino-accent)] px-1.5 py-0.5 rounded-full font-bold">
                                            YOU
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-xs text-[var(--casino-text-muted)] sm:hidden">
                                        {player.vip_tier}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right hidden sm:table-cell">
                                  <VipBadge tier={player.vip_tier || 'bronze'} />
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <span className={cn(
                                    'font-bold text-sm',
                                    isCurrentUser ? 'text-[var(--casino-accent)]' : 'text-white'
                                  )}>
                                    {formatStat(player[currentTabConfig.column] as number, activeTab)}
                                  </span>
                                </td>
                              </motion.tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {/* If user is not in the top 50, show their position */}
                {user && profile && !isUserInList && userRank !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <Card hover={false} glow="gold">
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-black text-[var(--casino-accent)]">#{userRank}</span>
                        <AvatarPlaceholder username={profile.username || ''} size="sm" />
                        <div className="flex-1">
                          <p className="font-semibold text-[var(--casino-accent)]">
                            {profile.username}
                            <span className="ml-2 text-[10px] bg-[var(--casino-accent)]/20 text-[var(--casino-accent)] px-1.5 py-0.5 rounded-full font-bold">
                              YOU
                            </span>
                          </p>
                        </div>
                        <VipBadge tier={profile.vip_tier || 'bronze'} />
                        <span className="font-bold text-white">
                          {formatStat(
                            (profile as unknown as LeaderboardProfile)[currentTabConfig.column] as number || 0,
                            activeTab
                          )}
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
