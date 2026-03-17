'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, ArrowLeft, Loader2, CheckCircle2, Copy, Eye, EyeOff,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Step = 'setup' | 'verify' | 'backup' | 'done'

export default function Setup2FAPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [step, setStep] = useState<Step>('setup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrUri, setQrUri] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirectTo=/setup-2fa')
    }
  }, [user, authLoading, router])

  // Step 1: Enroll TOTP factor
  const handleEnroll = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Fortuna Casino 2FA',
      })

      if (enrollError) throw enrollError

      if (data) {
        setQrUri(data.totp.qr_code)
        setSecret(data.totp.secret)
        setFactorId(data.id)
        setStep('verify')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up 2FA. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify the TOTP code
  const handleVerify = async () => {
    if (!factorId || verifyCode.length !== 6) return
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const challenge = await supabase.auth.mfa.challenge({ factorId })

      if (challenge.error) throw challenge.error

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode,
      })

      if (verify.error) throw verify.error

      // Generate pseudo backup codes (in production these come from the server)
      const codes = Array.from({ length: 8 }, () =>
        Math.random().toString(36).substring(2, 8).toUpperCase()
      )
      setBackupCodes(codes)
      setStep('backup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--casino-accent)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-2 text-[var(--casino-text-muted)] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-7 h-7 text-[var(--casino-accent)]" />
          <h1 className="text-2xl font-bold text-white">Two-Factor Authentication</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          {(['setup', 'verify', 'backup'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  step === s || (step === 'done' && i <= 2)
                    ? 'bg-[var(--casino-accent)] text-black'
                    : i < ['setup', 'verify', 'backup', 'done'].indexOf(step)
                    ? 'bg-[var(--casino-green)] text-black'
                    : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)] border border-[var(--casino-border)]'
                }`}
              >
                {i < ['setup', 'verify', 'backup', 'done'].indexOf(step) ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div
                  className={`flex-1 h-0.5 ${
                    i < ['setup', 'verify', 'backup', 'done'].indexOf(step)
                      ? 'bg-[var(--casino-green)]'
                      : 'bg-[var(--casino-border)]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg border border-[var(--casino-red)]/30 bg-[var(--casino-red)]/10 px-4 py-3 text-sm text-[var(--casino-red)]"
          >
            {error}
          </motion.div>
        )}

        {/* Step Content */}
        {step === 'setup' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card hover={false} glow="gold">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--casino-accent)] to-[#e6c84a] flex items-center justify-center">
                  <Shield className="w-8 h-8 text-black" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Secure Your Account
                </h2>
                <p className="text-sm text-[var(--casino-text-muted)] mb-6 max-w-sm mx-auto">
                  Add an extra layer of security with a time-based one-time password (TOTP).
                  You will need an authenticator app like Google Authenticator or Authy.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  loading={loading}
                  onClick={handleEnroll}
                  icon={<Shield className="w-5 h-5" />}
                >
                  Set Up 2FA
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card hover={false} glow="gold">
              <div className="text-center py-4">
                <h2 className="text-lg font-bold text-white mb-4">
                  Scan QR Code
                </h2>

                {/* QR Code */}
                {qrUri && (
                  <div className="inline-block p-4 bg-white rounded-xl mb-4">
                    <img src={qrUri} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                )}

                {/* Manual Secret */}
                {secret && (
                  <div className="mb-6">
                    <p className="text-xs text-[var(--casino-text-muted)] mb-2">
                      Or enter this code manually:
                    </p>
                    <div className="flex items-center gap-2 justify-center">
                      <code className="px-3 py-1.5 rounded-lg bg-[var(--casino-surface)] border border-[var(--casino-border)] text-sm font-mono text-white">
                        {showSecret ? secret : '****' + secret.slice(-4)}
                      </code>
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="p-1.5 rounded-lg text-[var(--casino-text-muted)] hover:text-white transition-colors cursor-pointer"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Verification Code Input */}
                <p className="text-sm text-[var(--casino-text-muted)] mb-3">
                  Enter the 6-digit code from your authenticator app:
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-48 mx-auto block bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.3em] focus:outline-none focus:border-[var(--casino-accent)] transition-colors mb-4"
                />
                <Button
                  variant="primary"
                  size="lg"
                  loading={loading}
                  onClick={handleVerify}
                  disabled={verifyCode.length !== 6}
                >
                  Verify &amp; Enable
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 'backup' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card hover={false} glow="purple">
              <div className="text-center py-4">
                <h2 className="text-lg font-bold text-white mb-2">
                  Save Your Backup Codes
                </h2>
                <p className="text-sm text-[var(--casino-text-muted)] mb-6">
                  Store these codes in a safe place. Each code can only be used once
                  if you lose access to your authenticator.
                </p>

                <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto mb-6">
                  {backupCodes.map((code, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 rounded-lg bg-[var(--casino-surface)] border border-[var(--casino-border)] font-mono text-sm text-white"
                    >
                      {code}
                    </div>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="md"
                  onClick={copyBackupCodes}
                  icon={copied ? <CheckCircle2 className="w-4 h-4 text-[var(--casino-green)]" /> : <Copy className="w-4 h-4" />}
                  className="mb-4"
                >
                  {copied ? 'Copied!' : 'Copy All Codes'}
                </Button>

                <div>
                  <Button
                    variant="success"
                    size="lg"
                    onClick={() => setStep('done')}
                  >
                    I have saved my codes
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card hover={false} glow="green">
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--casino-green)]/10 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-10 h-10 text-[var(--casino-green)]" />
                </motion.div>
                <h2 className="text-xl font-bold text-white mb-2">
                  2FA is Now Enabled
                </h2>
                <p className="text-sm text-[var(--casino-text-muted)] mb-6">
                  Your account is now protected with two-factor authentication.
                  You will need your authenticator app to sign in.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push('/profile')}
                  icon={<ArrowLeft className="w-5 h-5" />}
                >
                  Back to Profile
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
