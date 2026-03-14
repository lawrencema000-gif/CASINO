import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read env
const envFile = readFileSync('.env.local', 'utf8')
const getEnv = (key) => {
  const match = envFile.match(new RegExp(`${key}=(.+)`))
  return match ? match[1].trim() : ''
}

const supabase = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY')
)

const migrations = [
  // 1. Fix game_type constraint
  `ALTER TABLE games DROP CONSTRAINT IF EXISTS games_game_type_check`,
  `ALTER TABLE games ADD CONSTRAINT games_game_type_check CHECK (game_type::text = ANY(ARRAY['slots','blackjack','roulette','dice','coinflip','crash','plinko','poker','lottery','jackpot','mines','keno','limbo','hilo','holdem']))`,

  // 2. Fix transaction type constraint
  `ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check`,
  `ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type::text = ANY(ARRAY['deposit','withdrawal','bet','win','bonus','refund','admin_credit','admin_debit']))`,

  // 3. Add role column to profiles
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player'`,

  // 4. Fix settle_game for null game_id
  `CREATE OR REPLACE FUNCTION settle_game(
    p_game_id UUID,
    p_player_id UUID,
    p_result JSONB,
    p_payout BIGINT,
    p_multiplier NUMERIC DEFAULT 1
  ) RETURNS BIGINT AS $$
  DECLARE
    v_new_balance BIGINT;
  BEGIN
    IF p_game_id IS NOT NULL THEN
      UPDATE games
      SET result = p_result,
          payout = p_payout,
          multiplier = p_multiplier,
          settled = true
      WHERE id = p_game_id AND player_id = p_player_id;
    END IF;

    IF p_payout > 0 THEN
      UPDATE profiles
      SET balance = balance + p_payout,
          total_won = total_won + p_payout,
          exp = exp + (p_payout / 100)
      WHERE id = p_player_id
      RETURNING balance INTO v_new_balance;

      INSERT INTO transactions (player_id, type, amount, balance_after, game_id, description)
      VALUES (p_player_id, 'win', p_payout, v_new_balance, p_game_id, 'Game payout');
    ELSE
      SELECT balance INTO v_new_balance FROM profiles WHERE id = p_player_id;
    END IF;

    RETURN v_new_balance;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER`,
]

async function run() {
  console.log('Running migrations...')

  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i]
    const label = sql.substring(0, 60).replace(/\n/g, ' ')

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // Try via direct postgrest if exec_sql doesn't exist
      console.log(`[${i + 1}/${migrations.length}] ${label}...`)
      console.log(`  ⚠ Cannot run via RPC: ${error.message}`)
      console.log(`  → Run this SQL in Supabase Dashboard SQL Editor`)
    } else {
      console.log(`[${i + 1}/${migrations.length}] ✓ ${label}...`)
    }
  }

  // Test: check if the role column exists
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('role')
    .limit(1)

  if (profileErr) {
    console.log('\n⚠ Role column check failed:', profileErr.message)
    console.log('\nPlease run these SQL statements in Supabase Dashboard > SQL Editor:')
    migrations.forEach((sql, i) => {
      console.log(`\n-- Migration ${i + 1}:`)
      console.log(sql + ';')
    })
  } else {
    console.log('\n✓ Role column exists on profiles')
  }
}

run().catch(console.error)
