'use client'

import { Zap, LogIn } from 'lucide-react'
import Link from 'next/link'

export default function DemoBanner() {
  return (
    <div className="w-full rounded-xl border border-[var(--neon-green)]/30 bg-[var(--neon-green)]/5 px-4 py-3 mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-[var(--neon-green)] shrink-0" />
        <div>
          <span className="text-sm font-bold text-[var(--neon-green)]">DEMO MODE</span>
          <span className="text-xs text-[var(--casino-text-muted)] ml-2 hidden sm:inline">
            Playing with virtual credits — results are not saved
          </span>
        </div>
      </div>
      <Link href="/register">
        <button className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-black cursor-pointer hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all">
          <LogIn className="w-3 h-3" />
          Sign Up to Save
        </button>
      </Link>
    </div>
  )
}
