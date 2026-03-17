import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ACHIEVEMENTS, checkAchievements, type UserStats } from '@/lib/achievements'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's profile stats
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('total_wagered, total_won, level, vip_tier, games_played')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get biggest win
    const { data: biggestWinData } = await supabaseAdmin
      .from('games')
      .select('payout')
      .eq('player_id', user.id)
      .order('payout', { ascending: false })
      .limit(1)
      .single()

    // Get referral count
    const { count: referralCount } = await supabaseAdmin
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', user.id)
      .eq('status', 'completed')

    // Get unlocked achievements
    const { data: unlocked } = await supabaseAdmin
      .from('achievements')
      .select('achievement_id')
      .eq('player_id', user.id)

    const unlockedIds = (unlocked || []).map((a: { achievement_id: string }) => a.achievement_id)

    const stats: UserStats = {
      games_played: profile.games_played || 0,
      total_wagered: profile.total_wagered || 0,
      total_won: profile.total_won || 0,
      biggest_win: biggestWinData?.payout || 0,
      level: profile.level || 1,
      vip_tier: profile.vip_tier || 'bronze',
      referral_count: referralCount || 0,
    }

    // Check for new achievements
    const newlyUnlocked = checkAchievements(stats, unlockedIds)

    // Grant new achievements
    for (const achievement of newlyUnlocked) {
      await supabaseAdmin.from('achievements').insert({
        player_id: user.id,
        achievement_id: achievement.id,
      })

      // Award credits
      if (achievement.reward > 0) {
        try {
          await supabaseAdmin.rpc('add_balance', {
            p_user_id: user.id,
            p_amount: achievement.reward,
          })
        } catch {
          // Fallback: direct update
          await supabaseAdmin
            .from('profiles')
            .update({ balance: (profile.total_won || 0) + achievement.reward })
            .eq('id', user.id)
        }

        await supabaseAdmin.from('transactions').insert({
          player_id: user.id,
          type: 'bonus',
          amount: achievement.reward,
          description: `Achievement unlocked: ${achievement.name}`,
        })

        // Send notification
        await supabaseAdmin.from('notifications').insert({
          player_id: user.id,
          type: 'achievement',
          title: `Achievement Unlocked: ${achievement.name}`,
          message: `You earned ${achievement.reward.toLocaleString()} credits! ${achievement.description}`,
        })
      }
    }

    // Build response with all achievements and their unlock status
    const allAchievements = ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: unlockedIds.includes(a.id) || newlyUnlocked.some((n) => n.id === a.id),
      unlockedAt: unlocked?.find((u: { achievement_id: string }) => u.achievement_id === a.id) ? 'previously' : newlyUnlocked.some((n) => n.id === a.id) ? 'just_now' : null,
    }))

    return NextResponse.json({
      achievements: allAchievements,
      stats,
      totalUnlocked: unlockedIds.length + newlyUnlocked.length,
      totalAchievements: ACHIEVEMENTS.length,
      newlyUnlocked: newlyUnlocked.map((a) => a.id),
    })
  } catch (err) {
    console.error('Achievements error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Manual achievement check trigger
  const res = await GET()
  return res
}
