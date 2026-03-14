import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const COLUMN_MAP: Record<string, string> = {
  wins: 'total_won',
  wagered: 'total_wagered',
  active: 'games_played',
  level: 'level',
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const category = searchParams.get('category') || 'wins'

  const column = COLUMN_MAP[category]
  if (!column) {
    return NextResponse.json(
      { error: 'Invalid category. Must be one of: wins, wagered, active, level' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username, avatar_url, total_won, total_wagered, games_played, level, exp, vip_tier')
    .order(column, { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { data, category, column },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    }
  )
}
