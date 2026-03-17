import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Vercel Cron — runs every 6 hours to expire stale bonus credits
// Bonus credits older than 30 days that haven't been wagered get clawed back
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const expiryDays = 30
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - expiryDays)

    // Find users with bonus balance who received bonuses more than 30 days ago
    // and haven't wagered them (bonus_balance still > 0)
    const { data: staleUsers, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, bonus_balance, balance')
      .gt('bonus_balance', 0)

    if (fetchError) {
      console.error('Expire bonuses fetch error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    let expired = 0

    for (const user of staleUsers || []) {
      // Check if their last bonus ledger entry is older than cutoff
      const { data: lastBonus } = await supabaseAdmin
        .from('wallet_ledger')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('bucket', 'bonus')
        .eq('tx_type', 'bonus')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!lastBonus) continue
      const bonusDate = new Date(lastBonus.created_at)
      if (bonusDate >= cutoff) continue

      // Expire the bonus balance
      const expireAmount = user.bonus_balance
      const newBalance = user.balance - expireAmount

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          balance: newBalance,
          bonus_balance: 0,
        })
        .eq('id', user.id)

      if (updateError) {
        console.error(`Failed to expire bonus for ${user.id}:`, updateError)
        continue
      }

      // Write ledger entry
      await supabaseAdmin
        .from('wallet_ledger')
        .insert({
          user_id: user.id,
          tx_type: 'admin_debit',
          bucket: 'bonus',
          amount: -expireAmount,
          balance_after: newBalance,
          bucket_balance_after: 0,
          note: `Bonus credits expired after ${expiryDays} days of inactivity`,
        })

      expired++
    }

    return NextResponse.json({
      status: 'ok',
      expired_count: expired,
      checked_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Expire bonuses error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
