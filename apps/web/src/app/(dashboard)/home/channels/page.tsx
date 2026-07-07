'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ChannelsListContainer } from '@/features/channels'
import { useAccountContextGate } from '@/features/org/store/use-org-store'

export default function HomeChannelsPage() {
  const router = useRouter()
  const { isAccountContextReady, isPersonalAccountContext } = useAccountContextGate()

  useEffect(() => {
    if (isPersonalAccountContext) router.replace('/home')
  }, [isPersonalAccountContext, router])

  if (!isAccountContextReady || isPersonalAccountContext) return null

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <ChannelsListContainer />
    </div>
  )
}
