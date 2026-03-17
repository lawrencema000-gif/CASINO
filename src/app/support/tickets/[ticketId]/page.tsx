'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Send, Loader2, Clock, CheckCircle2,
  AlertCircle, MessageSquare, User, Shield
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, useParams } from 'next/navigation'

interface Message {
  id: string
  sender_id: string
  message: string
  is_internal: boolean
  created_at: string
}

interface Ticket {
  id: string
  ticket_number: string
  user_id: string
  category: string
  priority: string
  status: string
  subject: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  first_response_at: string | null
  sla_deadline: string | null
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Open', color: 'text-[var(--casino-blue)]', icon: <AlertCircle className="w-4 h-4" /> },
  in_progress: { label: 'In Progress', color: 'text-[var(--casino-accent)]', icon: <Clock className="w-4 h-4" /> },
  waiting_user: { label: 'Awaiting Your Reply', color: 'text-[var(--casino-purple-light)]', icon: <MessageSquare className="w-4 h-4" /> },
  escalated: { label: 'Escalated', color: 'text-[var(--casino-red)]', icon: <AlertCircle className="w-4 h-4" /> },
  resolved: { label: 'Resolved', color: 'text-[var(--casino-green)]', icon: <CheckCircle2 className="w-4 h-4" /> },
  closed: { label: 'Closed', color: 'text-[var(--casino-text-muted)]', icon: <CheckCircle2 className="w-4 h-4" /> },
}

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.ticketId as string
  const { user } = useAuth()

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchTicket = useCallback(async () => {
    if (!user || !ticketId) return
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`)
      const data = await res.json()
      if (res.ok) {
        setTicket(data.ticket)
        setMessages(data.messages)
      } else {
        router.push('/support')
      }
    } catch {
      router.push('/support')
    } finally {
      setLoading(false)
    }
  }, [user, ticketId, router])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      })
      if (res.ok) {
        setReply('')
        await fetchTicket()
      }
    } catch (err) {
      console.error('Failed to send reply:', err)
    } finally {
      setSending(false)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--casino-accent)] animate-spin" />
      </div>
    )
  }

  if (!ticket) return null

  const sc = statusConfig[ticket.status] || statusConfig.open
  const isClosed = ['resolved', 'closed'].includes(ticket.status)

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/support')} className="text-[var(--casino-text-muted)] hover:text-white transition cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-[var(--casino-text-muted)] font-mono">{ticket.ticket_number}</span>
              <span className={cn('flex items-center gap-1 text-xs font-medium', sc.color)}>
                {sc.icon}
                {sc.label}
              </span>
            </div>
            <h1 className="text-lg font-bold text-white truncate">{ticket.subject}</h1>
          </div>
        </div>

        {/* Ticket Info */}
        <Card hover={false} className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-[var(--casino-text-muted)] mb-0.5">Category</p>
              <p className="text-white font-medium capitalize">{ticket.category.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-[var(--casino-text-muted)] mb-0.5">Priority</p>
              <p className="text-white font-medium capitalize">{ticket.priority}</p>
            </div>
            <div>
              <p className="text-[var(--casino-text-muted)] mb-0.5">Created</p>
              <p className="text-white font-medium">{formatDate(ticket.created_at)}</p>
            </div>
            <div>
              <p className="text-[var(--casino-text-muted)] mb-0.5">
                {ticket.resolved_at ? 'Resolved' : 'Last Updated'}
              </p>
              <p className="text-white font-medium">
                {formatDate(ticket.resolved_at || ticket.updated_at)}
              </p>
            </div>
          </div>
        </Card>

        {/* Messages */}
        <div className="space-y-4 mb-6">
          {messages.map((msg) => {
            const isUser = msg.sender_id === user?.id
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
              >
                <div className={cn(
                  'max-w-[85%] rounded-xl px-4 py-3',
                  isUser
                    ? 'bg-[var(--casino-accent)]/15 border border-[var(--casino-accent)]/20'
                    : 'bg-[var(--casino-surface)] border border-[var(--casino-border)]'
                )}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {isUser ? (
                      <User className="w-3.5 h-3.5 text-[var(--casino-accent)]" />
                    ) : (
                      <Shield className="w-3.5 h-3.5 text-[var(--casino-green)]" />
                    )}
                    <span className={cn('text-xs font-medium', isUser ? 'text-[var(--casino-accent)]' : 'text-[var(--casino-green)]')}>
                      {isUser ? 'You' : 'Support Team'}
                    </span>
                    <span className="text-[10px] text-[var(--casino-text-muted)]">
                      {formatDate(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-white/90 whitespace-pre-wrap break-words">{msg.message}</p>
                </div>
              </motion.div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Form */}
        {!isClosed ? (
          <form onSubmit={handleSendReply}>
            <Card hover={false}>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply..."
                maxLength={5000}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--casino-bg)] border border-[var(--casino-border)] text-white placeholder-[var(--casino-text-muted)]/50 focus:border-[var(--casino-accent)] focus:outline-none text-sm resize-none mb-3"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--casino-text-muted)]">{reply.length}/5000</p>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!reply.trim() || sending}
                  className="flex items-center gap-2"
                >
                  {sending ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" /> Send Reply</>
                  )}
                </Button>
              </div>
            </Card>
          </form>
        ) : (
          <Card hover={false} className="text-center py-6">
            <CheckCircle2 className="w-8 h-8 text-[var(--casino-green)] mx-auto mb-2" />
            <p className="text-sm text-[var(--casino-text-muted)]">This ticket has been {ticket.status}.</p>
            <p className="text-xs text-[var(--casino-text-muted)]/60 mt-1">Need more help? Create a new ticket.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
