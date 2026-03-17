import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { username } = await request.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Sanitize username
    const sanitized = username.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20)

    // Check if profile already exists
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existing) {
      return NextResponse.json({ success: true, message: 'Profile already exists' })
    }

    // Check username uniqueness
    const { data: nameTaken } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', sanitized)
      .single()

    if (nameTaken) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    // Create profile using admin client (bypasses RLS)
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: user.id,
      username: sanitized,
      balance: 10000,
      purchased_balance: 10000,
      bonus_balance: 0,
      total_wagered: 0,
      total_won: 0,
      level: 1,
      exp: 0,
      vip_tier: 'bronze',
    })

    if (profileError) {
      console.error('Profile creation failed:', profileError)
      return NextResponse.json({ error: 'Profile creation failed: ' + profileError.message }, { status: 500 })
    }

    // Record welcome bonus transaction
    await supabaseAdmin.from('transactions').insert({
      player_id: user.id,
      type: 'bonus',
      amount: 10000,
      balance_after: 10000,
      description: 'Welcome bonus - 10,000 free credits',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Create profile error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
