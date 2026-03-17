import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

export function initSentry() {
  if (!SENTRY_DSN) return

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    debug: false,
  })
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (context) {
    Sentry.setContext('custom', context)
  }
  Sentry.captureException(error)
}

export function setUser(userId: string, email?: string, username?: string) {
  Sentry.setUser({ id: userId, email, username })
}

export function clearUser() {
  Sentry.setUser(null)
}

export { Sentry }
