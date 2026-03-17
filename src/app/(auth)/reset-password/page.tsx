'use client'

import { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail, Loader2, CheckCircle2, KeyRound } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[var(--casino-accent)] animate-spin" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRecovery = searchParams.get('type') === 'recovery'

  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password?type=recovery`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setError(error.message)
    } else {
      setUpdated(true)
      setTimeout(() => router.push('/'), 3000)
    }
    setLoading(false)
  }

  // Recovery mode — user clicked the email link
  if (isRecovery) {
    if (updated) {
      return (
        <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card hover={false} className="max-w-md w-full text-center py-10">
              <CheckCircle2 className="w-16 h-16 text-[var(--casino-green)] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Password Updated</h2>
              <p className="text-sm text-[var(--casino-text-muted)]">Redirecting to lobby...</p>
            </Card>
          </motion.div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-3 mb-8">
            <KeyRound className="w-7 h-7 text-[var(--casino-accent)]" />
            <h1 className="text-2xl font-bold text-white">Set New Password</h1>
          </div>
          <Card hover={false}>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  className="w-full px-4 py-2.5 rounded-lg bg-[var(--casino-bg)] border border-[var(--casino-border)] text-white placeholder-[var(--casino-text-muted)]/50 focus:border-[var(--casino-accent)] focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full px-4 py-2.5 rounded-lg bg-[var(--casino-bg)] border border-[var(--casino-border)] text-white placeholder-[var(--casino-text-muted)]/50 focus:border-[var(--casino-accent)] focus:outline-none text-sm"
                />
              </div>
              {error && (
                <p className="text-sm text-[var(--casino-red)]">{error}</p>
              )}
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    )
  }

  // Request mode — enter email to get reset link
  if (sent) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card hover={false} className="max-w-md w-full text-center py-10">
            <Mail className="w-16 h-16 text-[var(--casino-accent)] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
            <p className="text-sm text-[var(--casino-text-muted)] mb-6">
              We sent a password reset link to <span className="text-white font-medium">{email}</span>
            </p>
            <Link href="/login">
              <Button variant="secondary" size="sm">Back to Login</Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/login" className="text-[var(--casino-text-muted)] hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <KeyRound className="w-7 h-7 text-[var(--casino-accent)]" />
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        </div>
        <Card hover={false}>
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--casino-bg)] border border-[var(--casino-border)] text-white placeholder-[var(--casino-text-muted)]/50 focus:border-[var(--casino-accent)] focus:outline-none text-sm"
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--casino-red)]">{error}</p>
            )}
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
            </Button>
            <p className="text-xs text-[var(--casino-text-muted)] text-center">
              Remember your password? <Link href="/login" className="text-[var(--casino-accent)] hover:underline">Sign in</Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}
