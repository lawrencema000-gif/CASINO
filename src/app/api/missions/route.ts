import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET — list user's missions with progress
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const frequency = url.searchParams.get('frequency') // daily, weekly, monthly, one_time

    // Initialize missions for current period
    await supabaseAdmin.rpc('init_user_missions', { p_user_id: user.id })

    // Fetch user missions with mission details
    let query = supabaseAdmin
      .from('user_missions')
      .select(`
        id, progress, completed, claimed, period_start, period_end,
        completed_at, claimed_at,
        mission:missions (
          id, slug, title, description, icon, frequency,
          requirement_type, game_type, target_value,
          reward_credits, reward_exp, sort_order, tier
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Filter by frequency if provided
    if (frequency) {
      // We need to filter by the joined mission's frequency
      // Use a different approach: get all then filter
    }

    const { data, error } = await query

    if (error) {
      console.error('Missions fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter to current period only (not expired unclaimed ones)
    const now = new Date()
    const currentMissions = (data || []).filter(um => {
      const periodEnd = new Date(um.period_end)
      // Show if: still in period, OR completed but unclaimed, OR recently claimed
      return periodEnd > now || (um.completed && !um.claimed) || um.claimed
    })

    // Group and filter by frequency if requested
    let filtered = currentMissions
    if (frequency) {
      filtered = currentMissions.filter(um => {
        const m = um.mission as unknown as Record<string, unknown>
        return m?.frequency === frequency
      })
    }

    // Sort by mission sort_order
    filtered.sort((a, b) => {
      const mA = a.mission as unknown as Record<string, unknown>
      const mB = b.mission as unknown as Record<string, unknown>
      return ((mA?.sort_order as number) || 0) - ((mB?.sort_order as number) || 0)
    })

    return NextResponse.json({ missions: filtered })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — claim a completed mission reward
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userMissionId } = body

    if (!userMissionId) {
      return NextResponse.json({ error: 'userMissionId required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.rpc('claim_mission_reward', {
      p_user_id: user.id,
      p_user_mission_id: userMissionId,
    })

    if (error) {
      console.error('Claim error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
