'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, Loader2, AlertTriangle, ArrowLeft, Save,
  Globe, Gamepad2, Gift, UserCheck, Check, X, ToggleLeft, ToggleRight
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface PlatformSettings {
  general: {
    siteName: string
    maintenanceMode: boolean
  }
  games: {
    minBet: number
    maxBet: number
    defaultHouseEdge: number
  }
  bonuses: {
    welcomeBonus: number
    dailyBonusBase: number
  }
  registration: {
    emailVerificationRequired: boolean
    ageGateEnabled: boolean
  }
}

const DEFAULT_SETTINGS: PlatformSettings = {
  general: { siteName: 'Fortuna Casino', maintenanceMode: false },
  games: { minBet: 10, maxBet: 100000, defaultHouseEdge: 0.03 },
  bonuses: { welcomeBonus: 10000, dailyBonusBase: 500 },
  registration: { emailVerificationRequired: true, ageGateEnabled: true },
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [isAdmin, setIsAdmin] = useState(false)
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<{ section: string; success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (authLoading || !user) return
    fetch('/api/admin/stats').then(res => {
      if (res.ok) setIsAdmin(true)
    }).catch(() => {})
  }, [authLoading, user])

  useEffect(() => {
    if (!isAdmin) return
    fetchSettings()
  }, [isAdmin])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings({
          general: { ...DEFAULT_SETTINGS.general, ...(data.settings?.general || {}) },
          games: { ...DEFAULT_SETTINGS.games, ...(data.settings?.games || {}) },
          bonuses: { ...DEFAULT_SETTINGS.bonuses, ...(data.settings?.bonuses || {}) },
          registration: { ...DEFAULT_SETTINGS.registration, ...(data.settings?.registration || {}) },
        })
      }
    } catch {
      console.error('Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSection = async (section: keyof PlatformSettings) => {
    setSaving(section)
    setSaveResult(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: section, value: settings[section] }),
      })
      if (res.ok) {
        setSaveResult({ section, success: true, message: 'Saved successfully' })
      } else {
        const data = await res.json()
        setSaveResult({ section, success: false, message: data.error || 'Failed to save' })
      }
    } catch {
      setSaveResult({ section, success: false, message: 'Network error' })
    } finally {
      setSaving(null)
      setTimeout(() => setSaveResult(null), 3000)
    }
  }

  const updateSetting = <K extends keyof PlatformSettings>(
    section: K,
    key: keyof PlatformSettings[K],
    value: PlatformSettings[K][keyof PlatformSettings[K]]
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }))
  }

  if (authLoading || loading) {
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
          <p className="text-gray-400 mb-6">You do not have permission to access settings.</p>
          <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
            Return Home
          </button>
        </motion.div>
      </div>
    )
  }

  const sections = [
    {
      key: 'general' as const,
      title: 'General Settings',
      icon: Globe,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      key: 'games' as const,
      title: 'Game Settings',
      icon: Gamepad2,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      key: 'bonuses' as const,
      title: 'Bonus Settings',
      icon: Gift,
      color: 'text-[var(--gold)]',
      bgColor: 'bg-yellow-500/10',
    },
    {
      key: 'registration' as const,
      title: 'Registration Settings',
      icon: UserCheck,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
  ]

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
                <Settings className="w-5 h-5 text-[var(--gold)]" />
                Platform Settings
              </h1>
              <p className="text-sm text-gray-400">Configure casino platform</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {sections.map((section, i) => (
          <motion.div
            key={section.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <section.icon className={`w-4 h-4 ${section.color}`} />
                {section.title}
              </h2>
              <button
                onClick={() => saveSection(section.key)}
                disabled={saving === section.key}
                className="px-4 py-1.5 bg-[var(--gold)] hover:bg-yellow-600 text-gray-900 font-semibold rounded-lg transition-colors text-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving === section.key ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </button>
            </div>
            <div className="p-5 space-y-4">
              {section.key === 'general' && (
                <>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Site Name</label>
                    <input
                      type="text"
                      value={settings.general.siteName}
                      onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]/50"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Maintenance Mode</label>
                      <p className="text-xs text-gray-500">Disable access for all non-admin users</p>
                    </div>
                    <button
                      onClick={() => updateSetting('general', 'maintenanceMode', !settings.general.maintenanceMode)}
                      className="flex items-center gap-2"
                    >
                      {settings.general.maintenanceMode ? (
                        <ToggleRight className="w-10 h-6 text-[var(--gold)]" />
                      ) : (
                        <ToggleLeft className="w-10 h-6 text-gray-500" />
                      )}
                    </button>
                  </div>
                </>
              )}

              {section.key === 'games' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Minimum Bet</label>
                      <input
                        type="number"
                        value={settings.games.minBet}
                        onChange={(e) => updateSetting('games', 'minBet', Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Maximum Bet</label>
                      <input
                        type="number"
                        value={settings.games.maxBet}
                        onChange={(e) => updateSetting('games', 'maxBet', Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Default House Edge (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={(settings.games.defaultHouseEdge * 100).toFixed(1)}
                        onChange={(e) => updateSetting('games', 'defaultHouseEdge', Number(e.target.value) / 100)}
                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]/50"
                      />
                    </div>
                  </div>
                </>
              )}

              {section.key === 'bonuses' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Welcome Bonus (credits)</label>
                      <input
                        type="number"
                        value={settings.bonuses.welcomeBonus}
                        onChange={(e) => updateSetting('bonuses', 'welcomeBonus', Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Daily Bonus Base (credits)</label>
                      <input
                        type="number"
                        value={settings.bonuses.dailyBonusBase}
                        onChange={(e) => updateSetting('bonuses', 'dailyBonusBase', Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[var(--gold)]/50"
                      />
                    </div>
                  </div>
                </>
              )}

              {section.key === 'registration' && (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Email Verification Required</label>
                        <p className="text-xs text-gray-500">New users must verify their email before playing</p>
                      </div>
                      <button
                        onClick={() => updateSetting('registration', 'emailVerificationRequired', !settings.registration.emailVerificationRequired)}
                        className="flex items-center gap-2"
                      >
                        {settings.registration.emailVerificationRequired ? (
                          <ToggleRight className="w-10 h-6 text-[var(--gold)]" />
                        ) : (
                          <ToggleLeft className="w-10 h-6 text-gray-500" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium">Age Gate</label>
                        <p className="text-xs text-gray-500">Require age confirmation on signup</p>
                      </div>
                      <button
                        onClick={() => updateSetting('registration', 'ageGateEnabled', !settings.registration.ageGateEnabled)}
                        className="flex items-center gap-2"
                      >
                        {settings.registration.ageGateEnabled ? (
                          <ToggleRight className="w-10 h-6 text-[var(--gold)]" />
                        ) : (
                          <ToggleLeft className="w-10 h-6 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Save result feedback */}
              {saveResult && saveResult.section === section.key && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                    saveResult.success
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {saveResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  {saveResult.message}
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
