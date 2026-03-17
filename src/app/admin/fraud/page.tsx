'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert, AlertTriangle, Search as SearchIcon, Loader2, ArrowLeft,
  Eye, CheckCircle2, XCircle, ChevronDown, ChevronUp, Filter,
  Monitor, Users
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface FraudFlag {
  id: string
  user_id: string
  status: string
  severity: string
  flag_type: string
  details: Record<string, unknown>
  reviewed_by: string | null
  review_notes: string | null
  created_at: string
}

interface MultiAccountDevice {
  fingerprint_hash: string
  account_count: number
  user_ids: string[]
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-blue-500/20 text-blue-400',
  investigating: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-red-500/20 text-red-400',
  false_positive: 'bg-green-500/20 text-green-400',
  resolved: 'bg-gray-500/20 text-gray-400',
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

export default function AdminFraudPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [flags, setFlags] = useState<FraudFlag[]>([])
  const [devices, setDevices] = useState<MultiAccountDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [stats, setStats] = useState({ pending: 0, critical: 0, investigating: 0 })

  // Expanded flag
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (authLoading || !user) return
    fetch('/api/admin/stats').then(res => {
      if (res.ok) setIsAdmin(true)
    }).catch(() => {})
  }, [authLoading, user])

  const fetchFlags = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/fraud?status=${statusFilter}&limit=50`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setFlags(data.flags || [])
      setStats(data.stats || { pending: 0, critical: 0, investigating: 0 })
      setDevices(data.multi_account_devices || [])
    } catch {
      console.error('Failed to fetch fraud flags')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (!isAdmin) return
    fetchFlags()
  }, [isAdmin, fetchFlags])

  const handleAction = async (flagId: string, action: string) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/fraud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagId, action, notes: reviewNotes || undefined }),
      })
      if (res.ok) {
        setReviewNotes('')
        fetchFlags()
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
          <button onClick={() => router.push('/')} className="mt-4 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
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
                <ShieldAlert className="w-5 h-5 text-red-400" />
                Fraud Review
              </h1>
            </div>
          </div>
          {/* Stats pills */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs">
              {stats.pending} pending
            </span>
            <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg text-xs">
              {stats.critical} critical
            </span>
            <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-lg text-xs">
              {stats.investigating} investigating
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Multi-account devices */}
        {devices.length > 0 && (
          <div className="bg-gray-900 border border-orange-500/30 rounded-xl p-5">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-3 text-orange-400">
              <Monitor className="w-4 h-4" />
              Multi-Account Devices ({devices.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {devices.map((d, i) => (
                <div key={i} className="bg-gray-800/50 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-3.5 h-3.5 text-orange-400" />
                    <span className="font-medium text-orange-400">{d.account_count} accounts</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono truncate">{d.fingerprint_hash}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500" />
          {['pending', 'investigating', 'confirmed', 'false_positive', 'resolved', 'all'].map(s => (
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

        {/* Flags */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[var(--gold)] animate-spin" />
            </div>
          ) : flags.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No fraud flags found</div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {flags.map(flag => (
                <div key={flag.id}>
                  <div
                    className="px-5 py-4 hover:bg-gray-800/30 cursor-pointer transition-colors flex items-center gap-4"
                    onClick={() => {
                      setExpandedId(expandedId === flag.id ? null : flag.id)
                      setReviewNotes('')
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${SEVERITY_COLORS[flag.severity] || ''}`}>
                          {flag.severity}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLORS[flag.status] || ''}`}>
                          {flag.status.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-700/50 text-gray-300 capitalize">
                          {flag.flag_type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-mono">User: {flag.user_id.slice(0, 8)}...</p>
                      <p className="text-xs text-gray-500 mt-0.5">{timeAgo(flag.created_at)}</p>
                    </div>
                    {expandedId === flag.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>

                  <AnimatePresence>
                    {expandedId === flag.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-800 bg-gray-900/50 overflow-hidden"
                      >
                        <div className="p-5 space-y-4">
                          {/* Details */}
                          {flag.details && Object.keys(flag.details).length > 0 && (
                            <div className="bg-gray-800/50 rounded-lg p-3">
                              <h4 className="text-xs font-semibold text-gray-400 mb-2">Details</h4>
                              <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(flag.details, null, 2)}
                              </pre>
                            </div>
                          )}

                          {flag.review_notes && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                              <h4 className="text-xs font-semibold text-yellow-400 mb-1">Review Notes</h4>
                              <p className="text-sm text-gray-300">{flag.review_notes}</p>
                            </div>
                          )}

                          {/* Notes input */}
                          <textarea
                            value={reviewNotes}
                            onChange={e => setReviewNotes(e.target.value)}
                            placeholder="Add review notes..."
                            rows={2}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50 resize-none"
                          />

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleAction(flag.id, 'investigate')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> Investigate
                            </button>
                            <button
                              onClick={() => handleAction(flag.id, 'confirm')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" /> Confirm Fraud
                            </button>
                            <button
                              onClick={() => handleAction(flag.id, 'false_positive')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> False Positive
                            </button>
                            <button
                              onClick={() => handleAction(flag.id, 'resolve')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Resolve
                            </button>
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
