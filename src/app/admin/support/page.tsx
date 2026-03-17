'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Clock, AlertTriangle, ChevronDown, ChevronUp,
  Loader2, ArrowLeft, Shield, Send, StickyNote, UserCheck,
  ArrowUpCircle, CheckCircle2, XCircle, Filter
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface Ticket {
  id: string
  ticket_number: string
  user_id: string
  assigned_to: string | null
  category: string
  priority: string
  status: string
  subject: string
  created_at: string
  updated_at: string
  sla_deadline: string | null
  sla_breached: boolean
  first_response_at: string | null
}

interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  is_internal: boolean
  created_at: string
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  urgent: 'bg-red-500/20 text-red-400',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  waiting_user: 'bg-purple-500/20 text-purple-400',
  escalated: 'bg-red-500/20 text-red-400',
  resolved: 'bg-green-500/20 text-green-400',
  closed: 'bg-gray-500/20 text-gray-400',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function AdminSupportPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('open')
  const [slaBreachedCount, setSlaBreachedCount] = useState(0)
  const [total, setTotal] = useState(0)

  // Expanded ticket
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (authLoading || !user) return
    fetch('/api/admin/stats').then(res => {
      if (res.ok) setIsAdmin(true)
    }).catch(() => {})
  }, [authLoading, user])

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/support?status=${statusFilter}&limit=50`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTickets(data.tickets || [])
      setTotal(data.total || 0)
      setSlaBreachedCount(data.sla_breached_count || 0)
    } catch {
      console.error('Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (!isAdmin) return
    fetchTickets()
  }, [isAdmin, fetchTickets])

  const fetchMessages = async (ticketId: string) => {
    setMessagesLoading(true)
    try {
      // Use supabase client directly for messages since we have RLS
      const res = await fetch(`/api/support/messages?ticketId=${ticketId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch {
      // Messages may not have a dedicated endpoint yet, that's ok
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }

  const toggleExpand = (ticketId: string) => {
    if (expandedId === ticketId) {
      setExpandedId(null)
      return
    }
    setExpandedId(ticketId)
    setReplyText('')
    setIsInternal(false)
    fetchMessages(ticketId)
  }

  const handleAction = async (ticketId: string, action: string, extra?: Record<string, string>) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, action, ...extra }),
      })
      if (res.ok) {
        fetchTickets()
        if (action === 'reply' || action === 'internal_note') {
          setReplyText('')
          fetchMessages(ticketId)
        }
      }
    } catch {
      console.error('Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">You need staff access to view this page.</p>
          <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[var(--gold)]" />
                Support Queue
              </h1>
              <p className="text-sm text-gray-400">{total} tickets</p>
            </div>
          </div>
          {slaBreachedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {slaBreachedCount} SLA breached
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500" />
          {['open', 'in_progress', 'waiting_user', 'escalated', 'resolved', 'closed', 'all'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-[var(--gold)] text-gray-900'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Tickets */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[var(--gold)] animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No tickets found</div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {tickets.map(ticket => (
                <div key={ticket.id}>
                  <div
                    className="px-5 py-4 hover:bg-gray-800/30 cursor-pointer transition-colors flex items-center gap-4"
                    onClick={() => toggleExpand(ticket.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500 font-mono">#{ticket.ticket_number}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[ticket.status] || 'bg-gray-500/20 text-gray-400'}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_COLORS[ticket.priority] || ''}`}>
                          {ticket.priority}
                        </span>
                        {ticket.sla_breached && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">SLA BREACHED</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="capitalize">{ticket.category}</span>
                        <span>{timeAgo(ticket.created_at)}</span>
                        {ticket.assigned_to && <span className="text-blue-400">Assigned</span>}
                      </div>
                    </div>
                    {expandedId === ticket.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>

                  {/* Expanded Detail */}
                  <AnimatePresence>
                    {expandedId === ticket.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-800 bg-gray-900/50 overflow-hidden"
                      >
                        <div className="p-5 space-y-4">
                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            {!ticket.assigned_to && (
                              <button
                                onClick={() => handleAction(ticket.id, 'assign')}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Assign to me
                              </button>
                            )}
                            <button
                              onClick={() => handleAction(ticket.id, 'escalate')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <ArrowUpCircle className="w-3.5 h-3.5" /> Escalate
                            </button>
                            <button
                              onClick={() => handleAction(ticket.id, 'resolve')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                            </button>
                            <button
                              onClick={() => handleAction(ticket.id, 'close')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Close
                            </button>
                            {/* Priority buttons */}
                            {['low', 'medium', 'high', 'urgent'].map(p => (
                              <button
                                key={p}
                                onClick={() => handleAction(ticket.id, 'set_priority', { priority: p })}
                                disabled={actionLoading || ticket.priority === p}
                                className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                                  ticket.priority === p ? 'bg-[var(--gold)]/20 text-[var(--gold)]' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>

                          {/* Messages */}
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {messagesLoading ? (
                              <div className="flex justify-center py-4">
                                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                              </div>
                            ) : messages.length === 0 ? (
                              <p className="text-sm text-gray-500">No messages yet</p>
                            ) : (
                              messages.map(msg => (
                                <div
                                  key={msg.id}
                                  className={`p-3 rounded-lg text-sm ${
                                    msg.is_internal
                                      ? 'bg-yellow-500/10 border border-yellow-500/20'
                                      : 'bg-gray-800/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    {msg.is_internal && <StickyNote className="w-3 h-3 text-yellow-400" />}
                                    <span className="text-xs text-gray-500">{timeAgo(msg.created_at)}</span>
                                    {msg.is_internal && <span className="text-xs text-yellow-400">Internal note</span>}
                                  </div>
                                  <p className="text-gray-300">{msg.message}</p>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Reply form */}
                          <div className="space-y-2">
                            <textarea
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              placeholder={isInternal ? 'Write an internal note...' : 'Type your reply...'}
                              rows={3}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50 resize-none"
                            />
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isInternal}
                                  onChange={e => setIsInternal(e.target.checked)}
                                  className="rounded border-gray-600 bg-gray-800 accent-yellow-500"
                                />
                                <StickyNote className="w-3 h-3" /> Internal note
                              </label>
                              <button
                                onClick={() => {
                                  if (!replyText.trim()) return
                                  handleAction(ticket.id, isInternal ? 'internal_note' : 'reply', { message: replyText })
                                }}
                                disabled={actionLoading || !replyText.trim()}
                                className="px-4 py-1.5 bg-[var(--gold)] hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <Send className="w-3 h-3" /> Send
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
