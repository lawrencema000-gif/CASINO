'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag,
  ArrowLeft,
  Coins,
  Sparkles,
  Crown,
  Star,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Gift,
  Shield,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import type { CreditPackage } from '@/lib/stripe/packages'

interface Purchase {
  id: string
  package_id: string
  credits: number
  bonus_credits: number
  amount_paid: number
  status: string
  created_at: string
}

const packageIcons: Record<string, React.ReactNode> = {
  starter: <Coins className="w-8 h-8 text-[var(--casino-accent)]" />,
  popular: <Star className="w-8 h-8 text-[var(--casino-accent)]" />,
  premium: <Sparkles className="w-8 h-8 text-[var(--casino-purple)]" />,
  whale: <Crown className="w-8 h-8 text-[var(--casino-accent)]" />,
  vip: <Zap className="w-8 h-8 text-[var(--casino-accent)]" />,
}

const faqItems = [
  {
    question: 'What are credits?',
    answer:
      'Credits are the in-game currency used to play all casino games. You can purchase credits with real money and use them to place bets, enter tournaments, and more.',
  },
  {
    question: 'Are credits refundable?',
    answer:
      'All credit purchases are final and non-refundable. Please make sure you want to purchase before completing the transaction. If you experience any issues with your purchase, contact our support team.',
  },
  {
    question: 'How fast do I get my credits?',
    answer:
      'Credits are delivered instantly after your payment is confirmed. In rare cases, it may take up to a few minutes for the credits to appear in your account. If your credits have not arrived after 5 minutes, please contact support.',
  },
]

function StoreContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { balance, refreshBalance } = useBalance(user?.id)

  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loadingPackages, setLoadingPackages] = useState(true)
  const [loadingPurchases, setLoadingPurchases] = useState(true)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Detect success / canceled from URL
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setBanner({ type: 'success', message: 'Payment successful! Your credits have been added to your account.' })
      refreshBalance()
      // Clean URL
      window.history.replaceState(null, '', '/store')
    } else if (searchParams.get('canceled') === 'true') {
      setBanner({ type: 'error', message: 'Payment was canceled. No charges were made.' })
      window.history.replaceState(null, '', '/store')
    }
  }, [searchParams, refreshBalance])

  // Auto-dismiss banner
  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 8000)
    return () => clearTimeout(t)
  }, [banner])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Fetch packages
  useEffect(() => {
    fetch('/api/store/packages')
      .then((r) => r.json())
      .then((d) => setPackages(d.packages ?? []))
      .catch(console.error)
      .finally(() => setLoadingPackages(false))
  }, [])

  // Fetch purchases
  const fetchPurchases = useCallback(() => {
    if (!user) return
    setLoadingPurchases(true)
    fetch('/api/store/purchases')
      .then((r) => r.json())
      .then((d) => setPurchases(d.purchases ?? []))
      .catch(console.error)
      .finally(() => setLoadingPurchases(false))
  }, [user])

  useEffect(() => {
    fetchPurchases()
  }, [fetchPurchases])

  // Buy handler
  const handleBuy = async (packageId: string) => {
    if (buyingId) return
    setBuyingId(packageId)
    try {
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setBanner({ type: 'error', message: data.error || 'Failed to start checkout' })
        setBuyingId(null)
      }
    } catch {
      setBanner({ type: 'error', message: 'Something went wrong. Please try again.' })
      setBuyingId(null)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--casino-bg)]">
        <div className="w-8 h-8 border-2 border-[var(--casino-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[var(--casino-bg)] relative z-10">
      {/* Banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl flex items-center gap-3 shadow-2xl border ${
              banner.type === 'success'
                ? 'bg-green-900/80 border-green-500/40 text-green-200'
                : 'bg-red-900/80 border-red-500/40 text-red-200'
            }`}
          >
            {banner.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{banner.message}</span>
            <button onClick={() => setBanner(null)} className="ml-2 opacity-60 hover:opacity-100">
              <XCircle className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-[var(--casino-card)] border border-[var(--casino-border)] hover:border-[var(--casino-accent)]/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--casino-text-muted)]" />
          </button>
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-[var(--casino-accent)]" />
            <h1 className="text-2xl md:text-3xl font-bold text-gold-gradient">Credit Store</h1>
          </div>
        </motion.div>

        {/* Current Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c9a227]/20 to-[#FFD700]/10 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-[var(--casino-accent)]" />
                </div>
                <div>
                  <p className="text-sm text-[var(--casino-text-muted)]">Current Balance</p>
                  <p className="text-2xl font-bold neon-gold">{balance.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--casino-text-muted)]">
                <Shield className="w-4 h-4" />
                <span>Secure payments powered by Stripe</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Packages Grid */}
        {loadingPackages ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-[var(--casino-card)] border border-[var(--casino-border)] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {packages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.08 }}
              >
                <Card
                  glow={pkg.popular ? 'gold' : 'none'}
                  className={`relative flex flex-col ${
                    pkg.popular ? 'border-[var(--casino-accent)]/40 ring-1 ring-[var(--casino-accent)]/20' : ''
                  }`}
                >
                  {/* Popular badge */}
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#a07d1a] via-[#c9a227] to-[#e6c84a] text-black text-xs font-bold uppercase tracking-wider">
                      Best Value
                    </div>
                  )}

                  <div className="flex flex-col items-center text-center pt-2">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c9a227]/15 to-transparent flex items-center justify-center mb-4">
                      {packageIcons[pkg.id] || <Coins className="w-8 h-8 text-[var(--casino-accent)]" />}
                    </div>

                    {/* Name */}
                    <h3 className="text-lg font-bold text-white mb-1">{pkg.name}</h3>

                    {/* Credits */}
                    <p className="text-3xl font-extrabold neon-gold mb-1">
                      {pkg.credits.toLocaleString()}
                    </p>
                    <p className="text-xs text-[var(--casino-text-muted)] mb-2">credits</p>

                    {/* Bonus badge */}
                    {pkg.bonusCredits > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 mb-3">
                        <Gift className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs font-semibold text-green-400">
                          +{pkg.bonusCredits.toLocaleString()} bonus
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    <p className="text-xs text-[var(--casino-text-muted)] mb-4">{pkg.description}</p>

                    {/* Price & Buy */}
                    <div className="w-full mt-auto">
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full"
                        loading={buyingId === pkg.id}
                        disabled={!!buyingId}
                        onClick={() => handleBuy(pkg.id)}
                      >
                        {buyingId === pkg.id ? 'Redirecting...' : `Buy for ${pkg.priceDisplay}`}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Purchase History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--casino-text-muted)]" />
            Purchase History
          </h2>
          <Card hover={false}>
            {loadingPurchases ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[var(--casino-accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="w-10 h-10 text-[var(--casino-text-muted)] mx-auto mb-3 opacity-40" />
                <p className="text-[var(--casino-text-muted)] text-sm">No purchases yet</p>
                <p className="text-[var(--casino-text-muted)] text-xs mt-1">
                  Your purchase history will appear here
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--casino-text-muted)] border-b border-[var(--casino-border)]">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Package</th>
                      <th className="pb-3 font-medium text-right">Credits</th>
                      <th className="pb-3 font-medium text-right">Bonus</th>
                      <th className="pb-3 font-medium text-right">Amount</th>
                      <th className="pb-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-[var(--casino-border)]/50 last:border-0"
                      >
                        <td className="py-3 text-[var(--casino-text-muted)]">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-white capitalize">{p.package_id}</td>
                        <td className="py-3 text-right text-[var(--casino-accent)] font-medium">
                          {p.credits.toLocaleString()}
                        </td>
                        <td className="py-3 text-right text-green-400 font-medium">
                          {p.bonus_credits > 0 ? `+${p.bonus_credits.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 text-right text-white">
                          ${(p.amount_paid / 100).toFixed(2)}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.status === 'completed'
                                ? 'bg-green-500/10 text-green-400'
                                : p.status === 'pending'
                                  ? 'bg-yellow-500/10 text-yellow-400'
                                  : p.status === 'refunded'
                                    ? 'bg-blue-500/10 text-blue-400'
                                    : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {p.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-xl font-bold text-white mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <Card key={index} hover={false} className="cursor-pointer" onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white">{item.question}</h3>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-[var(--casino-text-muted)] shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[var(--casino-text-muted)] shrink-0" />
                  )}
                </div>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-[var(--casino-text-muted)] mt-3 leading-relaxed">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function StorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center"><div className="text-[var(--casino-text-muted)]">Loading store...</div></div>}>
      <StoreContent />
    </Suspense>
  )
}
