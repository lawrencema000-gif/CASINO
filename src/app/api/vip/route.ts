import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET — get VIP status and all tiers
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check and update VIP tier
    await supabaseAdmin.rpc('check_vip_tier', { p_user_id: user.id })

    // Get profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('vip_tier, total_wagered, level')
      .eq('id', user.id)
      .single()

    // Get all tiers
    const { data: tiers } = await supabaseAdmin
      .from('vip_tiers')
      .select('*')
      .order('level', { ascending: true })

    // Find current and next tier
    const currentTier = (tiers || []).find(t => t.name.toLowerCase() === profile?.vip_tier)
    const nextTier = (tiers || []).find(t => t.level === (currentTier?.level || 0) + 1)

    return NextResponse.json({
      current_tier: currentTier,
      next_tier: nextTier,
      total_wagered: profile?.total_wagered || 0,
      progress_to_next: nextTier
        ? Math.min(100, ((profile?.total_wagered || 0) / nextTier.min_wagered) * 100)
        : 100,
      all_tiers: tiers || [],
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
