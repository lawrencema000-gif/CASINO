import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('favorites')
    .select('game_slug')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const favorites = (data ?? []).map((row: { game_slug: string }) => row.game_slug)
  return NextResponse.json({ favorites })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { slug?: string; action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { slug, action } = body
  if (!slug || !action || !['add', 'remove'].includes(action)) {
    return NextResponse.json(
      { error: 'Invalid request. Need slug and action (add|remove).' },
      { status: 400 }
    )
  }

  if (action === 'add') {
    const { error } = await supabase.from('favorites').upsert(
      { user_id: user.id, game_slug: slug },
      { onConflict: 'user_id,game_slug' }
    )
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, action: 'added', slug })
  }

  if (action === 'remove') {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('game_slug', slug)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, action: 'removed', slug })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
