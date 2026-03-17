import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return null
  return user
}

// GET — analytics data for dashboard
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(request.url)
    const days = Math.min(Number(url.searchParams.get('days')) || 7, 90)
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceISO = since.toISOString()

    // Fetch all analytics data in parallel
    const [
      dailyGamesRes,
      dailySignupsRes,
      gameTypeRes,
      topPlayersRes,
      vipDistRes,
      revenueRes,
      activeUsersRes,
    ] = await Promise.all([
      // Daily games + wagered + payouts for the period
      supabaseAdmin
        .from('games')
        .select('created_at, bet_amount, payout, game_type')
        .gte('created_at', sinceISO)
        .eq('settled', true)
        .order('created_at', { ascending: true }),

      // Daily signups
      supabaseAdmin
        .from('profiles')
        .select('created_at')
        .gte('created_at', sinceISO),

      // Game type breakdown (all time)
      supabaseAdmin
        .from('games')
        .select('game_type')
        .eq('settled', true),

      // Top players by wagered
      supabaseAdmin
        .from('profiles')
        .select('username, total_wagered, total_won, games_played, vip_tier')
        .order('total_wagered', { ascending: false })
        .limit(10),

      // VIP tier distribution
      supabaseAdmin
        .from('profiles')
        .select('vip_tier'),

      // Revenue: total wagered vs total won across all settled games in period
      supabaseAdmin
        .from('games')
        .select('bet_amount, payout')
        .gte('created_at', sinceISO)
        .eq('settled', true),

      // Active users (users who played at least 1 game in period)
      supabaseAdmin
        .from('games')
        .select('player_id')
        .gte('created_at', sinceISO),
    ])

    // --- Aggregate daily stats ---
    const dailyMap: Record<string, { games: number; wagered: number; payout: number; profit: number }> = {}
    for (const g of dailyGamesRes.data || []) {
      const day = new Date(g.created_at).toISOString().split('T')[0]
      if (!dailyMap[day]) dailyMap[day] = { games: 0, wagered: 0, payout: 0, profit: 0 }
      dailyMap[day].games++
      dailyMap[day].wagered += g.bet_amount || 0
      dailyMap[day].payout += g.payout || 0
      dailyMap[day].profit += (g.bet_amount || 0) - (g.payout || 0)
    }

    // Fill missing days
    const dailyStats = []
    for (let d = new Date(since); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0]
      dailyStats.push({
        date: key,
        games: dailyMap[key]?.games || 0,
        wagered: dailyMap[key]?.wagered || 0,
        payout: dailyMap[key]?.payout || 0,
        profit: dailyMap[key]?.profit || 0,
      })
    }

    // --- Daily signups ---
    const signupMap: Record<string, number> = {}
    for (const p of dailySignupsRes.data || []) {
      const day = new Date(p.created_at).toISOString().split('T')[0]
      signupMap[day] = (signupMap[day] || 0) + 1
    }
    const dailySignups = dailyStats.map(d => ({
      date: d.date,
      signups: signupMap[d.date] || 0,
    }))

    // --- Game type breakdown ---
    const gameTypeCounts: Record<string, number> = {}
    for (const g of gameTypeRes.data || []) {
      gameTypeCounts[g.game_type] = (gameTypeCounts[g.game_type] || 0) + 1
    }
    const gameTypeBreakdown = Object.entries(gameTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)

    // --- VIP distribution ---
    const vipCounts: Record<string, number> = {}
    for (const p of vipDistRes.data || []) {
      const tier = p.vip_tier || 'bronze'
      vipCounts[tier] = (vipCounts[tier] || 0) + 1
    }
    const vipDistribution = Object.entries(vipCounts)
      .map(([tier, count]) => ({ tier, count }))

    // --- Period revenue ---
    let periodWagered = 0
    let periodPayout = 0
    for (const g of revenueRes.data || []) {
      periodWagered += g.bet_amount || 0
      periodPayout += g.payout || 0
    }

    // --- Active users (unique) ---
    const uniquePlayers = new Set((activeUsersRes.data || []).map(g => g.player_id))

    return NextResponse.json({
      period: { days, since: sinceISO },
      dailyStats,
      dailySignups,
      gameTypeBreakdown,
      topPlayers: topPlayersRes.data || [],
      vipDistribution,
      periodSummary: {
        totalGames: dailyGamesRes.data?.length || 0,
        totalWagered: periodWagered,
        totalPayout: periodPayout,
        houseProfit: periodWagered - periodPayout,
        houseEdge: periodWagered > 0 ? ((periodWagered - periodPayout) / periodWagered * 100).toFixed(2) : '0',
        activeUsers: uniquePlayers.size,
        newSignups: dailySignupsRes.data?.length || 0,
      },
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
