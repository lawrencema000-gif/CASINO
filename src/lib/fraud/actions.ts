import { supabaseAdmin } from '@/lib/supabase/admin'
import type { FraudResult } from './rules'
import type { RiskLevel } from './scoring'
import { calculateRiskScore } from './scoring'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FraudActionResult {
  riskScore: number
  riskLevel: RiskLevel
  actions: string[]
  flagIds: string[]
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Insert a fraud flag row and return its id. */
async function insertFraudFlag(
  userId: string,
  flag: FraudResult
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('fraud_flags')
    .insert({
      user_id: userId,
      rule_id: flag.ruleId,
      rule_name: flag.ruleName,
      severity: flag.severity,
      details: flag.details,
      metadata: flag.metadata ?? {},
      status: 'open',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[fraud] Failed to insert flag:', error.message)
    return null
  }
  return data?.id ?? null
}

/** Restrict the user from placing bets above a threshold. */
async function restrictLargeBets(userId: string, maxBet: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ max_bet_limit: maxBet })
    .eq('id', userId)

  if (error) {
    console.error('[fraud] Failed to restrict bets:', error.message)
  }
}

/** Suspend the user account. */
async function suspendAccount(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      suspended: true,
      suspended_at: new Date().toISOString(),
      suspension_reason: 'Automated fraud detection — critical risk',
    })
    .eq('id', userId)

  if (error) {
    console.error('[fraud] Failed to suspend account:', error.message)
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Given a set of triggered fraud flags for a user, calculate the risk score
 * and take automated action based on the resulting risk level.
 *
 * Actions by level:
 *  - low:      log only (no DB write)
 *  - medium:   insert fraud_flags for manual review
 *  - high:     insert flags + restrict large bets (> 10,000)
 *  - critical: insert flags + suspend account
 */
export async function executeFraudActions(
  userId: string,
  flags: FraudResult[]
): Promise<FraudActionResult> {
  const { score, level } = calculateRiskScore(flags)
  const actions: string[] = []
  const flagIds: string[] = []

  if (level === 'low') {
    // Log-only — no database writes
    actions.push('log_only')
    if (flags.length > 0) {
      console.info(`[fraud] User ${userId} — low risk (score ${score}), ${flags.length} minor flags logged`)
    }
    return { riskScore: score, riskLevel: level, actions, flagIds }
  }

  // Medium, high, and critical all insert flags for review
  for (const f of flags) {
    const id = await insertFraudFlag(userId, f)
    if (id) flagIds.push(id)
  }
  actions.push('flagged_for_review')

  if (level === 'high') {
    // Additionally restrict large bets
    await restrictLargeBets(userId, 10000)
    actions.push('large_bets_restricted:10000')
    console.warn(`[fraud] User ${userId} — HIGH risk (score ${score}), large bets restricted`)
  }

  if (level === 'critical') {
    // Restrict bets AND suspend account
    await restrictLargeBets(userId, 10000)
    await suspendAccount(userId)
    actions.push('large_bets_restricted:10000')
    actions.push('account_suspended')
    console.error(`[fraud] User ${userId} — CRITICAL risk (score ${score}), account suspended`)
  }

  return { riskScore: score, riskLevel: level, actions, flagIds }
}
