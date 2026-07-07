'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAccountContextGate } from '@/features/org/store/use-org-store'
import { TeamsIndexView } from '@/features/team-2/components/teams/TeamsIndexView'

export default function TeamsIndexPage() {
  const router = useRouter()
  const { isAccountContextReady, isPersonalAccountContext } = useAccountContextGate()

  useEffect(() => {
    if (isPersonalAccountContext) router.replace('/team')
  }, [isPersonalAccountContext, router])

  if (!isAccountContextReady || isPersonalAccountContext) return null

  return (
    <main className="flex h-full flex-col">
      <TeamsIndexView />
    </main>
  )
}
