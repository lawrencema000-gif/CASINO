'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { translations, DEFAULT_LOCALE, type Locale } from './translations'

type TranslationKey = keyof typeof translations.en

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const stored = localStorage.getItem('fortuna-locale') as Locale | null
    if (stored && translations[stored]) {
      setLocaleState(stored)
    } else {
      // Try browser language
      const browserLang = navigator.language.split('-')[0] as Locale
      if (translations[browserLang]) {
        setLocaleState(browserLang)
      }
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('fortuna-locale', newLocale)
    // Update HTML dir for RTL languages
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr'
  }, [])

  const t = useCallback((key: TranslationKey): string => {
    return translations[locale]?.[key] || translations.en[key] || key
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
