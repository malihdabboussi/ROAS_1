'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAccountContextGate } from '@/features/org/store/use-org-store'
import { TeamDetailView } from '@/features/team-2/components/teams/TeamDetailView'

export default function TeamDetailPage() {
  const router = useRouter()
  const { isAccountContextReady, isPersonalAccountContext } = useAccountContextGate()
  const params = useParams<{ teamId: string }>()
  const teamId = params?.teamId
  useEffect(() => {
    if (isPersonalAccountContext) router.replace('/team')
  }, [isPersonalAccountContext, router])

  if (!isAccountContextReady || isPersonalAccountContext) return null
  if (!teamId) return null
  return (
    <main className="flex h-full flex-col">
      <TeamDetailView teamId={teamId} />
    </main>
  )
}
