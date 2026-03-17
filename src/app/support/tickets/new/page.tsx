'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Loader2, CheckCircle2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { value: 'missing_credits', label: 'Missing Credits', desc: 'Credits not received after a game or purchase' },
  { value: 'game_issue', label: 'Game Issue', desc: 'A game didn\'t work correctly or froze' },
  { value: 'account', label: 'Account', desc: 'Login issues, profile changes, or security' },
  { value: 'payment', label: 'Payment', desc: 'Purchase problems or billing questions' },
  { value: 'refund_request', label: 'Refund Request', desc: 'Request a refund for a purchase' },
  { value: 'bug_report', label: 'Bug Report', desc: 'Report a bug or technical issue' },
  { value: 'abuse_report', label: 'Abuse Report', desc: 'Report a player or suspicious activity' },
  { value: 'self_exclusion', label: 'Self-Exclusion', desc: 'Request to self-exclude or set limits' },
  { value: 'ban_appeal', label: 'Ban Appeal', desc: 'Appeal an account suspension or ban' },
  { value: 'other', label: 'Other', desc: 'Something not listed above' },
]

export default function NewTicketPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ ticket_number: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !category || !subject.trim() || !message.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject: subject.trim(), message: message.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create ticket')
        return
      }

      setSuccess({ ticket_number: data.ticket.ticket_number })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--casino-bg)] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full">
          <Card hover={false} className="text-center py-10">
            <CheckCircle2 className="w-16 h-16 text-[var(--casino-green)] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Ticket Created</h2>
            <p className="text-[var(--casino-text-muted)] mb-1">Your ticket number is:</p>
            <p className="text-lg font-mono text-[var(--casino-accent)] font-bold mb-6">{success.ticket_number}</p>
            <p className="text-sm text-[var(--casino-text-muted)] mb-6">We&apos;ll respond as soon as possible. You&apos;ll be able to track updates on the support page.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" size="sm" onClick={() => router.push('/support')}>
                View Tickets
              </Button>
              <Button variant="primary" size="sm" onClick={() => router.push('/')}>
                Back to Lobby
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push('/support')} className="text-[var(--casino-text-muted)] hover:text-white transition cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">New Support Ticket</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Category Selection */}
          <Card hover={false} className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-4">What do you need help with?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={cn(
                    'text-left p-3 rounded-lg border transition cursor-pointer',
                    category === cat.value
                      ? 'border-[var(--casino-accent)] bg-[var(--casino-accent)]/10'
                      : 'border-[var(--casino-border)] bg-[var(--casino-surface)] hover:border-[var(--casino-accent)]/50'
                  )}
                >
                  <p className={cn('text-sm font-medium', category === cat.value ? 'text-[var(--casino-accent)]' : 'text-white')}>
                    {cat.label}
                  </p>
                  <p className="text-xs text-[var(--casino-text-muted)] mt-0.5">{cat.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Subject & Message */}
          {category && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card hover={false} className="mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1.5">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief summary of your issue"
                      maxLength={200}
                      className="w-full px-4 py-2.5 rounded-lg bg-[var(--casino-bg)] border border-[var(--casino-border)] text-white placeholder-[var(--casino-text-muted)]/50 focus:border-[var(--casino-accent)] focus:outline-none text-sm"
                    />
                    <p className="text-xs text-[var(--casino-text-muted)] mt-1">{subject.length}/200</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1.5">Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your issue in detail. Include any relevant information like game name, time, or credit amounts."
                      maxLength={5000}
                      rows={6}
                      className="w-full px-4 py-2.5 rounded-lg bg-[var(--casino-bg)] border border-[var(--casino-border)] text-white placeholder-[var(--casino-text-muted)]/50 focus:border-[var(--casino-accent)] focus:outline-none text-sm resize-none"
                    />
                    <p className="text-xs text-[var(--casino-text-muted)] mt-1">{message.length}/5000</p>
                  </div>
                </div>
              </Card>

              {error && (
                <div className="mb-4 rounded-lg border border-[var(--casino-red)]/30 bg-[var(--casino-red)]/10 px-4 py-2.5 text-sm text-[var(--casino-red)]">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                disabled={submitting || !subject.trim() || message.trim().length < 10}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit Ticket</>
                )}
              </Button>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  )
}
