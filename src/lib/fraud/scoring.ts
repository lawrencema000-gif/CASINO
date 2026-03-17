import type { FraudResult, FraudSeverity } from './rules'

// ---------------------------------------------------------------------------
// Risk level thresholds
// ---------------------------------------------------------------------------

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RiskScore {
  /** Numeric score (0+) */
  score: number
  /** Derived risk level */
  level: RiskLevel
  /** Individual flag scores that contributed */
  breakdown: { ruleId: string; severity: FraudSeverity; points: number }[]
}

// Points per severity tier
const SEVERITY_POINTS: Record<FraudSeverity, number> = {
  low: 10,
  medium: 25,
  high: 50,
  critical: 100,
}

// Score → risk level mapping
function scoreToLevel(score: number): RiskLevel {
  if (score >= 81) return 'critical'
  if (score >= 51) return 'high'
  if (score >= 21) return 'medium'
  return 'low'
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate an aggregate risk score from a set of triggered fraud flags.
 *
 * Scoring:
 *  - low severity:     +10 per flag
 *  - medium severity:  +25 per flag
 *  - high severity:    +50 per flag
 *  - critical severity:+100 per flag
 *
 * Risk levels:
 *  - 0-20:   low
 *  - 21-50:  medium
 *  - 51-80:  high
 *  - 81+:    critical
 */
export function calculateRiskScore(
  flags: FraudResult[]
): RiskScore {
  if (!flags || flags.length === 0) {
    return { score: 0, level: 'low', breakdown: [] }
  }

  const breakdown: RiskScore['breakdown'] = []
  let score = 0

  for (const f of flags) {
    const points = SEVERITY_POINTS[f.severity] ?? 0
    score += points
    breakdown.push({ ruleId: f.ruleId, severity: f.severity, points })
  }

  return {
    score,
    level: scoreToLevel(score),
    breakdown,
  }
}
