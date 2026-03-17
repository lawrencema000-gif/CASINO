'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Ticket, Plus, Loader2, ArrowLeft, AlertTriangle,
  ToggleLeft, ToggleRight, Trash2, Gift, Clock, Users
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface PromoCode {
  id: string
  code: string
  description: string | null
  reward_type: string
  reward_value: number
  max_uses: number | null
  current_uses: number
  per_user_limit: number
  min_level: number
  min_vip_tier: string | null
  new_users_only: boolean
  starts_at: string
  expires_at: string | null
  is_active: boolean
  created_at: string
}

const REWARD_COLORS: Record<string, string> = {
  credits: 'bg-green-500/20 text-green-400',
  exp: 'bg-purple-500/20 text-purple-400',
  multiplier_boost: 'bg-orange-500/20 text-orange-400',
}

export default function AdminPromosPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Create form
  const [form, setForm] = useState({
    code: '',
    description: '',
    reward_type: 'credits',
    reward_value: '',
    max_uses: '',
    per_user_limit: '1',
    min_level: '0',
    min_vip_tier: '',
    new_users_only: false,
    expires_at: '',
  })
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    if (authLoading || !user) return
    fetch('/api/admin/stats').then(res => {
      if (res.ok) setIsAdmin(true)
    }).catch(() => {})
  }, [authLoading, user])

  const fetchPromos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/promos')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPromos(data.promos || [])
    } catch {
      console.error('Failed to fetch promos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    fetchPromos()
  }, [isAdmin, fetchPromos])

  const handleCreate = async () => {
    setCreateError('')
    if (!form.code.trim() || !form.reward_value) {
      setCreateError('Code and reward value are required')
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          code: form.code,
          description: form.description || null,
          reward_type: form.reward_type,
          reward_value: Number(form.reward_value),
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          per_user_limit: Number(form.per_user_limit) || 1,
          min_level: Number(form.min_level) || 0,
          min_vip_tier: form.min_vip_tier || null,
          new_users_only: form.new_users_only,
          expires_at: form.expires_at || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create')
        return
      }
      setShowCreate(false)
      setForm({ code: '', description: '', reward_type: 'credits', reward_value: '', max_uses: '', per_user_limit: '1', min_level: '0', min_vip_tier: '', new_users_only: false, expires_at: '' })
      fetchPromos()
    } catch {
      setCreateError('Network error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggle = async (promoId: string, currentActive: boolean) => {
    await fetch('/api/admin/promos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', promoId, is_active: !currentActive }),
    })
    fetchPromos()
  }

  const handleDelete = async (promoId: string) => {
    if (!confirm('Delete this promo code?')) return
    await fetch('/api/admin/promos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', promoId }),
    })
    fetchPromos()
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
                <Ticket className="w-5 h-5 text-[var(--gold)]" />
                Promo Management
              </h1>
              <p className="text-sm text-gray-400">{promos.length} promo codes</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-[var(--gold)] hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Promo
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Create Form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
            >
              <div className="p-5 space-y-4">
                <h2 className="font-semibold">Create Promo Code</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Code *</label>
                    <input
                      value={form.code}
                      onChange={e => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. SUMMER2026"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50 uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Reward Type *</label>
                    <select
                      value={form.reward_type}
                      onChange={e => setForm({ ...form, reward_type: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]/50"
                    >
                      <option value="credits">Credits</option>
                      <option value="exp">XP</option>
                      <option value="multiplier_boost">Multiplier Boost</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Reward Value *</label>
                    <input
                      type="number"
                      value={form.reward_value}
                      onChange={e => setForm({ ...form, reward_value: e.target.value })}
                      placeholder="e.g. 500"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Description</label>
                    <input
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Summer bonus"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Max Uses (blank = unlimited)</label>
                    <input
                      type="number"
                      value={form.max_uses}
                      onChange={e => setForm({ ...form, max_uses: e.target.value })}
                      placeholder="Unlimited"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--gold)]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Per User Limit</label>
                    <input
                      type="number"
                      value={form.per_user_limit}
                      onChange={e => setForm({ ...form, per_user_limit: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Min Level</label>
                    <input
                      type="number"
                      value={form.min_level}
                      onChange={e => setForm({ ...form, min_level: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Min VIP Tier</label>
                    <select
                      value={form.min_vip_tier}
                      onChange={e => setForm({ ...form, min_vip_tier: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]/50"
                    >
                      <option value="">None</option>
                      <option value="bronze">Bronze</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                      <option value="diamond">Diamond</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Expires At</label>
                    <input
                      type="datetime-local"
                      value={form.expires_at}
                      onChange={e => setForm({ ...form, expires_at: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gold)]/50"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.new_users_only}
                    onChange={e => setForm({ ...form, new_users_only: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-800 accent-[var(--gold)]"
                  />
                  New users only
                </label>
                {createError && (
                  <p className="text-sm text-red-400">{createError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[var(--gold)] hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Promo
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Promo List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[var(--gold)] animate-spin" />
            </div>
          ) : promos.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No promo codes yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs uppercase border-b border-gray-800">
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Reward</th>
                    <th className="px-4 py-3 text-center">Uses</th>
                    <th className="px-4 py-3 text-center">Limits</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Expires</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.map(promo => (
                    <tr key={promo.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-[var(--gold)]">{promo.code}</span>
                        {promo.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{promo.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${REWARD_COLORS[promo.reward_type] || ''}`}>
                          {promo.reward_value} {promo.reward_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-300">{promo.current_uses}</span>
                        <span className="text-gray-500">/{promo.max_uses || '\u221e'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5 text-xs text-gray-500">
                          {promo.min_level > 0 && <span>Lvl {promo.min_level}+</span>}
                          {promo.min_vip_tier && <span className="capitalize">{promo.min_vip_tier}+</span>}
                          {promo.new_users_only && <span className="text-blue-400">New only</span>}
                          {promo.min_level === 0 && !promo.min_vip_tier && !promo.new_users_only && <span>None</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${promo.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {promo.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">
                        {promo.expires_at
                          ? new Date(promo.expires_at).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggle(promo.id, promo.is_active)}
                            className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                            title={promo.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {promo.is_active
                              ? <ToggleRight className="w-4 h-4 text-green-400" />
                              : <ToggleLeft className="w-4 h-4 text-gray-500" />}
                          </button>
                          <button
                            onClick={() => handleDelete(promo.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded transition-colors text-gray-500 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
