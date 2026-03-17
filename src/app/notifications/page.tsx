'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Gift, Trophy, Shield, Megaphone, CheckCheck,
  Loader2, ArrowLeft,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

type NotificationType = 'bonus' | 'achievement' | 'system' | 'promo' | 'security'
type FilterTab = 'all' | 'unread' | 'bonus' | 'system' | 'security'

interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  created_at: string
  metadata?: Record<string, unknown>
}

const typeIcons: Record<NotificationType, React.ReactNode> = {
  bonus: <Gift className="w-5 h-5" />,
  achievement: <Trophy className="w-5 h-5" />,
  system: <Bell className="w-5 h-5" />,
  promo: <Megaphone className="w-5 h-5" />,
  security: <Shield className="w-5 h-5" />,
}

const typeColors: Record<NotificationType, string> = {
  bonus: 'text-[var(--casino-purple-light)] bg-[var(--casino-purple)]/10',
  achievement: 'text-[var(--casino-accent)] bg-[var(--casino-accent)]/10',
  system: 'text-[var(--casino-blue)] bg-[var(--casino-blue)]/10',
  promo: 'text-[var(--casino-green)] bg-[var(--casino-green)]/10',
  security: 'text-[var(--casino-red)] bg-[var(--casino-red)]/10',
}

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'bonus', label: 'Bonuses' },
  { key: 'system', label: 'System' },
  { key: 'security', label: 'Security' },
]

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirectTo=/notifications')
    }
  }, [user, authLoading, router])

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    try {
      const res = await fetch('/api/notifications?limit=50')
      const data = await res.json()
      if (res.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = async (notificationId: string) => {
    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      })
    } catch {
      // Revert on failure
      fetchNotifications()
    }
  }

  const markAllAsRead = async () => {
    setMarkingAll(true)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      fetchNotifications()
    } finally {
      setMarkingAll(false)
    }
  }

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'unread') return !n.read
    return n.type === activeFilter
  })

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--casino-accent)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-[var(--casino-text-muted)] hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Bell className="w-7 h-7 text-[var(--casino-accent)]" />
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--casino-red)] text-white">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              loading={markingAll}
              onClick={markAllAsRead}
              icon={<CheckCheck className="w-4 h-4" />}
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                activeFilter === tab.key
                  ? 'bg-[var(--casino-accent)] text-black'
                  : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)] hover:text-white border border-[var(--casino-border)]'
              )}
            >
              {tab.label}
              {tab.key === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--casino-red)] text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--casino-accent)]" />
          </div>
        ) : filtered.length === 0 ? (
          <Card hover={false}>
            <div className="text-center py-16">
              <Bell className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
              <p className="text-lg font-semibold text-[var(--casino-text-muted)] mb-1">
                No notifications yet
              </p>
              <p className="text-sm text-[var(--casino-text-muted)]/60">
                {activeFilter !== 'all'
                  ? 'Try a different filter to see more notifications.'
                  : "When something happens, you'll see it here."}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {filtered.map((notification, i) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                >
                  <div
                    onClick={() => {
                      if (!notification.read) markAsRead(notification.id)
                    }}
                    className={cn(
                      'relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer',
                      'bg-[var(--casino-card)] hover:bg-[var(--casino-card-hover)]',
                      notification.read
                        ? 'border-[var(--casino-border)]'
                        : 'border-l-[3px] border-l-[var(--casino-accent)] border-t-[var(--casino-border)] border-r-[var(--casino-border)] border-b-[var(--casino-border)]'
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                        typeColors[notification.type] || typeColors.system
                      )}
                    >
                      {typeIcons[notification.type] || typeIcons.system}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3
                          className={cn(
                            'text-sm font-semibold truncate',
                            notification.read ? 'text-[var(--casino-text-muted)]' : 'text-white'
                          )}
                        >
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-[var(--casino-accent)]" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--casino-text-muted)] line-clamp-2 mb-1">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-[var(--casino-text-muted)]/60">
                        {relativeTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
