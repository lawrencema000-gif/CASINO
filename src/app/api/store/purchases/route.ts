import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('player_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Purchases fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
    }

    return NextResponse.json({ purchases: purchases ?? [] })
  } catch (error) {
    console.error('Purchases error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
