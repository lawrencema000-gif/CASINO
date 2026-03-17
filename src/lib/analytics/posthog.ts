import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  if (typeof window === 'undefined' || initialized) return

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (!key) return

  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage',
    loaded: () => { initialized = true },
  })
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  posthog.identify(userId, properties)
}

export function resetUser() {
  if (typeof window === 'undefined') return
  posthog.reset()
}

// Game events
export function trackGameStart(gameType: string, betAmount: number) {
  posthog.capture('game_started', { game_type: gameType, bet_amount: betAmount })
}

export function trackGameEnd(gameType: string, betAmount: number, payout: number, multiplier: number) {
  posthog.capture('game_ended', {
    game_type: gameType,
    bet_amount: betAmount,
    payout,
    multiplier,
    net_result: payout - betAmount,
    won: payout > 0,
  })
}

// Commerce events
export function trackPurchaseStarted(packageId: string, amount: number) {
  posthog.capture('purchase_started', { package_id: packageId, amount_cents: amount })
}

export function trackPurchaseCompleted(packageId: string, credits: number, amount: number) {
  posthog.capture('purchase_completed', { package_id: packageId, credits, amount_cents: amount })
}

// Auth events
export function trackSignUp(method: 'email' | 'google' | 'guest') {
  posthog.capture('user_signed_up', { method })
}

export function trackLogin(method: 'email' | 'google') {
  posthog.capture('user_logged_in', { method })
}

// Engagement events
export function trackBonusClaimed(bonusType: string, amount: number) {
  posthog.capture('bonus_claimed', { bonus_type: bonusType, amount })
}

export function trackMissionCompleted(missionId: string, reward: number) {
  posthog.capture('mission_completed', { mission_id: missionId, reward })
}

export function trackTournamentJoined(tournamentId: string, entryFee: number) {
  posthog.capture('tournament_joined', { tournament_id: tournamentId, entry_fee: entryFee })
}

export function trackPageView(pageName: string) {
  posthog.capture('$pageview', { page_name: pageName })
}

export { posthog }
