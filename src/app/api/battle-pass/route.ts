import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET — get current season, user progress, and tier rewards
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active season
    const { data: season } = await supabaseAdmin
      .from('battle_pass_seasons')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!season) {
      return NextResponse.json({ season: null, progress: null, rewards: [], claims: [] })
    }

    // Ensure user has progress row
    await supabaseAdmin
      .from('user_battle_pass')
      .upsert({ user_id: user.id, season_id: season.id }, { onConflict: 'user_id,season_id' })

    // Get user progress
    const { data: progress } = await supabaseAdmin
      .from('user_battle_pass')
      .select('*')
      .eq('user_id', user.id)
      .eq('season_id', season.id)
      .single()

    // Get all rewards for this season
    const { data: rewards } = await supabaseAdmin
      .from('battle_pass_rewards')
      .select('*')
      .eq('season_id', season.id)
      .order('tier', { ascending: true })

    // Get claimed rewards
    const { data: claims } = await supabaseAdmin
      .from('user_bp_claims')
      .select('reward_id')
      .eq('user_id', user.id)

    const claimedIds = new Set((claims || []).map(c => c.reward_id))

    return NextResponse.json({
      season,
      progress,
      rewards: (rewards || []).map(r => ({
        ...r,
        claimed: claimedIds.has(r.id),
        unlocked: (progress?.current_tier || 0) >= r.tier,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — claim a tier reward
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rewardId } = body

    if (!rewardId) {
      return NextResponse.json({ error: 'rewardId required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.rpc('claim_bp_reward', {
      p_user_id: user.id,
      p_reward_id: rewardId,
    })

    if (error) {
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
