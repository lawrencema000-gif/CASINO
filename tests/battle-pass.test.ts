import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabaseAdmin, createTestUser, cleanupTestUsers } from './setup'

let userId: string

describe('Battle Pass System', () => {
  beforeAll(async () => {
    const user = await createTestUser('bp')
    userId = user.id
  })

  afterAll(async () => {
    await cleanupTestUsers()
  })

  it('should have an active season', async () => {
    const { data, error } = await supabaseAdmin
      .from('battle_pass_seasons')
      .select('*')
      .eq('is_active', true)
      .single()

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(data!.season_number).toBe(1)
    expect(data!.max_tier).toBe(50)
    expect(data!.xp_per_tier).toBe(100)
  })

  it('should have 50 tier rewards', async () => {
    const { data: season } = await supabaseAdmin
      .from('battle_pass_seasons')
      .select('id')
      .eq('is_active', true)
      .single()

    const { data: rewards, error } = await supabaseAdmin
      .from('battle_pass_rewards')
      .select('tier')
      .eq('season_id', season!.id)

    expect(error).toBeNull()
    expect(rewards!.length).toBe(50)
  })

  it('should add XP and advance tiers', async () => {
    // Add 250 XP (should get to tier 2 with 50 XP remaining)
    const { data, error } = await supabaseAdmin.rpc('add_battle_pass_xp', {
      p_user_id: userId,
      p_xp: 250,
    })

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(data.current_tier).toBe(2)
    expect(data.current_xp).toBe(50)
    expect(data.tier_ups).toBe(2)
  })

  it('should claim a tier reward', async () => {
    // Get a tier 1 reward
    const { data: season } = await supabaseAdmin
      .from('battle_pass_seasons')
      .select('id')
      .eq('is_active', true)
      .single()

    const { data: reward } = await supabaseAdmin
      .from('battle_pass_rewards')
      .select('id, tier, reward_type, reward_value')
      .eq('season_id', season!.id)
      .eq('tier', 1)
      .eq('is_premium', false)
      .single()

    expect(reward).toBeTruthy()

    const { data, error } = await supabaseAdmin.rpc('claim_bp_reward', {
      p_user_id: userId,
      p_reward_id: reward!.id,
    })

    expect(error).toBeNull()
    expect(data.success).toBe(true)
  })

  it('should reject claiming a reward for an unreached tier', async () => {
    const { data: season } = await supabaseAdmin
      .from('battle_pass_seasons')
      .select('id')
      .eq('is_active', true)
      .single()

    const { data: reward } = await supabaseAdmin
      .from('battle_pass_rewards')
      .select('id')
      .eq('season_id', season!.id)
      .eq('tier', 50)
      .eq('is_premium', false)
      .single()

    const { data } = await supabaseAdmin.rpc('claim_bp_reward', {
      p_user_id: userId,
      p_reward_id: reward!.id,
    })

    expect(data.error).toBe('Tier not reached')
  })

  it('should not allow double-claiming', async () => {
    const { data: season } = await supabaseAdmin
      .from('battle_pass_seasons')
      .select('id')
      .eq('is_active', true)
      .single()

    const { data: reward } = await supabaseAdmin
      .from('battle_pass_rewards')
      .select('id')
      .eq('season_id', season!.id)
      .eq('tier', 1)
      .eq('is_premium', false)
      .single()

    const { data } = await supabaseAdmin.rpc('claim_bp_reward', {
      p_user_id: userId,
      p_reward_id: reward!.id,
    })

    expect(data.error).toBe('Already claimed')
  })
})
