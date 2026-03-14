'use client'

import dynamic from 'next/dynamic'

const SessionTimer = dynamic(
  () => import('@/components/ui/SessionTimer'),
  { ssr: false }
)

const RealityCheck = dynamic(
  () => import('@/components/ui/RealityCheck'),
  { ssr: false }
)

export default function ClientProviders() {
  return (
    <>
      <SessionTimer />
      <RealityCheck />
    </>
  )
}
