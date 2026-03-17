import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// POST — redeem a promo code
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string' || code.trim().length < 3) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.rpc('redeem_promo_code', {
      p_user_id: user.id,
      p_code: code.trim().toUpperCase(),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    // Send notification
    await supabaseAdmin.from('notifications').insert({
      user_id: user.id,
      type: 'promotion',
      title: 'Promo Code Redeemed!',
      message: `You received ${data.reward_value} ${data.reward_type} from code ${code.toUpperCase()}`,
      data: { promo_code: code.toUpperCase(), reward_type: data.reward_type, reward_value: data.reward_value },
    })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
