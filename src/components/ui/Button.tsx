'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from './cn'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-[#a07d1a] via-[#c9a227] to-[#e6c84a] text-black font-semibold hover:shadow-[0_0_25px_rgba(201,162,39,0.4)] active:scale-[0.97]',
  secondary:
    'bg-gradient-to-r from-[#6c2bd9] to-[#9b59f0] text-white font-semibold hover:shadow-[0_0_25px_rgba(108,43,217,0.4)] active:scale-[0.97]',
  danger:
    'bg-gradient-to-r from-[#cc2d4a] to-[#ff3b5c] text-white font-semibold hover:shadow-[0_0_25px_rgba(255,59,92,0.4)] active:scale-[0.97]',
  success:
    'bg-gradient-to-r from-[#00cc6a] to-[#00ff88] text-black font-semibold hover:shadow-[0_0_25px_rgba(0,255,136,0.4)] active:scale-[0.97]',
  ghost:
    'bg-transparent text-[var(--casino-text)] border border-[var(--casino-border)] hover:bg-[var(--casino-card)] hover:border-[var(--casino-accent)] active:scale-[0.97]',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-8 py-3.5 text-base rounded-xl gap-2.5',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-200 cursor-pointer select-none',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
