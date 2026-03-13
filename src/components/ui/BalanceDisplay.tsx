'use client'

import { useEffect, useRef, useState } from 'react'
import { Coins, Plus } from 'lucide-react'
import { cn } from './cn'

interface BalanceDisplayProps {
  balance: number
  showAddFunds?: boolean
  onAddFunds?: () => void
  className?: string
  size?: 'sm' | 'md'
}

export default function BalanceDisplay({
  balance,
  showAddFunds = false,
  onAddFunds,
  className,
  size = 'md',
}: BalanceDisplayProps) {
  const [displayBalance, setDisplayBalance] = useState(balance)
  const [isAnimating, setIsAnimating] = useState(false)
  const prevBalance = useRef(balance)

  useEffect(() => {
    if (balance === prevBalance.current) return

    setIsAnimating(true)
    const diff = balance - prevBalance.current
    const steps = 20
    const stepValue = diff / steps
    let current = prevBalance.current
    let step = 0

    const interval = setInterval(() => {
      step++
      current += stepValue
      if (step >= steps) {
        current = balance
        clearInterval(interval)
        setTimeout(() => setIsAnimating(false), 300)
      }
      setDisplayBalance(current)
    }, 30)

    prevBalance.current = balance

    return () => clearInterval(interval)
  }, [balance])

  const formatted = displayBalance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-xl bg-[var(--casino-surface)] border border-[var(--casino-border)]',
        size === 'sm' ? 'px-2.5 py-1.5' : 'px-4 py-2',
        isAnimating && 'win-pulse',
        className
      )}
    >
      <Coins
        className={cn(
          'text-[var(--casino-accent)]',
          size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
          isAnimating && 'coin-bounce'
        )}
      />
      <span
        className={cn(
          'font-bold text-[var(--casino-accent)] tabular-nums',
          size === 'sm' ? 'text-sm' : 'text-base'
        )}
      >
        ${formatted}
      </span>
      {showAddFunds && (
        <button
          onClick={onAddFunds}
          className="ml-1 p-1 rounded-lg bg-[var(--casino-accent)]/20 text-[var(--casino-accent)] hover:bg-[var(--casino-accent)]/30 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
