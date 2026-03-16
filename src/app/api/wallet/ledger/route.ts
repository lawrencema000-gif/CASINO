import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100)
    const offset = Number(url.searchParams.get('offset')) || 0
    const bucket = url.searchParams.get('bucket') // 'purchased', 'bonus', 'promo', or null for all
    const txType = url.searchParams.get('type') // filter by tx_type

    let query = supabaseAdmin
      .from('wallet_ledger')
      .select('id, tx_type, bucket, amount, balance_after, bucket_balance_after, game_id, description, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (bucket) {
      query = query.eq('bucket', bucket)
    }
    if (txType) {
      query = query.eq('tx_type', txType)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      entries: data || [],
      total: count || 0,
      has_more: (offset + limit) < (count || 0),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
