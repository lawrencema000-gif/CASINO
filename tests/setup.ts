import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Test user ID — created fresh for each test suite
export const TEST_PREFIX = 'test_' + Date.now()

export async function createTestUser(suffix: string = '1') {
  const email = `${TEST_PREFIX}_${suffix}@test.fortuna.local`
  const password = 'TestPass123!'

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`Failed to create test user: ${error.message}`)

  // Upsert profile (trigger may auto-create it)
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: data.user.id,
    username: `${TEST_PREFIX}_user_${suffix}`,
    balance: 10000,
    purchased_balance: 10000,
    bonus_balance: 0,
    total_wagered: 0,
    total_won: 0,
    level: 1,
    exp: 0,
    vip_tier: 'bronze',
  }, { onConflict: 'id' })
  if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`)

  return { id: data.user.id, email }
}

export async function cleanupTestUsers() {
  // Find test profiles
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .like('username', `${TEST_PREFIX}%`)

  if (!profiles || profiles.length === 0) return

  const ids = profiles.map(p => p.id)

  // Delete in order (referrals, missions, fraud, battle pass, then profiles)
  await supabaseAdmin.from('referrals').delete().in('referrer_id', ids)
  await supabaseAdmin.from('referrals').delete().in('referee_id', ids)
  await supabaseAdmin.from('user_missions').delete().in('user_id', ids)
  await supabaseAdmin.from('fraud_flags').delete().in('user_id', ids)
  await supabaseAdmin.from('user_device_links').delete().in('user_id', ids)
  await supabaseAdmin.from('user_battle_pass').delete().in('user_id', ids)
  await supabaseAdmin.from('user_bp_claims').delete().in('user_id', ids)
  await supabaseAdmin.from('wallet_ledger').delete().in('user_id', ids)
  await supabaseAdmin.from('support_tickets').delete().in('user_id', ids)
  await supabaseAdmin.from('games').delete().in('player_id', ids)
  await supabaseAdmin.from('transactions').delete().in('user_id', ids)
  await supabaseAdmin.from('profiles').delete().in('id', ids)

  // Delete auth users
  for (const id of ids) {
    await supabaseAdmin.auth.admin.deleteUser(id)
  }
}
