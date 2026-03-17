import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const VIP_TIERS = [
  { tier: 'diamond', threshold: 500000 },
  { tier: 'platinum', threshold: 200000 },
  { tier: 'gold', threshold: 50000 },
  { tier: 'silver', threshold: 10000 },
  { tier: 'bronze', threshold: 0 },
]

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = {
      missions_reset: 0,
      bonus_reset: 0,
      vip_updated: 0,
      errors: [] as string[],
    }

    // 1. Reset daily mission progress for all users
    const { error: missionError } = await supabaseAdmin
      .from('user_missions')
      .update({ progress: 0, completed: false })
      .eq('mission_type', 'daily')

    if (missionError) {
      results.errors.push(`Mission reset error: ${missionError.message}`)
    } else {
      results.missions_reset = 1 // update ran successfully
    }

    // 2. Reset daily bonus eligibility
    const { error: bonusError } = await supabaseAdmin
      .from('profiles')
      .update({ daily_bonus_claimed: false })
      .eq('daily_bonus_claimed', true)

    if (bonusError) {
      results.errors.push(`Bonus reset error: ${bonusError.message}`)
    } else {
      results.bonus_reset = 1 // update ran successfully
    }

    // 3. Update VIP tiers based on total_wagered
    for (let i = 0; i < VIP_TIERS.length; i++) {
      const { tier, threshold } = VIP_TIERS[i]
      const upperThreshold = i > 0 ? VIP_TIERS[i - 1].threshold : undefined

      let query = supabaseAdmin
        .from('profiles')
        .update({ vip_tier: tier })
        .gte('total_wagered', threshold)
        .neq('vip_tier', tier)

      if (upperThreshold) {
        query = query.lt('total_wagered', upperThreshold)
      }

      const { error: vipError } = await query

      if (vipError) {
        results.errors.push(`VIP tier ${tier} update error: ${vipError.message}`)
      } else {
        results.vip_updated += 1
      }
    }

    return NextResponse.json({
      status: results.errors.length === 0 ? 'success' : 'partial_success',
      ...results,
      executed_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Daily reset cron error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
