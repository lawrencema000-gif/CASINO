'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Gamepad2, Loader2, AlertTriangle, ArrowLeft, ToggleLeft, ToggleRight,
  TrendingUp, DollarSign, BarChart3, Settings, Check, X
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface GameCatalog {
  id: string
  game_type: string
  name: string
  enabled: boolean
  min_bet: number
  max_bet: number
  max_payout: number
  house_edge: number
  total_bets: number
  total_wagered: number
  total_payout: number
}

interface GameStats {
  game_type: string
  total_bets: number
  total_wagered: number
  total_payout: number
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

const GAME_TYPE_COLORS: Record<string, string> = {
  slots: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  blackjack: 'bg-green-500/20 text-green-400 border-green-500/30',
  roulette: 'bg-red-500/20 text-red-400 border-red-500/30',
  dice: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  crash: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  coinflip: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  plinko: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  poker: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  mines: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  keno: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  limbo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  hilo: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
}

// Default game catalog when no DB table exists
const DEFAULT_GAMES: GameCatalog[] = [
  { id: '1', game_type: 'slots', name: 'Slots', enabled: true, min_bet: 10, max_bet: 100000, max_payout: 1000000, house_edge: 0.03, total_bets: 0, total_wagered: 0, total_payout: 0 },
  { id: '2', game_type: 'blackjack', name: 'Blackjack', enabled: true, min_bet: 50, max_bet: 50000, max_payout: 500000, house_edge: 0.02, total_bets: 0, total_wagered: 0, total_payout: 0 },
  { id: '3', game_type: 'roulette', name: 'Roulette', enabled: true, min_bet: 10, max_bet: 100000, max_payout: 3500000, house_edge: 0.027, total_bets: 0, total_wagered: 0, total_payout: 0 },
  { id: '4', game_type: 'dice', name: 'Dice', enabled: true, min_bet: 10, max_bet: 100000, max_payout: 990000, house_edge: 0.01, total_bets: 0, total_wagered: 0, total_payout: 0 },
  { id: '5', game_type: 'crash', name: 'Crash', enabled: true, min_bet: 10, max_bet: 50000, max_payout: 500000, house_edge: 0.04, total_bets: 0, total_wagered: 0, total_payout: 0 },
  { id: '6', game_type: 'coinflip', name: 'Coin Flip', enabled: true, min_bet: 10, max_bet: 100000, max_payout: 200000, house_edge: 0.02, total_bets: 0, total_wagered: 0, total_payout: 0 },
  { id: '7', game_type: 'plinko', name: 'Plinko', enabled: true, min_bet: 10, max_bet: 50000, max_payout: 500000, house_edge: 0.03, total_bets: 0, total_wagered: 0, total_payout: 0 },
  { id: '8', game_type: 'mines', name: 'Mines', enabled: true, min_bet: 10, max_bet: 50000, max_payout: 1000000, house_edge: 0.03, total_bets: 0, total_wagered: 0, total_payout: 0 },
  { id: '9', game_type: 'keno', name: 'Keno', enabled: true, min_bet: 10, max_bet: 50000, max_payout: 500000, house_edge: 0.05, total_bets: 0, total_wagered: 0, total_payout: 0 },
  { id: '10', game_type: 'limbo', name: 'Limbo', enabled: true, min_bet: 10, max_bet: 100000, max_payout: 1000000, house_edge: 0.01, total_bets: 0, total_wagered: 0, total_payout: 0 },
  { id: '11', game_type: 'hilo', name: 'HiLo', enabled: true, min_bet: 10, max_bet: 50000, max_payout: 500000, house_edge: 0.02, total_bets: 0, total_wagered: 0, total_payout: 0 },
  { id: '12', game_type: 'poker', name: 'Video Poker', enabled: true, min_bet: 50, max_bet: 50000, max_payout: 500000, house_edge: 0.025, total_bets: 0, total_wagered: 0, total_payout: 0 },
]

export default function GameManagementPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [isAdmin, setIsAdmin] = useState(false)
  const [games, setGames] = useState<GameCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [editingGame, setEditingGame] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ min_bet: number; max_bet: number; max_payout: number }>({ min_bet: 0, max_bet: 0, max_payout: 0 })
  const [saveResult, setSaveResult] = useState<{ id: string; success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (authLoading || !user) return
    fetch('/api/admin/stats').then(res => {
      if (res.ok) setIsAdmin(true)
    }).catch(() => {})
  }, [authLoading, user])

  const fetchGames = useCallback(async () => {
    setLoading(true)
    try {
      // Get game stats from games table
      const { data: gameStats } = await supabase
        .from('games')
        .select('game_type, bet_amount, payout')

      // Aggregate stats by game type
      const statsMap: Record<string, GameStats> = {}
      for (const g of gameStats || []) {
        if (!statsMap[g.game_type]) {
          statsMap[g.game_type] = { game_type: g.game_type, total_bets: 0, total_wagered: 0, total_payout: 0 }
        }
        statsMap[g.game_type].total_bets++
        statsMap[g.game_type].total_wagered += Number(g.bet_amount) || 0
        statsMap[g.game_type].total_payout += Number(g.payout) || 0
      }

      // Try to load from game_catalog table, fallback to defaults
      const { data: catalog, error: catalogError } = await supabase
        .from('game_catalog')
        .select('*')

      let gameList: GameCatalog[]
      if (catalogError || !catalog || catalog.length === 0) {
        // Use defaults enriched with stats
        gameList = DEFAULT_GAMES.map(g => ({
          ...g,
          total_bets: statsMap[g.game_type]?.total_bets || 0,
          total_wagered: statsMap[g.game_type]?.total_wagered || 0,
          total_payout: statsMap[g.game_type]?.total_payout || 0,
        }))
      } else {
        gameList = catalog.map((g: GameCatalog) => ({
          ...g,
          total_bets: statsMap[g.game_type]?.total_bets || g.total_bets || 0,
          total_wagered: statsMap[g.game_type]?.total_wagered || g.total_wagered || 0,
          total_payout: statsMap[g.game_type]?.total_payout || g.total_payout || 0,
        }))
      }

      setGames(gameList)
    } catch {
      console.error('Failed to fetch games')
      setGames(DEFAULT_GAMES)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (!isAdmin) return
    fetchGames()
  }, [isAdmin, fetchGames])

  const toggleGame = async (gameId: string, gameType: string, currentEnabled: boolean) => {
    setToggling(gameId)
    try {
      // Try to update game_catalog, if it doesn't exist just update local state
      await supabase
        .from('game_catalog')
        .update({ enabled: !currentEnabled })
        .eq('id', gameId)

      setGames(prev => prev.map(g => g.id === gameId ? { ...g, enabled: !currentEnabled } : g))
    } catch {
      console.error('Failed to toggle game')
    } finally {
      setToggling(null)
    }
  }

  const startEditing = (game: GameCatalog) => {
    setEditingGame(game.id)
    setEditValues({ min_bet: game.min_bet, max_bet: game.max_bet, max_payout: game.max_payout })
    setSaveResult(null)
  }

  const saveGameConfig = async (gameId: string) => {
    setSaveResult(null)
    try {
      await supabase
        .from('game_catalog')
        .update(editValues)
        .eq('id', gameId)

      setGames(prev => prev.map(g => g.id === gameId ? { ...g, ...editValues } : g))
      setSaveResult({ id: gameId, success: true, message: 'Saved' })
      setTimeout(() => { setEditingGame(null); setSaveResult(null) }, 1000)
    } catch {
      setSaveResult({ id: gameId, success: false, message: 'Failed to save' })
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Loader2 className="w-8 h-8 text-[var(--gold)]" />
        </motion.div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">You do not have permission to manage games.</p>
          <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
            Return Home
          </button>
        </motion.div>
      </div>
    )
  }

  // Calculate totals
  const totalBets = games.reduce((s, g) => s + g.total_bets, 0)
  const totalWagered = games.reduce((s, g) => s + g.total_wagered, 0)
  const totalPayout = games.reduce((s, g) => s + g.total_payout, 0)
  const houseProfit = totalWagered - totalPayout

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-[var(--gold)]" />
                Game Management
              </h1>
              <p className="text-sm text-gray-400">{games.length} games in catalog</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-purple-500/10 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Total Bets</span>
              <Gamepad2 className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-2xl font-bold">{formatNumber(totalBets)}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-yellow-500/10 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Total Wagered</span>
              <TrendingUp className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-2xl font-bold">{formatNumber(totalWagered)}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-green-500/10 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">Total Payout</span>
              <DollarSign className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-2xl font-bold">{formatNumber(totalPayout)}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={`${houseProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'} border border-gray-800 rounded-xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">House Profit</span>
              <BarChart3 className="w-5 h-5 text-gray-500" />
            </div>
            <p className={`text-2xl font-bold ${houseProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {houseProfit >= 0 ? '+' : ''}{formatNumber(houseProfit)}
            </p>
          </motion.div>
        </div>

        {/* Games Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[var(--gold)] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game, i) => {
              const colorClass = GAME_TYPE_COLORS[game.game_type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
              const actualEdge = game.total_wagered > 0
                ? ((game.total_wagered - game.total_payout) / game.total_wagered)
                : 0
              const isEditing = editingGame === game.id

              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.03 }}
                  className={`bg-gray-900 border rounded-xl overflow-hidden transition-all ${
                    game.enabled ? 'border-gray-800' : 'border-red-500/20 opacity-70'
                  }`}
                >
                  <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize border ${colorClass}`}>
                        {game.game_type}
                      </span>
                      <span className="font-semibold">{game.name}</span>
                    </div>
                    <button
                      onClick={() => toggleGame(game.id, game.game_type, game.enabled)}
                      disabled={toggling === game.id}
                      className="flex items-center"
                    >
                      {toggling === game.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      ) : game.enabled ? (
                        <ToggleRight className="w-8 h-5 text-green-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-5 text-red-400" />
                      )}
                    </button>
                  </div>
                  <div className="p-5 space-y-3">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Bets</p>
                        <p className="font-semibold text-sm">{formatNumber(game.total_bets)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Wagered</p>
                        <p className="font-semibold text-sm">{formatNumber(game.total_wagered)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Payout</p>
                        <p className="font-semibold text-sm">{formatNumber(game.total_payout)}</p>
                      </div>
                    </div>

                    {/* House Edge Comparison */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">House Edge (theoretical)</span>
                      <span className="text-gray-300">{(game.house_edge * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">House Edge (actual)</span>
                      <span className={`font-medium ${actualEdge >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {game.total_wagered > 0 ? `${(actualEdge * 100).toFixed(2)}%` : 'N/A'}
                      </span>
                    </div>

                    {/* Config */}
                    {isEditing ? (
                      <div className="space-y-2 pt-2 border-t border-gray-800">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-500 block">Min Bet</label>
                            <input
                              type="number"
                              value={editValues.min_bet}
                              onChange={(e) => setEditValues(v => ({ ...v, min_bet: Number(e.target.value) }))}
                              className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-[var(--gold)]/50"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 block">Max Bet</label>
                            <input
                              type="number"
                              value={editValues.max_bet}
                              onChange={(e) => setEditValues(v => ({ ...v, max_bet: Number(e.target.value) }))}
                              className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-[var(--gold)]/50"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 block">Max Pay</label>
                            <input
                              type="number"
                              value={editValues.max_payout}
                              onChange={(e) => setEditValues(v => ({ ...v, max_payout: Number(e.target.value) }))}
                              className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-[var(--gold)]/50"
                            />
                          </div>
                        </div>
                        {saveResult && saveResult.id === game.id && (
                          <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${saveResult.success ? 'text-green-400' : 'text-red-400'}`}>
                            {saveResult.success ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {saveResult.message}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingGame(null); setSaveResult(null) }}
                            className="flex-1 px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveGameConfig(game.id)}
                            className="flex-1 px-2 py-1.5 bg-[var(--gold)] hover:bg-yellow-600 text-gray-900 font-semibold rounded text-xs transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                        <div className="text-xs text-gray-500">
                          Bet: {formatNumber(game.min_bet)} - {formatNumber(game.max_bet)}
                        </div>
                        <button
                          onClick={() => startEditing(game)}
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors flex items-center gap-1"
                        >
                          <Settings className="w-3 h-3" /> Config
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
