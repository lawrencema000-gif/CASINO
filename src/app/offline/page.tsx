'use client'

import { WifiOff, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-[var(--casino-surface)] border border-[var(--casino-border)] flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-[var(--casino-text-muted)]" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">You&apos;re Offline</h1>
        <p className="text-[var(--casino-text-muted)] mb-8">
          It looks like you&apos;ve lost your internet connection. Fortuna Casino requires an active connection to play.
        </p>
        <Button
          variant="primary"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    </div>
  )
}
