import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabaseAdmin, createTestUser, cleanupTestUsers } from './setup'

let referrerId: string
let refereeId: string
let referralCode: string

describe('Referral System', () => {
  beforeAll(async () => {
    const referrer = await createTestUser('referrer')
    referrerId = referrer.id
    const referee = await createTestUser('referee')
    refereeId = referee.id

    // Get referral code
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('referral_code')
      .eq('id', referrerId)
      .single()
    referralCode = data!.referral_code
  })

  afterAll(async () => {
    await cleanupTestUsers()
  })

  it('should auto-generate referral codes for new users', async () => {
    expect(referralCode).toBeTruthy()
    expect(referralCode.length).toBe(8)
  })

  it('should apply a valid referral code', async () => {
    const { data, error } = await supabaseAdmin.rpc('apply_referral_code', {
      p_referee_id: refereeId,
      p_referral_code: referralCode,
    })

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(data.success).toBe(true)
    expect(data.referee_reward).toBe(200)
  })

  it('should credit referee with signup bonus', async () => {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('balance, bonus_balance')
      .eq('id', refereeId)
      .single()

    // 10000 initial + 200 referral bonus
    expect(data!.balance).toBe(10200)
    expect(data!.bonus_balance).toBe(200)
  })

  it('should reject duplicate referral application', async () => {
    const { data } = await supabaseAdmin.rpc('apply_referral_code', {
      p_referee_id: refereeId,
      p_referral_code: referralCode,
    })

    expect(data.error).toBe('Already used a referral code')
  })

  it('should reject self-referral', async () => {
    const { data } = await supabaseAdmin.rpc('apply_referral_code', {
      p_referee_id: referrerId,
      p_referral_code: referralCode,
    })

    expect(data.error).toBe('Cannot use your own referral code')
  })

  it('should qualify referrer after referee wagers enough', async () => {
    // Simulate referee wagering 500 credits
    const { error } = await supabaseAdmin.rpc('check_referral_qualification', {
      p_referee_id: refereeId,
      p_wager_amount: 500,
    })
    expect(error).toBeNull()

    // Check referral is now rewarded
    const { data: referral } = await supabaseAdmin
      .from('referrals')
      .select('status, referrer_paid')
      .eq('referee_id', refereeId)
      .single()

    expect(referral!.status).toBe('rewarded')
    expect(referral!.referrer_paid).toBe(true)

    // Referrer should have earned 500 bonus credits
    const { data: referrerProfile } = await supabaseAdmin
      .from('profiles')
      .select('balance, referral_count, referral_earnings')
      .eq('id', referrerId)
      .single()

    expect(referrerProfile!.balance).toBe(10500) // 10000 + 500
    expect(referrerProfile!.referral_count).toBe(1)
    expect(referrerProfile!.referral_earnings).toBe(500)
  })
})
