import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('daily_deposit_limit, daily_loss_limit, session_time_limit, self_excluded_until')
    .eq('id', user.id)
    .single()

  return NextResponse.json(data || {})
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { action } = body

  if (action === 'set_limits') {
    const updates: Record<string, unknown> = {}

    if (body.daily_deposit_limit !== undefined) {
      const limit = body.daily_deposit_limit === null ? null : Math.max(0, Math.floor(Number(body.daily_deposit_limit)))
      updates.daily_deposit_limit = limit
    }
    if (body.daily_loss_limit !== undefined) {
      const limit = body.daily_loss_limit === null ? null : Math.max(0, Math.floor(Number(body.daily_loss_limit)))
      updates.daily_loss_limit = limit
    }
    if (body.session_time_limit !== undefined) {
      const limit = body.session_time_limit === null ? null : Math.max(0, Math.min(1440, Math.floor(Number(body.session_time_limit))))
      updates.session_time_limit = limit
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: 'Failed to update limits' }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'self_exclude') {
    const duration = body.duration // '24h', '7d', '30d', '90d'
    const durations: Record<string, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    }

    if (!duration || !durations[duration]) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
    }

    const excludeUntil = new Date(Date.now() + durations[duration])

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ self_excluded_until: excludeUntil.toISOString() })
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: 'Failed to self-exclude' }, { status: 500 })
    return NextResponse.json({ success: true, excluded_until: excludeUntil.toISOString() })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
