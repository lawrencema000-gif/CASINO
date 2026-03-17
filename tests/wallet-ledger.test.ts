import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabaseAdmin, createTestUser, cleanupTestUsers } from './setup'

let userId: string

describe('Wallet Ledger System', () => {
  beforeAll(async () => {
    const user = await createTestUser('wallet')
    userId = user.id
  })

  afterAll(async () => {
    await cleanupTestUsers()
  })

  it('should have correct initial balance', async () => {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('balance, purchased_balance, bonus_balance')
      .eq('id', userId)
      .single()

    expect(data).toBeTruthy()
    expect(data!.balance).toBe(10000)
    expect(data!.purchased_balance).toBe(10000)
    expect(data!.bonus_balance).toBe(0)
  })

  it('should process a bet and deduct balance atomically', async () => {
    const { data: gameId, error } = await supabaseAdmin.rpc('process_bet', {
      p_player_id: userId,
      p_game_type: 'slots',
      p_bet_amount: 100,
      p_server_seed_hash: 'testhash123',
      p_client_seed: 'clientseed123',
      p_nonce: 1,
    })

    expect(error).toBeNull()
    expect(gameId).toBeTruthy()

    // Check balance deducted
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('balance, purchased_balance')
      .eq('id', userId)
      .single()

    expect(profile!.balance).toBe(9900)
    expect(profile!.purchased_balance).toBe(9900)
  })

  it('should settle a game and credit payout', async () => {
    // First place a bet
    const { data: gameId } = await supabaseAdmin.rpc('process_bet', {
      p_player_id: userId,
      p_game_type: 'slots',
      p_bet_amount: 50,
      p_server_seed_hash: 'testhash456',
      p_client_seed: 'clientseed456',
      p_nonce: 2,
    })

    // Settle with a win
    const { data: newBalance, error } = await supabaseAdmin.rpc('settle_game', {
      p_game_id: gameId,
      p_player_id: userId,
      p_result: { symbols: ['A', 'A', 'A'] },
      p_payout: 200,
      p_multiplier: 4.0,
    })

    expect(error).toBeNull()
    expect(newBalance).toBe(10050) // 9900 - 50 + 200

    // Verify ledger entries exist
    const { data: ledger } = await supabaseAdmin
      .from('wallet_ledger')
      .select('tx_type, amount')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    expect(ledger!.length).toBeGreaterThanOrEqual(2)
  })

  it('should reject bet when insufficient balance', async () => {
    const { error } = await supabaseAdmin.rpc('process_bet', {
      p_player_id: userId,
      p_game_type: 'slots',
      p_bet_amount: 999999,
      p_server_seed_hash: 'testhash789',
      p_client_seed: 'clientseed789',
      p_nonce: 3,
    })

    expect(error).toBeTruthy()
  })

  it('should run reconciliation without errors', async () => {
    const { data, error } = await supabaseAdmin.rpc('reconcile_wallet_ledger')
    expect(error).toBeNull()
    // Reconciliation should complete (may find discrepancies from test setup upserts)
    expect(Array.isArray(data)).toBe(true)
  })
})
