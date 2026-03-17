'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  LifeBuoy, Plus, Clock, CheckCircle2, AlertCircle,
  MessageSquare, ArrowLeft, ChevronRight, Loader2, Filter,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Ticket {
  id: string
  ticket_number: string
  category: string
  priority: string
  status: string
  subject: string
  created_at: string
  updated_at: string
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Open', color: 'text-[var(--casino-blue)]', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  in_progress: { label: 'In Progress', color: 'text-[var(--casino-accent)]', icon: <Clock className="w-3.5 h-3.5" /> },
  waiting_user: { label: 'Awaiting Reply', color: 'text-[var(--casino-purple-light)]', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  escalated: { label: 'Escalated', color: 'text-[var(--casino-red)]', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  resolved: { label: 'Resolved', color: 'text-[var(--casino-green)]', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  closed: { label: 'Closed', color: 'text-[var(--casino-text-muted)]', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  urgent: 'bg-red-500/20 text-red-400',
}

const categoryLabels: Record<string, string> = {
  account: 'Account', payment: 'Payment', missing_credits: 'Missing Credits',
  game_issue: 'Game Issue', bug_report: 'Bug Report', abuse_report: 'Abuse Report',
  self_exclusion: 'Self-Exclusion', refund_request: 'Refund', ban_appeal: 'Ban Appeal', other: 'Other',
}

export default function SupportPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const fetchTickets = useCallback(async () => {
    if (!user) return
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (filterStatus !== 'all') params.set('status', filterStatus)
      const res = await fetch(`/api/support/tickets?${params}`)
      const data = await res.json()
      if (res.ok) setTickets(data.tickets)
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [user, filterStatus])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    fetchTickets()
  }, [user, authLoading, router, fetchTickets])

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--casino-accent)] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="text-[var(--casino-text-muted)] hover:text-white transition cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <LifeBuoy className="w-7 h-7 text-[var(--casino-accent)]" />
            <h1 className="text-2xl font-bold text-white">Support</h1>
          </div>
          <Link href="/support/tickets/new">
            <Button variant="primary" size="sm" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Ticket
            </Button>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mb-6">
          <Link
            href="/support/knowledge-base"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--casino-border)] bg-[var(--casino-card)] text-sm text-[var(--casino-text-muted)] hover:text-white hover:border-[var(--casino-accent)]/50 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            Browse Knowledge Base
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-[var(--casino-text-muted)] flex-shrink-0" />
          {['all', 'open', 'in_progress', 'waiting_user', 'resolved', 'closed'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer',
                filterStatus === s
                  ? 'bg-[var(--casino-accent)]/20 text-[var(--casino-accent)] border border-[var(--casino-accent)]/30'
                  : 'bg-[var(--casino-surface)] text-[var(--casino-text-muted)] border border-[var(--casino-border)] hover:text-white'
              )}
            >
              {s === 'all' ? 'All' : statusConfig[s]?.label || s}
            </button>
          ))}
        </div>

        {/* Ticket List */}
        {tickets.length === 0 ? (
          <Card hover={false} className="text-center py-12">
            <LifeBuoy className="w-12 h-12 text-[var(--casino-text-muted)]/40 mx-auto mb-4" />
            <p className="text-[var(--casino-text-muted)] mb-2">No tickets found</p>
            <p className="text-sm text-[var(--casino-text-muted)]/60 mb-6">Need help? Create a support ticket and we&apos;ll get back to you.</p>
            <Link href="/support/tickets/new">
              <Button variant="primary" size="sm">Create Ticket</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket, i) => {
              const sc = statusConfig[ticket.status] || statusConfig.open
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/support/tickets/${ticket.id}`}>
                    <Card hover className="flex items-center justify-between gap-4 cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-[var(--casino-text-muted)] font-mono">{ticket.ticket_number}</span>
                          <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold', priorityColors[ticket.priority])}>
                            {ticket.priority.toUpperCase()}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[var(--casino-surface)] text-[10px] text-[var(--casino-text-muted)]">
                            {categoryLabels[ticket.category] || ticket.category}
                          </span>
                        </div>
                        <p className="text-white font-medium truncate">{ticket.subject}</p>
                        <p className="text-xs text-[var(--casino-text-muted)] mt-1">
                          Created {formatDate(ticket.created_at)}
                          {ticket.updated_at !== ticket.created_at && ` · Updated ${formatDate(ticket.updated_at)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn('flex items-center gap-1 text-xs font-medium', sc.color)}>
                          {sc.icon}
                          {sc.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[var(--casino-text-muted)]" />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
