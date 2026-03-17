import { supabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical'
export type FraudAction = 'bet' | 'deposit' | 'withdraw' | 'bonus_claim' | 'login'

export interface FraudContext {
  userId: string
  action: FraudAction
  amount?: number
  metadata?: Record<string, unknown>
}

export interface FraudResult {
  ruleId: string
  ruleName: string
  severity: FraudSeverity
  triggered: boolean
  details: string
  metadata?: Record<string, unknown>
}

export interface FraudRule {
  id: string
  name: string
  description: string
  severity: FraudSeverity
  /** Which actions this rule applies to */
  appliesTo: FraudAction[]
  check: (context: FraudContext) => Promise<FraudResult>
}

// ---------------------------------------------------------------------------
// Helper — build a non-triggered result for a rule
// ---------------------------------------------------------------------------

function pass(rule: FraudRule): FraudResult {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    triggered: false,
    details: '',
  }
}

function flag(rule: FraudRule, details: string, meta?: Record<string, unknown>): FraudResult {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    triggered: true,
    details,
    metadata: meta,
  }
}

// ---------------------------------------------------------------------------
// Rule 1 — Rapid Betting (>50 bets in 5 min)
// ---------------------------------------------------------------------------

const rapidBetting: FraudRule = {
  id: 'rapid_betting',
  name: 'Rapid Betting',
  description: 'More than 50 bets placed within the last 5 minutes',
  severity: 'high',
  appliesTo: ['bet'],
  async check(ctx) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { count, error } = await supabaseAdmin
      .from('games')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', ctx.userId)
      .gte('created_at', fiveMinAgo)

    if (error) return pass(this)

    const total = count ?? 0
    if (total > 50) {
      return flag(this, `${total} bets in last 5 minutes`, { betCount: total })
    }
    return pass(this)
  },
}

// ---------------------------------------------------------------------------
// Rule 2 — Large Bet Spike (bet > 10x avg)
// ---------------------------------------------------------------------------

const largeBetSpike: FraudRule = {
  id: 'large_bet_spike',
  name: 'Large Bet Spike',
  description: 'Single bet exceeds 10x the user average bet',
  severity: 'medium',
  appliesTo: ['bet'],
  async check(ctx) {
    if (!ctx.amount) return pass(this)

    const { data, error } = await supabaseAdmin
      .from('games')
      .select('bet_amount')
      .eq('player_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error || !data || data.length < 5) return pass(this)

    const avg = data.reduce((s, g) => s + g.bet_amount, 0) / data.length
    if (avg > 0 && ctx.amount > avg * 10) {
      return flag(this, `Bet ${ctx.amount} is ${(ctx.amount / avg).toFixed(1)}x the average (${avg.toFixed(0)})`, {
        currentBet: ctx.amount,
        averageBet: avg,
      })
    }
    return pass(this)
  },
}

// ---------------------------------------------------------------------------
// Rule 3 — Bonus Abuse (multi-account)
// ---------------------------------------------------------------------------

const bonusAbuse: FraudRule = {
  id: 'bonus_abuse',
  name: 'Bonus Abuse',
  description: 'Claiming bonus within 1 minute of account creation (multi-account indicator)',
  severity: 'critical',
  appliesTo: ['bonus_claim'],
  async check(ctx) {
    // Get account creation time
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('created_at')
      .eq('id', ctx.userId)
      .single()

    if (profileErr || !profile) return pass(this)

    const created = new Date(profile.created_at).getTime()
    const now = Date.now()
    const timeSinceCreation = now - created

    // If claiming bonus within 1 minute of account creation
    if (timeSinceCreation < 60 * 1000) {
      // Also check if this device fingerprint is shared with other accounts
      const { data: devices } = await supabaseAdmin
        .from('device_fingerprints')
        .select('fingerprint_hash')
        .eq('user_id', ctx.userId)
        .limit(1)

      if (devices && devices.length > 0) {
        const { count } = await supabaseAdmin
          .from('device_fingerprints')
          .select('user_id', { count: 'exact', head: true })
          .eq('fingerprint_hash', devices[0].fingerprint_hash)

        const sharedAccounts = count ?? 1
        if (sharedAccounts > 1) {
          return flag(this, `Bonus claimed ${Math.round(timeSinceCreation / 1000)}s after account creation; device shared with ${sharedAccounts} accounts`, {
            timeSinceCreationMs: timeSinceCreation,
            sharedAccounts,
          })
        }
      }

      return flag(this, `Bonus claimed ${Math.round(timeSinceCreation / 1000)}s after account creation`, {
        timeSinceCreationMs: timeSinceCreation,
      })
    }
    return pass(this)
  },
}

// ---------------------------------------------------------------------------
// Rule 4 — Impossible Win Rate (>80% over 100+ games)
// ---------------------------------------------------------------------------

const impossibleWinRate: FraudRule = {
  id: 'impossible_win_rate',
  name: 'Impossible Win Rate',
  description: 'Win rate exceeds 80% over 100+ settled games',
  severity: 'high',
  appliesTo: ['bet', 'withdraw'],
  async check(ctx) {
    const { data, error } = await supabaseAdmin
      .from('games')
      .select('payout, bet_amount')
      .eq('player_id', ctx.userId)
      .eq('settled', true)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error || !data || data.length < 100) return pass(this)

    const wins = data.filter(g => g.payout > 0).length
    const winRate = wins / data.length

    if (winRate > 0.8) {
      return flag(this, `Win rate ${(winRate * 100).toFixed(1)}% over ${data.length} games`, {
        winRate,
        gamesChecked: data.length,
        wins,
      })
    }
    return pass(this)
  },
}

// ---------------------------------------------------------------------------
// Rule 5 — Device Sharing (same fingerprint on 3+ accounts)
// ---------------------------------------------------------------------------

const deviceSharing: FraudRule = {
  id: 'device_sharing',
  name: 'Device Sharing',
  description: 'Same device fingerprint associated with 3 or more accounts',
  severity: 'high',
  appliesTo: ['login', 'bet', 'deposit', 'withdraw', 'bonus_claim'],
  async check(ctx) {
    // Get this user's device fingerprints
    const { data: devices, error: devErr } = await supabaseAdmin
      .from('device_fingerprints')
      .select('fingerprint_hash')
      .eq('user_id', ctx.userId)

    if (devErr || !devices || devices.length === 0) return pass(this)

    // Check each fingerprint for shared accounts
    for (const device of devices) {
      const { count, error } = await supabaseAdmin
        .from('device_fingerprints')
        .select('user_id', { count: 'exact', head: true })
        .eq('fingerprint_hash', device.fingerprint_hash)

      if (error) continue

      const total = count ?? 0
      if (total >= 3) {
        return flag(this, `Device fingerprint shared across ${total} accounts`, {
          fingerprintHash: device.fingerprint_hash,
          sharedAccounts: total,
        })
      }
    }

    return pass(this)
  },
}

// ---------------------------------------------------------------------------
// Rule 6 — Withdrawal After Bonus (within 5 min of bonus claim)
// ---------------------------------------------------------------------------

const withdrawalAfterBonus: FraudRule = {
  id: 'withdrawal_after_bonus',
  name: 'Withdrawal After Bonus',
  description: 'Attempting withdrawal within 5 minutes of claiming a bonus',
  severity: 'medium',
  appliesTo: ['withdraw'],
  async check(ctx) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data: recentBonuses, error } = await supabaseAdmin
      .from('transactions')
      .select('id, created_at')
      .eq('player_id', ctx.userId)
      .eq('type', 'bonus')
      .gte('created_at', fiveMinAgo)
      .limit(1)

    if (error) return pass(this)

    if (recentBonuses && recentBonuses.length > 0) {
      const bonusTime = recentBonuses[0].created_at
      return flag(this, `Withdrawal attempted ${Math.round((Date.now() - new Date(bonusTime).getTime()) / 1000)}s after bonus claim`, {
        bonusClaimedAt: bonusTime,
      })
    }
    return pass(this)
  },
}

// ---------------------------------------------------------------------------
// Rule 7 — Login Velocity (10+ failed logins in 10 min)
// ---------------------------------------------------------------------------

const loginVelocity: FraudRule = {
  id: 'login_velocity',
  name: 'Login Velocity',
  description: '10 or more failed login attempts in the last 10 minutes',
  severity: 'high',
  appliesTo: ['login'],
  async check(ctx) {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    // Check auth.audit_log_entries if available, otherwise use a fraud_events table
    const { count, error } = await supabaseAdmin
      .from('fraud_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId)
      .eq('event_type', 'failed_login')
      .gte('created_at', tenMinAgo)

    if (error) {
      // Table may not exist — silently pass
      return pass(this)
    }

    const total = count ?? 0
    if (total >= 10) {
      return flag(this, `${total} failed logins in last 10 minutes`, {
        failedLogins: total,
      })
    }
    return pass(this)
  },
}

// ---------------------------------------------------------------------------
// All rules registry
// ---------------------------------------------------------------------------

export const FRAUD_RULES: FraudRule[] = [
  rapidBetting,
  largeBetSpike,
  bonusAbuse,
  impossibleWinRate,
  deviceSharing,
  withdrawalAfterBonus,
  loginVelocity,
]

// ---------------------------------------------------------------------------
// Main entry point — run all applicable rules
// ---------------------------------------------------------------------------

export async function runFraudCheck(context: FraudContext): Promise<FraudResult[]> {
  const applicableRules = FRAUD_RULES.filter(rule =>
    rule.appliesTo.includes(context.action)
  )

  const results = await Promise.allSettled(
    applicableRules.map(rule => rule.check(context))
  )

  return results
    .filter((r): r is PromiseFulfilledResult<FraudResult> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(r => r.triggered)
}
