'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { SUPPORTED_LOCALES } from '@/lib/i18n/translations'
import { cn } from './cn'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)

  const current = SUPPORTED_LOCALES.find(l => l.code === locale) || SUPPORTED_LOCALES[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-[var(--casino-text-muted)] hover:text-white hover:bg-white/5 transition cursor-pointer"
        title="Language"
      >
        <Globe className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">{current.flag}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-1 w-48 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto"
          >
            {SUPPORTED_LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLocale(l.code); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer',
                  locale === l.code
                    ? 'text-[var(--casino-accent)] bg-[var(--casino-accent)]/5'
                    : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
                )}
              >
                <span className="text-base">{l.flag}</span>
                <span className="flex-1 text-left">{l.name}</span>
                {locale === l.code && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
