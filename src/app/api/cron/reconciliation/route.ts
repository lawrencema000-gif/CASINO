import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Vercel Cron or manual trigger — verifies ledger matches cached balances
// This should be called hourly via Vercel Cron
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this header for cron jobs)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('reconcile_wallet_ledger')

    if (error) {
      console.error('Reconciliation RPC error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const discrepancies = data || []

    if (discrepancies.length > 0) {
      console.error(`WALLET RECONCILIATION ALERT: ${discrepancies.length} discrepancies found`, discrepancies)
      // In production: send alert to Slack/PagerDuty/email
    }

    return NextResponse.json({
      status: discrepancies.length === 0 ? 'healthy' : 'discrepancies_found',
      discrepancy_count: discrepancies.length,
      discrepancies: discrepancies.slice(0, 20), // cap response size
      checked_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Reconciliation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
