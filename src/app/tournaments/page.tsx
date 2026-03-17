'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy, ArrowLeft, Clock, Users, Coins, Zap,
  Calendar, ChevronRight, Loader2, Crown, Star,
  Target, TrendingUp, Gamepad2
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface Tournament {
  id: string
  name: string
  description: string
  game_type: string
  status: string
  entry_fee: number
  prize_pool: number
  max_players: number
  min_players: number
  min_vip_tier: string | null
  starts_at: string
  ends_at: string
  scoring_type: string
  prize_distribution: { place: number; pct: number }[]
  player_count: number
}

interface TournamentEntry {
  id: string
  player_id: string
  score: number
  games_played: number
  best_multiplier: number
  total_wagered: number
  total_won: number
  rank: number | null
  profiles: { username: string; vip_tier: string; avatar_url: string | null }
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  upcoming: { bg: 'bg-[var(--casino-blue)]/10 border-[var(--casino-blue)]/30', text: 'text-[var(--casino-blue)]', label: 'Upcoming' },
  active: { bg: 'bg-[var(--casino-green)]/10 border-[var(--casino-green)]/30', text: 'text-[var(--casino-green)]', label: 'Live' },
  completed: { bg: 'bg-[var(--casino-text-muted)]/10 border-[var(--casino-border)]', text: 'text-[var(--casino-text-muted)]', label: 'Ended' },
  cancelled: { bg: 'bg-[var(--casino-red)]/10 border-[var(--casino-red)]/30', text: 'text-[var(--casino-red)]', label: 'Cancelled' },
}

const scoringLabels: Record<string, string> = {
  highest_multiplier: 'Highest Multiplier',
  total_winnings: 'Total Winnings',
  most_games: 'Most Games Played',
  biggest_win: 'Biggest Single Win',
}

const gameIcons: Record<string, typeof Trophy> = {
  slots: Gamepad2,
  blackjack: Crown,
  crash: TrendingUp,
  plinko: Target,
  roulette: Star,
  dice: Zap,
}

function timeUntil(date: string): string {
  const diff = new Date(date).getTime() - Date.now()
  if (diff <= 0) return 'Started'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hours}h`
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}

function timeRemaining(date: string): string {
  const diff = new Date(date).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hours}h left`
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `${hours}h ${minutes}m left`
}

export default function TournamentsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [entries, setEntries] = useState<TournamentEntry[]>([])
  const [userEntry, setUserEntry] = useState<TournamentEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchTournaments = useCallback(async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await fetch(`/api/tournaments${params}`)
      const data = await res.json()
      if (res.ok) setTournaments(data.tournaments)
    } catch (err) {
      console.error('Failed to fetch tournaments:', err)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchTournaments() }, [fetchTournaments])

  const openTournament = async (t: Tournament) => {
    setSelectedTournament(t)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/tournaments?id=${t.id}`)
      const data = await res.json()
      if (res.ok) {
        setEntries(data.entries)
        setUserEntry(data.user_entry)
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!selectedTournament || !user || joining) return
    setJoining(true)
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: selectedTournament.id }),
      })
      const data = await res.json()
      if (res.ok) {
        await openTournament(selectedTournament)
      } else {
        alert(data.error || 'Failed to join')
      }
    } catch {
      alert('Something went wrong')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--casino-accent)] animate-spin" />
      </div>
    )
  }

  // Detail view
  if (selectedTournament) {
    const t = selectedTournament
    const sc = statusColors[t.status] || statusColors.upcoming
    const GameIcon = gameIcons[t.game_type] || Trophy

    return (
      <div className="min-h-screen bg-[var(--casino-bg)]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => { setSelectedTournament(null); setEntries([]); setUserEntry(null) }}
            className="flex items-center gap-2 text-[var(--casino-text-muted)] hover:text-white transition mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tournaments
          </button>

          {/* Tournament Header */}
          <Card hover={false} className="p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)]/20 to-[var(--casino-purple)]/20 flex items-center justify-center">
                    <GameIcon className="w-5 h-5 text-[var(--casino-accent)]" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{t.name}</h1>
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-medium', sc.bg, sc.text)}>
                      {t.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-current live-pulse" />}
                      {sc.label}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[var(--casino-text-muted)]">{t.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-[var(--casino-border)]">
              <div className="text-center">
                <Coins className="w-5 h-5 text-[var(--casino-accent)] mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{t.prize_pool.toLocaleString()}</p>
                <p className="text-[10px] text-[var(--casino-text-muted)]">Prize Pool</p>
              </div>
              <div className="text-center">
                <Users className="w-5 h-5 text-[var(--casino-blue)] mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{entries.length}/{t.max_players}</p>
                <p className="text-[10px] text-[var(--casino-text-muted)]">Players</p>
              </div>
              <div className="text-center">
                <Trophy className="w-5 h-5 text-[var(--casino-green)] mx-auto mb-1" />
                <p className="text-lg font-bold text-white capitalize">{t.game_type}</p>
                <p className="text-[10px] text-[var(--casino-text-muted)]">Game</p>
              </div>
              <div className="text-center">
                <Target className="w-5 h-5 text-[var(--casino-purple-light)] mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{scoringLabels[t.scoring_type]?.split(' ').slice(0, 2).join(' ')}</p>
                <p className="text-[10px] text-[var(--casino-text-muted)]">Scoring</p>
              </div>
              <div className="text-center">
                <Clock className="w-5 h-5 text-[var(--casino-text-muted)] mx-auto mb-1" />
                <p className="text-lg font-bold text-white">{t.status === 'upcoming' ? timeUntil(t.starts_at) : timeRemaining(t.ends_at)}</p>
                <p className="text-[10px] text-[var(--casino-text-muted)]">{t.status === 'upcoming' ? 'Starts in' : 'Time Left'}</p>
              </div>
            </div>

            {/* Join button */}
            {!userEntry && (t.status === 'upcoming' || t.status === 'active') && user && (
              <div className="mt-4 pt-4 border-t border-[var(--casino-border)]">
                <Button variant="primary" onClick={handleJoin} disabled={joining} className="w-full">
                  {joining ? 'Joining...' : `Join Tournament${t.entry_fee > 0 ? ` (${t.entry_fee} credits)` : ' (Free)'}`}
                </Button>
              </div>
            )}
            {userEntry && (
              <div className="mt-4 pt-4 border-t border-[var(--casino-border)]">
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--casino-green)]/10 border border-[var(--casino-green)]/30">
                  <span className="text-sm text-[var(--casino-green)] font-medium">You&apos;re entered!</span>
                  <span className="text-sm text-white font-bold">Score: {Number(userEntry.score).toFixed(2)}</span>
                </div>
                {t.status === 'active' && (
                  <Button variant="secondary" onClick={() => router.push(`/games/${t.game_type}`)} className="w-full mt-2">
                    Play {t.game_type.charAt(0).toUpperCase() + t.game_type.slice(1)} Now
                  </Button>
                )}
              </div>
            )}
            {!user && (
              <div className="mt-4 pt-4 border-t border-[var(--casino-border)]">
                <Button variant="primary" onClick={() => router.push('/login')} className="w-full">
                  Log in to Join
                </Button>
              </div>
            )}
          </Card>

          {/* Prize Distribution */}
          <Card hover={false} className="p-6 mb-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[var(--casino-accent)]" /> Prize Distribution
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {t.prize_distribution.map((p) => {
                const prizeAmount = Math.floor(t.prize_pool * p.pct / 100)
                const medals = ['', 'text-[var(--gold)]', 'text-gray-300', 'text-amber-600', 'text-[var(--casino-text-muted)]']
                return (
                  <div key={p.place} className="text-center p-3 rounded-xl bg-[var(--casino-surface)] border border-[var(--casino-border)]">
                    <p className={cn('text-lg font-bold', medals[p.place] || 'text-white')}>#{p.place}</p>
                    <p className="text-sm font-semibold text-white">{prizeAmount.toLocaleString()}</p>
                    <p className="text-[10px] text-[var(--casino-text-muted)]">{p.pct}% of pool</p>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Leaderboard */}
          <Card hover={false} className="p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-[var(--casino-accent)]" /> Leaderboard
            </h3>
            {detailLoading ? (
              <div className="text-center py-8"><Loader2 className="w-6 h-6 text-[var(--casino-accent)] animate-spin mx-auto" /></div>
            ) : entries.length === 0 ? (
              <p className="text-center text-[var(--casino-text-muted)] py-8">No participants yet. Be the first to join!</p>
            ) : (
              <div className="space-y-2">
                {entries.map((entry, i) => {
                  const isUser = user && entry.player_id === user.id
                  const rankColors = ['', 'text-[var(--gold)]', 'text-gray-300', 'text-amber-600']
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border',
                        isUser
                          ? 'bg-[var(--casino-accent)]/5 border-[var(--casino-accent)]/30'
                          : 'bg-[var(--casino-surface)] border-[var(--casino-border)]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn('w-8 text-center font-bold', rankColors[i + 1] || 'text-[var(--casino-text-muted)]')}>
                          #{i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">{entry.profiles?.username || 'Unknown'}{isUser && ' (You)'}</p>
                          <p className="text-[10px] text-[var(--casino-text-muted)]">
                            {entry.games_played} games · {entry.total_wagered.toLocaleString()} wagered
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{Number(entry.score).toFixed(2)}</p>
                        <p className="text-[10px] text-[var(--casino-text-muted)]">score</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push('/')} className="text-[var(--casino-text-muted)] hover:text-white transition cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Trophy className="w-7 h-7 text-[var(--casino-accent)]" />
          <div>
            <h1 className="text-2xl font-bold text-white">Tournaments</h1>
            <p className="text-xs text-[var(--casino-text-muted)]">Compete for massive prize pools</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {['all', 'active', 'upcoming', 'completed'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer',
                filter === s
                  ? 'bg-[var(--casino-accent)]/20 text-[var(--casino-accent)] border border-[var(--casino-accent)]/30'
                  : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)] border border-[var(--casino-border)] hover:text-white'
              )}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Tournament Cards */}
        {tournaments.length === 0 ? (
          <Card hover={false} className="text-center py-12">
            <Trophy className="w-12 h-12 text-[var(--casino-text-muted)]/40 mx-auto mb-4" />
            <p className="text-[var(--casino-text-muted)]">No tournaments found</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {tournaments.map((t, i) => {
              const sc = statusColors[t.status] || statusColors.upcoming
              const GameIcon = gameIcons[t.game_type] || Trophy
              const fillPct = Math.min(100, (t.player_count / t.max_players) * 100)

              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card hover className="cursor-pointer" onClick={() => openTournament(t)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--gold)]/20 to-[var(--casino-purple)]/20 flex items-center justify-center flex-shrink-0">
                            <GameIcon className="w-5 h-5 text-[var(--casino-accent)]" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-white">{t.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium', sc.bg, sc.text)}>
                                {t.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-current live-pulse" />}
                                {sc.label}
                              </span>
                              <span className="text-[10px] text-[var(--casino-text-muted)] capitalize">{t.game_type}</span>
                              <span className="text-[10px] text-[var(--casino-text-muted)]">{scoringLabels[t.scoring_type]}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-xs text-[var(--casino-text-muted)]">
                          <span className="flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 text-[var(--casino-accent)]" />
                            <span className="text-white font-semibold">{t.prize_pool.toLocaleString()}</span> prize
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {t.player_count}/{t.max_players}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {t.status === 'upcoming' ? `Starts ${timeUntil(t.starts_at)}` : timeRemaining(t.ends_at)}
                          </span>
                          {t.entry_fee > 0 && (
                            <span className="flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5" />
                              {t.entry_fee} entry
                            </span>
                          )}
                        </div>

                        {/* Fill bar */}
                        <div className="mt-3">
                          <div className="h-1 bg-[var(--casino-bg)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--casino-accent)]/60 rounded-full transition-all"
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-[var(--casino-text-muted)] flex-shrink-0 mt-2" />
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
