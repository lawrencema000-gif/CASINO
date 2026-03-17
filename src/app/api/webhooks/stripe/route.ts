export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getPackageById } from '@/lib/stripe/packages'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const userId = session.metadata?.userId
    const packageId = session.metadata?.packageId
    const credits = parseInt(session.metadata?.credits || '0', 10)
    const bonusCredits = parseInt(session.metadata?.bonusCredits || '0', 10)

    if (!userId || !packageId) {
      console.error('Missing metadata in checkout session:', session.id)
      return NextResponse.json({ received: true })
    }

    const pkg = getPackageById(packageId)
    const packageName = pkg?.name || packageId
    const totalCredits = credits + bonusCredits

    try {
      // 1. Fetch current profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('balance, purchased_balance, bonus_balance, first_purchase_at')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        console.error('Failed to fetch profile:', profileError)
        return NextResponse.json({ error: 'Profile not found' }, { status: 500 })
      }

      const newBalance = (profile.balance ?? 0) + totalCredits
      const newPurchasedBalance = (profile.purchased_balance ?? 0) + credits
      const newBonusBalance = (profile.bonus_balance ?? 0) + bonusCredits

      // 2. Update profile balance
      const updateData: Record<string, unknown> = {
        balance: newBalance,
        purchased_balance: newPurchasedBalance,
        bonus_balance: newBonusBalance,
      }

      // Track first purchase
      if (!profile.first_purchase_at) {
        updateData.first_purchase_at = new Date().toISOString()
      }

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (updateError) {
        console.error('Failed to update balance:', updateError)
        return NextResponse.json({ error: 'Balance update failed' }, { status: 500 })
      }

      // 3. Insert purchase record
      const { error: purchaseError } = await supabaseAdmin
        .from('purchases')
        .insert({
          player_id: userId,
          package_id: packageId,
          credits,
          bonus_credits: bonusCredits,
          amount_paid: session.amount_total ?? 0,
          stripe_session_id: session.id,
          stripe_payment_intent: typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
          status: 'completed',
        })

      if (purchaseError) {
        console.error('Failed to insert purchase:', purchaseError)
      }

      // 4. Insert transaction record
      const { error: txError } = await supabaseAdmin
        .from('transactions')
        .insert({
          player_id: userId,
          type: 'deposit',
          amount: totalCredits,
          balance_after: newBalance,
          description: `Credit purchase - ${packageName}`,
        })

      if (txError) {
        console.error('Failed to insert transaction:', txError)
      }

      console.log(
        `Purchase completed: user=${userId}, package=${packageId}, credits=${totalCredits}`
      )
    } catch (err) {
      console.error('Webhook processing error:', err)
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
