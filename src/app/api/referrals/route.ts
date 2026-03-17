import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// GET — get user's referral code + referral stats
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile with referral info
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('referral_code, referral_count, referral_earnings, referred_by')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get referral list
    const { data: referrals } = await supabaseAdmin
      .from('referrals')
      .select(`
        id, referee_id, referral_code, referrer_reward, referee_reward,
        referrer_paid, status, referee_wagered, qualification_wager,
        qualified_at, created_at
      `)
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    // Get referee usernames (limited info)
    const referralList = []
    for (const ref of referrals || []) {
      const { data: referee } = await supabaseAdmin
        .from('profiles')
        .select('username')
        .eq('id', ref.referee_id)
        .single()

      referralList.push({
        ...ref,
        referee_username: referee?.username || 'Unknown',
      })
    }

    return NextResponse.json({
      referral_code: profile.referral_code,
      referral_count: profile.referral_count,
      referral_earnings: profile.referral_earnings,
      was_referred: !!profile.referred_by,
      referrals: referralList,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — apply a referral code
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { referralCode } = body

    if (!referralCode || typeof referralCode !== 'string' || referralCode.trim().length < 4) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.rpc('apply_referral_code', {
      p_referee_id: user.id,
      p_referral_code: referralCode.trim().toUpperCase(),
    })

    if (error) {
      console.error('Apply referral error:', error)
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
