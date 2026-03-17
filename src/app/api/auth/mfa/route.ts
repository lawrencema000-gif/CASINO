import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST — MFA operations: enroll, verify, unenroll
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'enroll': {
        // Start TOTP enrollment — returns QR code URI + secret
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Fortuna Casino Authenticator',
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({
          factorId: data.id,
          qrCode: data.totp.qr_code,
          secret: data.totp.secret,
          uri: data.totp.uri,
        })
      }

      case 'verify': {
        // Verify TOTP code to complete enrollment
        const { factorId, code } = body
        if (!factorId || !code) {
          return NextResponse.json({ error: 'factorId and code required' }, { status: 400 })
        }

        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId,
        })

        if (challengeError) {
          return NextResponse.json({ error: challengeError.message }, { status: 400 })
        }

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challenge.id,
          code,
        })

        if (verifyError) {
          return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
        }

        return NextResponse.json({ success: true, message: '2FA enabled successfully' })
      }

      case 'unenroll': {
        // Remove TOTP factor
        const { factorId } = body
        if (!factorId) {
          return NextResponse.json({ error: 'factorId required' }, { status: 400 })
        }

        const { error } = await supabase.auth.mfa.unenroll({
          factorId,
        })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true, message: '2FA disabled' })
      }

      case 'status': {
        // Get current MFA factors
        const { data, error } = await supabase.auth.mfa.listFactors()

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        const totpFactors = data.totp || []
        const verified = totpFactors.filter(f => f.status === 'verified')

        return NextResponse.json({
          enabled: verified.length > 0,
          factors: totpFactors.map(f => ({
            id: f.id,
            friendlyName: f.friendly_name,
            status: f.status,
            createdAt: f.created_at,
          })),
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
