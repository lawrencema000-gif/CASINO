'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Crown, Mail, Lock, Loader2, Dices } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

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

    router.push(redirectTo)
    router.refresh()
  }

  const handleGuestMode = () => {
    // Set demo mode flag in localStorage and redirect to lobby
    if (typeof window !== 'undefined') {
      localStorage.setItem('casino_demo_mode', 'true')
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
            className="w-full rounded-lg border border-[#333] bg-[#111118] px-4 py-2.5 text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700]/25"
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
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-lg border border-[#333] bg-[#111118] px-4 py-2.5 text-white placeholder-zinc-500 outline-none transition-colors focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700]/25"
          />
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-[#c9a227] via-[#FFD700] to-[#e6c84a] px-4 py-2.5 font-bold text-black transition-all hover:shadow-[0_0_25px_rgba(255,215,0,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs text-zinc-600">or</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

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
