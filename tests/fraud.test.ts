import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabaseAdmin, createTestUser, cleanupTestUsers } from './setup'

let user1Id: string
let user2Id: string

describe('Fraud Detection System', () => {
  beforeAll(async () => {
    const u1 = await createTestUser('fraud1')
    user1Id = u1.id
    const u2 = await createTestUser('fraud2')
    user2Id = u2.id
  })

  afterAll(async () => {
    await cleanupTestUsers()
  })

  it('should register a device for a single user without flagging', async () => {
    const { data, error } = await supabaseAdmin.rpc('register_device', {
      p_user_id: user1Id,
      p_fingerprint_hash: 'test_fp_unique_' + Date.now(),
      p_user_agent: 'TestAgent/1.0',
      p_screen_resolution: '1920x1080x24',
      p_timezone: 'America/New_York',
      p_language: 'en-US',
      p_platform: 'Win32',
      p_canvas_hash: 'canvas_test_123',
    })

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(data.flagged).toBe(false)
    expect(data.shared_accounts).toBe(1)
  })

  it('should flag multi-account when two users share a device', async () => {
    const sharedFp = 'test_fp_shared_' + Date.now()

    // Register for user 1
    await supabaseAdmin.rpc('register_device', {
      p_user_id: user1Id,
      p_fingerprint_hash: sharedFp,
      p_user_agent: 'TestAgent/1.0',
    })

    // Register same fingerprint for user 2
    const { data, error } = await supabaseAdmin.rpc('register_device', {
      p_user_id: user2Id,
      p_fingerprint_hash: sharedFp,
      p_user_agent: 'TestAgent/1.0',
    })

    expect(error).toBeNull()
    expect(data.flagged).toBe(true)
    expect(data.shared_accounts).toBe(2)

    // Verify fraud flag was created
    const { data: flags } = await supabaseAdmin
      .from('fraud_flags')
      .select('flag_type, severity, status')
      .eq('user_id', user2Id)
      .eq('flag_type', 'multi_account')

    expect(flags!.length).toBeGreaterThan(0)
    expect(flags![0].severity).toBe('medium')
    expect(flags![0].status).toBe('pending')
  })

  it('should update risk score for flagged users', async () => {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('risk_score, risk_level')
      .eq('id', user2Id)
      .single()

    expect(data!.risk_score).toBeGreaterThan(0)
  })

  it('should show shared devices in multi_account_devices view', async () => {
    const { data, error } = await supabaseAdmin
      .from('multi_account_devices')
      .select('*')

    expect(error).toBeNull()
    // At least one shared device from our test
    const testDevices = (data || []).filter(d => d.account_count >= 2)
    expect(testDevices.length).toBeGreaterThan(0)
  })
})
