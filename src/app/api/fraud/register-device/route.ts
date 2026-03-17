import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      fingerprint_hash,
      user_agent,
      screen_resolution,
      timezone,
      language,
      platform,
      canvas_hash,
    } = body

    if (!fingerprint_hash || typeof fingerprint_hash !== 'string' || fingerprint_hash.length < 16) {
      return NextResponse.json({ error: 'Invalid fingerprint' }, { status: 400 })
    }

    // Call the register_device RPC
    const { data, error } = await supabaseAdmin.rpc('register_device', {
      p_user_id: user.id,
      p_fingerprint_hash: fingerprint_hash,
      p_user_agent: user_agent || null,
      p_screen_resolution: screen_resolution || null,
      p_timezone: timezone || null,
      p_language: language || null,
      p_platform: platform || null,
      p_canvas_hash: canvas_hash || null,
    })

    if (error) {
      console.error('register_device error:', error)
      return NextResponse.json({ error: 'Failed to register device' }, { status: 500 })
    }

    return NextResponse.json({
      flagged: data?.flagged || false,
      shared_accounts: data?.shared_accounts || 0,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
