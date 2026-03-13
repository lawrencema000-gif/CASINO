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
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)
  const prevBalance = useRef(balance)

  useEffect(() => {
    if (balance === prevBalance.current) return

    const isUp = balance > prevBalance.current
    setDirection(isUp ? 'up' : 'down')
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
        setTimeout(() => {
          setIsAnimating(false)
          setDirection(null)
        }, 400)
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
        'inline-flex items-center gap-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] transition-all duration-300',
        size === 'sm' ? 'px-2.5 py-1.5' : 'px-4 py-2',
        isAnimating && direction === 'up' && 'border-[var(--neon-green)]/40 shadow-[0_0_15px_rgba(0,255,136,0.15)]',
        isAnimating && direction === 'down' && 'border-[var(--casino-red)]/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]',
        className
      )}
    >
      <Coins
        className={cn(
          'text-[var(--gold)]',
          size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
          isAnimating && 'coin-bounce'
        )}
      />
      <span
        className={cn(
          'font-bold tabular-nums transition-colors duration-300',
          size === 'sm' ? 'text-sm' : 'text-base',
          !isAnimating && 'text-[var(--gold)]',
          isAnimating && direction === 'up' && 'text-[var(--neon-green)]',
          isAnimating && direction === 'down' && 'text-[var(--casino-red)]'
        )}
      >
        ${formatted}
      </span>
      {showAddFunds && (
        <button
          onClick={onAddFunds}
          className="ml-1 p-1 rounded-lg bg-[var(--gold)]/20 text-[var(--gold)] hover:bg-[var(--gold)]/30 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
