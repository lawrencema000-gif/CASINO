'use client'

import dynamic from 'next/dynamic'
import { I18nProvider } from '@/lib/i18n/context'
import PostHogProvider from '@/components/providers/PostHogProvider'

const SessionTimer = dynamic(
  () => import('@/components/ui/SessionTimer'),
  { ssr: false }
)

const RealityCheck = dynamic(
  () => import('@/components/ui/RealityCheck'),
  { ssr: false }
)

const LiveChat = dynamic(
  () => import('@/components/ui/LiveChat'),
  { ssr: false }
)

export default function ClientProviders({ children }: { children?: React.ReactNode }) {
  return (
    <PostHogProvider>
      <I18nProvider>
        {children}
        <SessionTimer />
        <RealityCheck />
        <LiveChat />
        <ServiceWorkerRegistrar />
      </I18nProvider>
    </PostHogProvider>
  )
}

function ServiceWorkerRegistrar() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }
  return null
}
