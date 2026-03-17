import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    try {
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error || !user) {
        console.error('OAuth code exchange failed:', error?.message)
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
      }

      // Check if profile exists (OAuth users may not have one yet)
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        // Create profile for OAuth user
        const username = user.user_metadata?.full_name
          || user.user_metadata?.name
          || user.email?.split('@')[0]
          || `user_${user.id.slice(0, 8)}`

        // Sanitize username: alphanumeric + underscore only
        const sanitized = username.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20)

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
          console.error('OAuth profile creation failed:', profileError.message)
          // Still redirect — user is authenticated, profile can be created later
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    } catch (err) {
      console.error('OAuth callback error:', err)
      return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
    }
  }

  // OAuth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
