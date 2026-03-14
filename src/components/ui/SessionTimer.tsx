'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

function getSessionStart(): number {
  if (typeof window === 'undefined') return Date.now()
  const stored = sessionStorage.getItem('session-start')
  if (stored) return parseInt(stored, 10)
  const now = Date.now()
  sessionStorage.setItem('session-start', now.toString())
  return now
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  return `${minutes}m`
}

export default function SessionTimer() {
  const [duration, setDuration] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const sessionStart = getSessionStart()

    const update = () => {
      setDuration(formatDuration(Date.now() - sessionStart))
    }

    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/70 text-xs font-mono select-none pointer-events-none">
      <Clock className="w-3 h-3" />
      <span>{duration || '0m'}</span>
    </div>
  )
}
