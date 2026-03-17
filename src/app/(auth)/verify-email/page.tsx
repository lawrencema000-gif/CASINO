'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mail, Loader2, CheckCircle2, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function VerifyEmailPage() {
  const router = useRouter()
  const supabase = createClient()
  const [verified, setVerified] = useState(false)
  const [checking, setChecking] = useState(true)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const checkVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email || '')
      if (user.email_confirmed_at) {
        setVerified(true)
        setTimeout(() => router.push('/'), 3000)
      }
      setChecking(false)
    }
    checkVerification()

    // Listen for auth changes (email confirmed via link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'USER_UPDATED') {
        setVerified(true)
        setTimeout(() => router.push('/'), 3000)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  const handleResend = async () => {
    setResending(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })
    if (!error) setResent(true)
    setResending(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--casino-accent)] animate-spin" />
      </div>
    )
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card hover={false} className="max-w-md w-full text-center py-10">
            <CheckCircle2 className="w-16 h-16 text-[var(--casino-green)] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
            <p className="text-sm text-[var(--casino-text-muted)]">Redirecting to lobby...</p>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Card hover={false} className="text-center py-10">
          <Mail className="w-16 h-16 text-[var(--casino-accent)] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Verify Your Email</h2>
          <p className="text-sm text-[var(--casino-text-muted)] mb-1">
            We sent a verification link to:
          </p>
          <p className="text-sm text-white font-medium mb-6">{email}</p>
          <p className="text-xs text-[var(--casino-text-muted)] mb-6">
            Click the link in the email to verify your account. Check your spam folder if you don&apos;t see it.
          </p>

          <div className="flex flex-col gap-3 items-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResend}
              disabled={resending || resent}
              className="flex items-center gap-2"
            >
              {resending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {resent ? 'Email Sent!' : 'Resend Verification Email'}
            </Button>
            <Link href="/" className="text-xs text-[var(--casino-text-muted)] hover:text-white transition">
              Continue to lobby (limited access)
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
