import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find users whose self-exclusion period has expired
    const { data: expiredExclusions, error: queryError } = await supabaseAdmin
      .from('responsible_gambling_settings')
      .select('user_id')
      .eq('self_excluded', true)
      .lt('self_exclusion_until', new Date().toISOString())

    if (queryError) {
      console.error('Self-exclusion query error:', queryError)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    if (!expiredExclusions || expiredExclusions.length === 0) {
      return NextResponse.json({
        status: 'success',
        cleared: 0,
        executed_at: new Date().toISOString(),
      })
    }

    const userIds = expiredExclusions.map((row) => row.user_id)

    // Clear the self-exclusion flag
    const { error: updateError } = await supabaseAdmin
      .from('responsible_gambling_settings')
      .update({
        self_excluded: false,
        self_exclusion_until: null,
      })
      .in('user_id', userIds)

    if (updateError) {
      console.error('Self-exclusion update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send notification to each user
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type: 'security',
      title: 'Self-Exclusion Period Ended',
      message:
        'Your self-exclusion period has ended. You can now access all games. If you need further help, visit Responsible Gambling settings.',
      read: false,
    }))

    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)

    if (notifError) {
      console.error('Notification insert error:', notifError)
    }

    return NextResponse.json({
      status: 'success',
      cleared: userIds.length,
      notified: notifError ? 0 : userIds.length,
      executed_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Self-exclusion expiry cron error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
