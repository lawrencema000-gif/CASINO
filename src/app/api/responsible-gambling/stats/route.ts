import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoISO = weekAgo.toISOString()

  // Get today's losses (bet amounts - win amounts for today)
  const { data: todayGames } = await supabaseAdmin
    .from('games')
    .select('bet_amount, payout')
    .eq('player_id', user.id)
    .gte('created_at', todayISO)

  const todayLosses = (todayGames || []).reduce((sum, g) => {
    const net = g.bet_amount - g.payout
    return sum + (net > 0 ? net : 0)
  }, 0)

  // Get today's deposits
  const { data: todayDeposits } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('player_id', user.id)
    .eq('type', 'deposit')
    .gte('created_at', todayISO)

  const todayDepositTotal = (todayDeposits || []).reduce((sum, t) => sum + t.amount, 0)

  // Get week stats
  const { data: weekGames } = await supabaseAdmin
    .from('games')
    .select('bet_amount')
    .eq('player_id', user.id)
    .gte('created_at', weekAgoISO)

  const weekWagered = (weekGames || []).reduce((sum, g) => sum + g.bet_amount, 0)

  return NextResponse.json({
    today_losses: Math.round(todayLosses),
    today_deposits: Math.round(todayDepositTotal),
    session_minutes: 0,
    week_wagered: Math.round(weekWagered),
    week_games: weekGames?.length || 0,
  })
}
