'use client'

import { useState, useMemo, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Crown,
  User,
  Mail,
  Lock,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Very Weak', color: 'bg-[#EF4444]' }
  if (score === 2) return { score, label: 'Weak', color: 'bg-orange-500' }
  if (score === 3) return { score, label: 'Fair', color: 'bg-yellow-500' }
  if (score === 4) return { score, label: 'Strong', color: 'bg-[#00FF88]' }
  return { score, label: 'Very Strong', color: 'bg-emerald-400' }
}

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validations
    if (!username.trim()) {
      setError('Username is required.')
      return
    }

    if (username.length < 3 || username.length > 20) {
      setError('Username must be between 3 and 20 characters.')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!agreeTerms) {
      setError('You must confirm you are 18+ and agree to the Terms.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Check if username is taken
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()

      if (existingUser) {
        setError('Username is already taken.')
        setLoading(false)
        return
      }

      // Create auth account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Create profile with 10,000 starting credits
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            balance: 10000,
            total_wagered: 0,
            total_won: 0,
            level: 1,
            exp: 0,
            vip_tier: 'bronze',
          })

        if (profileError) {
          setError(
            'Account created but profile setup failed. Please contact support.'
          )
          setLoading(false)
          return
        }

        // Record the signup bonus transaction
        await supabase.from('transactions').insert({
          player_id: data.user.id,
          type: 'bonus',
          amount: 10000,
          balance_after: 10000,
          description: 'Welcome bonus - 10,000 free credits',
        })

        // Check if email confirmation is required
        if (data.session) {
          router.push('/')
          router.refresh()
        } else {
          setSuccess(true)
          setLoading(false)
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Success state
  if (success) {
    return (
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00FF88]/10"
        >
          <CheckCircle2 className="h-8 w-8 text-[#00FF88]" />
        </motion.div>
        <h2 className="mb-2 text-xl font-bold text-white">
          Account Created!
        </h2>
        <p className="mb-6 text-sm text-zinc-400">
          Check your email for verification, or continue to play.
        </p>
        <button
          onClick={() => {
            router.push('/')
            router.refresh()
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#c9a227] via-[#FFD700] to-[#e6c84a] px-6 py-2.5 font-bold text-black transition-all hover:shadow-[0_0_25px_rgba(255,215,0,0.3)]"
        >
          Continue to Casino
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-4 text-xs text-zinc-600">
          Didn&apos;t receive the email? Check your spam folder or{' '}
          <button
            onClick={() => setSuccess(false)}
            className="text-[#FFD700] transition-colors hover:text-[#e6c84a]"
          >
            try again
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Branding */}
      <div className="mb-6 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#c9a227] shadow-[0_0_30px_rgba(255,215,0,0.3)]"
        >
          <Crown className="h-7 w-7 text-black" />
        </motion.div>
        <h1 className="text-2xl font-black tracking-wider">
          <span className="bg-gradient-to-r from-[#FFD700] via-[#e6c84a] to-[#FFD700] bg-clip-text text-transparent">
            FORTUNA CASINO
          </span>
        </h1>
      </div>

      <h2 className="mb-4 text-center text-xl font-semibold text-white">
        Create Account
      </h2>

      {/* Bonus Banner */}
      <div className="mb-5 rounded-lg border border-[#FFD700]/20 bg-[#FFD700]/5 px-4 py-3 text-center text-sm text-[#FFD700]">
        Get <span className="font-bold">10,000 free credits</span> when you
        sign up!
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#EF4444]"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-400"
          >
            <User className="h-3.5 w-3.5" />
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            minLength={3}
            maxLength={20}
            className="w-full rounded-lg border border-[#333] bg-[#111118] px-4 py-2.5 text-white placeholder-gray-500 outline-none transition-colors focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700]/25"
          />
        </div>

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
              placeholder="Min. 8 characters"
              minLength={8}
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
          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      level <= passwordStrength.score
                        ? passwordStrength.color
                        : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
              <p
                className={`mt-1 text-xs ${
                  passwordStrength.score <= 1
                    ? 'text-[#EF4444]'
                    : passwordStrength.score === 2
                      ? 'text-orange-500'
                      : passwordStrength.score === 3
                        ? 'text-yellow-500'
                        : 'text-[#00FF88]'
                }`}
              >
                {passwordStrength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-400"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={`w-full rounded-lg border bg-[#111118] px-4 py-2.5 pr-10 text-white placeholder-gray-500 outline-none transition-colors focus:ring-1 ${
                confirmPassword && confirmPassword !== password
                  ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/25'
                  : 'border-[#333] focus:border-[#FFD700] focus:ring-[#FFD700]/25'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {confirmPassword && confirmPassword !== password && (
            <p className="mt-1 text-xs text-[#EF4444]">
              Passwords do not match
            </p>
          )}
        </div>

        {/* Terms */}
        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-[#111118] accent-[#FFD700] focus:ring-[#FFD700]/25"
          />
          <span>
            I confirm I am{' '}
            <span className="font-medium text-white">18+</span> and agree to
            the{' '}
            <span className="cursor-pointer text-[#FFD700] hover:text-[#e6c84a]">
              Terms of Service
            </span>{' '}
            and{' '}
            <span className="cursor-pointer text-[#FFD700] hover:text-[#e6c84a]">
              Privacy Policy
            </span>
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !agreeTerms}
          className="w-full rounded-lg bg-gradient-to-r from-[#c9a227] via-[#FFD700] to-[#e6c84a] px-4 py-2.5 font-bold uppercase tracking-wide text-black transition-all hover:shadow-[0_0_25px_rgba(255,215,0,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </span>
          ) : (
            'CREATE ACCOUNT'
          )}
        </button>
      </form>

      {/* Login link */}
      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-[#FFD700] transition-colors hover:text-[#e6c84a]"
        >
          Sign In
        </Link>
      </p>
    </div>
  )
}
