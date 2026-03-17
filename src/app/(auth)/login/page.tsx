'use client'

import { useState, useEffect, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Crown, Mail, Lock, Loader2, Dices, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const SAVED_EMAIL_KEY = 'fortuna_saved_email'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  // Sanitize redirectTo — only allow relative paths (prevent open redirect)
  const rawRedirect = searchParams.get('redirectTo') || '/'
  const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/'

  // On mount: check localStorage for saved email
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SAVED_EMAIL_KEY)
      if (saved) {
        setEmail(saved)
        setRememberMe(true)
      }
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      // Handle remember me + clear demo mode
      if (typeof window !== 'undefined') {
        if (rememberMe) {
          localStorage.setItem(SAVED_EMAIL_KEY, email)
        } else {
          localStorage.removeItem(SAVED_EMAIL_KEY)
        }
        localStorage.removeItem('demo_mode')
      }

      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleGuestMode = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('demo_mode', 'true')
    }
    router.push('/')
  }

  return (
    <div className="w-full">
      {/* Casino Branding */}
      <div className="mb-8 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#c9a227] shadow-[0_0_30px_rgba(255,215,0,0.3)]"
        >
          <Crown className="h-8 w-8 text-black" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-black tracking-wider"
        >
          <span className="bg-gradient-to-r from-[#FFD700] via-[#e6c84a] to-[#FFD700] bg-clip-text text-transparent">
            FORTUNA CASINO
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-1 text-sm text-zinc-500"
        >
          Provably fair gaming platform
        </motion.p>
      </div>

      {/* Welcome Text */}
      <h2 className="mb-6 text-center text-xl font-semibold text-white">
        Welcome Back
      </h2>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#EF4444]"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-400"
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-[#333] bg-[#111118] px-4 py-2.5 text-white placeholder-gray-500 outline-none transition-colors focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700]/25"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-400"
          >
            <Lock className="h-3.5 w-3.5" />
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-[#333] bg-[#111118] px-4 py-2.5 pr-10 text-white placeholder-gray-500 outline-none transition-colors focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700]/25"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Remember Me + Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-[#111118] accent-[#FFD700] focus:ring-[#FFD700]/25"
            />
            <span>Remember me</span>
          </label>
          <Link
            href="/reset-password"
            className="text-sm text-zinc-500 transition-colors hover:text-[#FFD700]"
          >
            Forgot password?
          </Link>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-[#c9a227] via-[#FFD700] to-[#e6c84a] px-4 py-2.5 font-bold uppercase tracking-wide text-black transition-all hover:shadow-[0_0_25px_rgba(255,215,0,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </span>
          ) : (
            'SIGN IN'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs text-zinc-600">or</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      {/* Google OAuth */}
      <button
        onClick={async () => {
          const supabase = createClient()
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          })
        }}
        className="w-full rounded-lg border border-[#333] bg-[#111118] px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-zinc-600 hover:bg-[#1a1a24] flex items-center justify-center gap-3"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </button>

      <div className="mt-3" />

      {/* Continue as Guest */}
      <button
        onClick={handleGuestMode}
        className="w-full rounded-lg border border-[#333] bg-transparent px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:border-[#FFD700]/50 hover:text-white"
      >
        <span className="flex items-center justify-center gap-2">
          <Dices className="h-4 w-4" />
          Continue as Guest
        </span>
      </button>

      {/* Register link */}
      <p className="mt-6 text-center text-sm text-zinc-500">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-medium text-[#FFD700] transition-colors hover:text-[#e6c84a]"
        >
          Sign Up
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
