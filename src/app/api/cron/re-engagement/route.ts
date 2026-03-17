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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Find users who haven't been active in 7+ days
    const { data: inactiveUsers, error: queryError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'player')
      .lt('updated_at', sevenDaysAgo)

    if (queryError) {
      console.error('Re-engagement query error:', queryError)
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return NextResponse.json({
        status: 'success',
        notified: 0,
        executed_at: new Date().toISOString(),
      })
    }

    const inactiveUserIds = inactiveUsers.map((u) => u.id)

    // Check which users already received a re-engagement notification in the last 7 days
    const { data: recentlyNotified, error: notifCheckError } = await supabaseAdmin
      .from('notifications')
      .select('user_id')
      .in('user_id', inactiveUserIds)
      .eq('type', 'promo')
      .ilike('title', '%miss you%')
      .gte('created_at', sevenDaysAgo)

    if (notifCheckError) {
      console.error('Notification check error:', notifCheckError)
    }

    const alreadyNotifiedIds = new Set(
      (recentlyNotified || []).map((n) => n.user_id)
    )

    const eligibleUserIds = inactiveUserIds.filter(
      (id) => !alreadyNotifiedIds.has(id)
    )

    if (eligibleUserIds.length === 0) {
      return NextResponse.json({
        status: 'success',
        notified: 0,
        skipped: inactiveUserIds.length,
        executed_at: new Date().toISOString(),
      })
    }

    // Insert re-engagement notifications
    const notifications = eligibleUserIds.map((userId) => ({
      user_id: userId,
      type: 'promo',
      title: 'We miss you!',
      message:
        'Come back and claim 1,000 bonus credits! Your fortune awaits at the tables.',
      read: false,
    }))

    // Insert in batches of 100 to avoid payload limits
    let totalInserted = 0
    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100)
      const { error: insertError } = await supabaseAdmin
        .from('notifications')
        .insert(batch)

      if (insertError) {
        console.error('Re-engagement insert error:', insertError)
      } else {
        totalInserted += batch.length
      }
    }

    return NextResponse.json({
      status: 'success',
      inactive_users: inactiveUserIds.length,
      already_notified: alreadyNotifiedIds.size,
      notified: totalInserted,
      executed_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Re-engagement cron error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
