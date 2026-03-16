import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const VALID_DEPOSIT_AMOUNTS = [1000, 5000, 10000, 50000]

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit
  const limit = checkRateLimit(`wallet:${user.id}`, RATE_LIMITS.api)
  if (!limit.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

  const body = await request.json()
  const { action, amount } = body

  if (action === 'deposit') {
    if (!VALID_DEPOSIT_AMOUNTS.includes(amount)) {
      return NextResponse.json({ error: 'Invalid deposit amount' }, { status: 400 })
    }

    // Check self-exclusion status
    const { data: selfExProfile } = await supabaseAdmin
      .from('profiles')
      .select('self_excluded_until, daily_deposit_limit')
      .eq('id', user.id)
      .single()

    if (selfExProfile?.self_excluded_until) {
      const excludedUntil = new Date(selfExProfile.self_excluded_until)
      if (excludedUntil > new Date()) {
        return NextResponse.json(
          { error: `Self-excluded until ${excludedUntil.toLocaleDateString()}. Deposits are disabled during self-exclusion.` },
          { status: 403 }
        )
      }
    }

    // Check daily deposit limit
    if (selfExProfile?.daily_deposit_limit) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: todayDeposits } = await supabaseAdmin
        .from('transactions')
        .select('amount')
        .eq('player_id', user.id)
        .eq('type', 'deposit')
        .gte('created_at', todayStart.toISOString())

      const totalDepositToday = (todayDeposits || []).reduce((sum, t) => sum + Math.abs(t.amount), 0)
      if (totalDepositToday + amount > selfExProfile.daily_deposit_limit) {
        return NextResponse.json(
          { error: `Daily deposit limit of $${selfExProfile.daily_deposit_limit.toLocaleString()} reached.` },
          { status: 403 }
        )
      }
    }

    const { data: newBalance, error } = await supabaseAdmin.rpc('wallet_deposit', {
      p_player_id: user.id,
      p_amount: amount
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, newBalance })
  }

  if (action === 'withdraw') {
    const withdrawAmount = Math.floor(Number(amount))
    if (!withdrawAmount || withdrawAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    const { data: newBalance, error } = await supabaseAdmin.rpc('wallet_withdraw', {
      p_player_id: user.id,
      p_amount: withdrawAmount
    })
    if (error) {
      const msg = error.message || 'Withdrawal failed'
      return NextResponse.json({ error: msg }, { status: msg.includes('Insufficient') ? 400 : 500 })
    }
    return NextResponse.json({ success: true, newBalance })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
