'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Gift, Sparkles } from 'lucide-react'
import { useGameState } from '@/hooks/useGameState'

interface BonusWheelProps {
  isOpen: boolean
  onClose: () => void
}

const DAY_BONUSES = [500, 1000, 1500, 2000, 2500, 3500, 5000]

interface BonusData {
  streak: number
  canCollect: boolean
  totalCollected: number
}

export default function BonusWheel({ isOpen, onClose }: BonusWheelProps) {
  const [bonusData, setBonusData] = useState<BonusData>({
    streak: 0,
    canCollect: false,
    totalCollected: 0,
  })
  const [collecting, setCollecting] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [collectedAmount, setCollectedAmount] = useState(0)
  const { fetchProfile } = useGameState()

  const loadBonusData = useCallback(async () => {
    try {
      const res = await fetch('/api/bonus', { method: 'GET' })
      if (res.ok) {
        const data = await res.json()
        setBonusData({
          streak: data.streak ?? 0,
          canCollect: data.can_collect ?? false,
          totalCollected: data.total_collected ?? 0,
        })
      }
    } catch {
      // Silently fail - bonus data will use defaults
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadBonusData()
    }
  }, [isOpen, loadBonusData])

  const handleCollect = async () => {
    if (!bonusData.canCollect || collecting) return
    setCollecting(true)

    try {
      const res = await fetch('/api/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'collect' }),
      })

      if (res.ok) {
        const result = await res.json()
        const amount = result.amount ?? DAY_BONUSES[bonusData.streak] ?? 500
        setCollectedAmount(amount)
        setShowCelebration(true)

        // Update profile balance
        await fetchProfile()

        // Update local bonus data
        setBonusData((prev) => ({
          streak: Math.min(prev.streak + 1, 7),
          canCollect: false,
          totalCollected: prev.totalCollected + amount,
        }))

        // Hide celebration after 3 seconds
        setTimeout(() => setShowCelebration(false), 3000)
      }
    } catch {
      // Silently fail
    } finally {
      setCollecting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#FFD700]/20 bg-[#1a1a25] shadow-2xl shadow-black/50"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="relative border-b border-[#FFD700]/10 bg-gradient-to-b from-[#FFD700]/10 to-transparent px-6 pb-4 pt-6 text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] to-[#c9a227] shadow-[0_0_30px_rgba(255,215,0,0.3)]"
              >
                <Gift className="h-7 w-7 text-black" />
              </motion.div>
              <h2 className="text-xl font-black tracking-wide text-white">
                Daily Login Bonus
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Login for 7 Days ({Math.min(bonusData.streak, 7)}/7)
              </p>
            </div>

            {/* Day Steps */}
            <div className="px-6 py-6">
              <div className="flex items-center justify-between">
                {DAY_BONUSES.map((amount, index) => {
                  const dayNum = index + 1
                  const isCompleted = index < bonusData.streak
                  const isCurrent =
                    index === bonusData.streak && bonusData.canCollect
                  const isFuture = index > bonusData.streak || (index === bonusData.streak && !bonusData.canCollect)

                  return (
                    <div
                      key={dayNum}
                      className="flex flex-col items-center gap-1.5"
                    >
                      {/* Circle */}
                      <div className="relative">
                        {isCurrent && (
                          <motion.div
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                            className="absolute inset-0 rounded-full bg-[#FFD700]/30"
                          />
                        )}
                        <div
                          className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                            isCompleted
                              ? 'border-[#FFD700] bg-[#FFD700] text-black'
                              : isCurrent
                                ? 'border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]'
                                : 'border-zinc-700 bg-zinc-800/50 text-zinc-500'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            dayNum
                          )}
                        </div>
                      </div>
                      {/* Amount label */}
                      <span
                        className={`text-[10px] font-semibold ${
                          isCompleted
                            ? 'text-[#FFD700]'
                            : isCurrent
                              ? 'text-[#FFD700]'
                              : 'text-zinc-600'
                        }`}
                      >
                        {amount.toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Connecting lines */}
              <div className="relative -mt-[52px] mx-[18px] mb-[26px]">
                <div className="flex">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-0.5 flex-1 ${
                        i < bonusData.streak ? 'bg-[#FFD700]' : 'bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Total collected */}
            <div className="mx-6 mb-4 rounded-lg bg-[#111118] px-4 py-3 text-center">
              <p className="text-xs text-zinc-500">Total Collected</p>
              <p className="text-lg font-bold text-[#FFD700]">
                {bonusData.totalCollected.toLocaleString()} credits
              </p>
            </div>

            {/* Action */}
            <div className="px-6 pb-6">
              {bonusData.canCollect ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCollect}
                  disabled={collecting}
                  className="w-full rounded-lg bg-[#00FF88] px-4 py-3 font-bold text-black shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,255,136,0.5)] disabled:opacity-50"
                >
                  {collecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      >
                        <Sparkles className="h-5 w-5" />
                      </motion.div>
                      Collecting...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Gift className="h-5 w-5" />
                      COLLECT BONUS
                    </span>
                  )}
                </motion.button>
              ) : (
                <div className="rounded-lg border border-zinc-800 bg-[#111118] px-4 py-3 text-center text-sm text-zinc-500">
                  Come back tomorrow!
                </div>
              )}
            </div>

            {/* Celebration overlay */}
            <AnimatePresence>
              {showCelebration && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="text-center"
                  >
                    {/* Sparkle particles */}
                    {Array.from({ length: 12 }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                        animate={{
                          opacity: 0,
                          scale: 1,
                          x: Math.cos((i * 30 * Math.PI) / 180) * 100,
                          y: Math.sin((i * 30 * Math.PI) / 180) * 100,
                        }}
                        transition={{ duration: 1, delay: 0.1 }}
                        className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-[#FFD700]"
                      />
                    ))}
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 2 }}
                    >
                      <Sparkles className="mx-auto mb-3 h-12 w-12 text-[#FFD700]" />
                    </motion.div>
                    <p className="text-2xl font-black text-white">
                      +{collectedAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-[#FFD700]">Credits Collected!</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
