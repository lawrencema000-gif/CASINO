import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY

export const stripe = key
  ? new Stripe(key, { apiVersion: '2026-02-25.clover' })
  : null

export function getStripeOrThrow(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.')
  }
  return stripe
}
