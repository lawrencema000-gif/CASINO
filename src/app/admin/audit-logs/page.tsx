'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Loader2, AlertTriangle, ArrowLeft, Filter,
  ChevronLeft, ChevronRight, Clock, Shield, User,
  Settings, Gamepad2, Gift, Search
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AuditLog {
  id: string
  admin_id: string
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

interface AdminUser {
  id: string
  username: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const ACTION_COLORS: Record<string, string> = {
  admin_credit: 'text-green-400 bg-green-500/10',
  admin_debit: 'text-red-400 bg-red-500/10',
  update_setting: 'text-blue-400 bg-blue-500/10',
  suspend: 'text-orange-400 bg-orange-500/10',
  ban: 'text-red-400 bg-red-500/10',
  change_vip: 'text-purple-400 bg-purple-500/10',
  enable_game: 'text-green-400 bg-green-500/10',
  disable_game: 'text-yellow-400 bg-yellow-500/10',
}

const TARGET_ICONS: Record<string, typeof User> = {
  user: User,
  setting: Settings,
  game: Gamepad2,
  promo: Gift,
}

export default function AuditLogsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [isAdmin, setIsAdmin] = useState(false)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [adminMap, setAdminMap] = useState<Record<string, string>>({})

  // Filters
  const [actionFilter, setActionFilter] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 25

  useEffect(() => {
    if (authLoading || !user) return
    fetch('/api/admin/stats').then(res => {
      if (res.ok) setIsAdmin(true)
    }).catch(() => {})
  }, [authLoading, user])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('admin_audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (actionFilter) {
        query = query.eq('action', actionFilter)
      }
      if (targetTypeFilter) {
        query = query.eq('target_type', targetTypeFilter)
      }
      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString())
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setDate(endDate.getDate() + 1)
        query = query.lt('created_at', endDate.toISOString())
      }

      const { data, count, error } = await query

      if (error) {
        console.error('Audit log query error:', error)
        return
      }

      setLogs(data || [])
      setTotalCount(count || 0)

      // Fetch admin usernames
      const adminIds = [...new Set((data || []).map(l => l.admin_id))]
      if (adminIds.length > 0) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', adminIds)

        const map: Record<string, string> = {}
        for (const a of admins || []) {
          map[a.id] = a.username
        }
        setAdminMap(map)
      }
    } catch {
      console.error('Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }, [supabase, page, actionFilter, targetTypeFilter, dateFrom, dateTo])

  useEffect(() => {
    if (!isAdmin) return
    fetchLogs()
  }, [isAdmin, fetchLogs])

  const totalPages = Math.ceil(totalCount / pageSize)

  const handleFilterReset = () => {
    setActionFilter('')
    setTargetTypeFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Loader2 className="w-8 h-8 text-[var(--gold)]" />
        </motion.div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">You do not have permission to view audit logs.</p>
          <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
            Return Home
          </button>
        </motion.div>
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
                <FileText className="w-5 h-5 text-[var(--gold)]" />
                Audit Logs
              </h1>
              <p className="text-sm text-gray-400">{totalCount} total entries</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border border-gray-800 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <Filter className="w-4 h-4 text-[var(--gold)]" />
              Filters
            </h2>
            <button
              onClick={handleFilterReset}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Reset All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Action Type</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]/50"
              >
                <option value="">All Actions</option>
                <option value="admin_credit">Admin Credit</option>
                <option value="admin_debit">Admin Debit</option>
                <option value="update_setting">Update Setting</option>
                <option value="suspend">Suspend User</option>
                <option value="ban">Ban User</option>
                <option value="change_vip">Change VIP</option>
                <option value="enable_game">Enable Game</option>
                <option value="disable_game">Disable Game</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Target Type</label>
              <select
                value={targetTypeFilter}
                onChange={(e) => { setTargetTypeFilter(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]/50"
              >
                <option value="">All Targets</option>
                <option value="user">User</option>
                <option value="setting">Setting</option>
                <option value="game">Game</option>
                <option value="promo">Promo</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]/50"
              />
            </div>
          </div>
        </motion.div>

        {/* Logs Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[var(--gold)] animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No audit logs found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 text-xs uppercase border-b border-gray-800">
                      <th className="px-4 py-3 text-left">Timestamp</th>
                      <th className="px-4 py-3 text-left">Admin</th>
                      <th className="px-4 py-3 text-left">Action</th>
                      <th className="px-4 py-3 text-left">Target</th>
                      <th className="px-4 py-3 text-left">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const actionStyle = ACTION_COLORS[log.action] || 'text-gray-400 bg-gray-500/10'
                      const TargetIcon = TARGET_ICONS[log.target_type || ''] || Shield
                      return (
                        <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                            <div>{new Date(log.created_at).toLocaleDateString()}</div>
                            <div className="text-gray-600">{new Date(log.created_at).toLocaleTimeString()}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium">{adminMap[log.admin_id] || log.admin_id.slice(0, 8) + '...'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${actionStyle}`}>
                              {log.action.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {log.target_type && (
                              <div className="flex items-center gap-1.5">
                                <TargetIcon className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-gray-300 capitalize text-xs">{log.target_type}</span>
                                {log.target_id && (
                                  <span className="text-gray-600 text-xs">
                                    {(log.details as Record<string, unknown>)?.targetUsername as string || log.target_id.slice(0, 8) + '...'}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[300px] truncate">
                            {log.details ? (
                              <span title={JSON.stringify(log.details, null, 2)}>
                                {Object.entries(log.details as Record<string, unknown>)
                                  .filter(([k]) => !['targetUsername'].includes(k))
                                  .slice(0, 3)
                                  .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                                  .join(' | ')}
                              </span>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                  <span className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
