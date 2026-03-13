'use client'

import { useState, useCallback } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from './cn'

interface BetControlsProps {
  balance: number
  betAmount: number
  onBetChange: (amount: number) => void
  onPlay: () => void
  disabled?: boolean
  minBet?: number
  maxBet?: number
  multiplier?: number
  playLabel?: string
  className?: string
}

export default function BetControls({
  balance,
  betAmount,
  onBetChange,
  onPlay,
  disabled = false,
  minBet = 100,
  maxBet,
  multiplier,
  playLabel = 'PLAY',
  className,
}: BetControlsProps) {
  const effectiveMax = maxBet ?? balance
  const [inputFocused, setInputFocused] = useState(false)

  const clamp = useCallback(
    (value: number) => Math.max(minBet, Math.min(effectiveMax, Math.round(value * 100) / 100)),
    [minBet, effectiveMax]
  )

  const handleIncrement = () => onBetChange(clamp(betAmount + minBet))
  const handleDecrement = () => onBetChange(clamp(betAmount - minBet))
  const handleMin = () => onBetChange(minBet)
  const handleHalf = () => onBetChange(clamp(betAmount / 2))
  const handleDouble = () => onBetChange(clamp(betAmount * 2))
  const handleMax = () => onBetChange(clamp(effectiveMax))

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    const parsed = parseFloat(raw)
    if (!isNaN(parsed)) {
      onBetChange(clamp(parsed))
    }
  }

  const potentialPayout = multiplier ? betAmount * multiplier : null

  return (
    <div className={cn('space-y-4', className)}>
      {/* Bet Amount Input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          Bet Amount
        </label>
        <div
          className={cn(
            'flex items-center rounded-xl border transition-all duration-200',
            inputFocused
              ? 'border-[var(--gold)]/50 shadow-[0_0_15px_rgba(255,215,0,0.1)]'
              : 'border-[var(--border-color)]',
            'bg-[var(--bg-secondary)]'
          )}
        >
          <button
            onClick={handleDecrement}
            disabled={disabled || betAmount <= minBet}
            className="px-3 py-3 text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-l-xl"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="flex-1 flex items-center justify-center px-2">
            <span className="text-[var(--gold)] font-bold mr-1">$</span>
            <input
              type="text"
              value={betAmount.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
              onChange={handleInputChange}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              disabled={disabled}
              className="w-full bg-transparent text-center text-lg font-bold text-white outline-none tabular-nums disabled:opacity-50"
            />
          </div>

          <button
            onClick={handleIncrement}
            disabled={disabled || betAmount >= effectiveMax}
            className="px-3 py-3 text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-r-xl"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Bet Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Min', action: handleMin },
          { label: '1/2', action: handleHalf },
          { label: '2x', action: handleDouble },
          { label: 'Max', action: handleMax },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            disabled={disabled}
            className="py-2 text-xs font-semibold rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--gold)]/30 hover:bg-[var(--bg-card-hover)] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Potential Payout */}
      {potentialPayout !== null && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[var(--neon-green)]/5 border border-[var(--neon-green)]/15">
          <span className="text-xs text-[var(--text-secondary)]">Potential Payout</span>
          <span className="text-sm font-bold text-[var(--neon-green)] tabular-nums">
            ${potentialPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Play Button */}
      <button
        onClick={onPlay}
        disabled={disabled || betAmount < minBet || betAmount > balance}
        className={cn(
          'w-full py-4 text-lg font-bold rounded-xl transition-all duration-200 cursor-pointer select-none',
          'bg-gradient-to-r from-[#00cc6a] to-[#00FF88] text-black',
          'hover:shadow-[0_0_30px_rgba(0,255,136,0.3)]',
          'active:scale-[0.97]',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
          !disabled && 'glow-green'
        )}
      >
        {playLabel}
      </button>

      {/* Balance reminder */}
      <div className="text-center">
        <span className="text-xs text-[var(--text-secondary)]">
          Balance: <span className="text-[var(--gold)] font-medium">${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </span>
      </div>
    </div>
  )
}
