'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import {
  QuickMissionsHubModal,
  QUICK_MISSIONS_OPEN_EVENT,
} from '@/features/spaces/components/playbooks/QuickMissionsHubModal'

export function QuickMissionsHubHost() {
  const spaces = useSpacesStore((s) => s.spaces)
  const [open, setOpen] = useState(false)
  const [initialPlaybookKey, setInitialPlaybookKey] = useState<string | null>(null)

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ playbookKey?: string | null }>).detail
      setInitialPlaybookKey(detail?.playbookKey ?? null)
      setOpen(true)
    }
    window.addEventListener(QUICK_MISSIONS_OPEN_EVENT, onOpen as EventListener)
    return () => window.removeEventListener(QUICK_MISSIONS_OPEN_EVENT, onOpen as EventListener)
  }, [])

  const clients = useMemo(
    () =>
      spaces
        .filter(
          (space) =>
            typeof space.campaign_id === 'string' &&
            space.campaign_id.length > 0 &&
            space.space_kind !== 'personal_dashboard',
        )
        .map((space) => ({
          spaceId: space.id,
          campaignId: space.campaign_id as string,
          title: space.title,
        })),
    [spaces],
  )

  return (
    <QuickMissionsHubModal
      open={open}
      clients={clients}
      initialPlaybookKey={initialPlaybookKey}
      onClose={() => {
        setOpen(false)
        setInitialPlaybookKey(null)
      }}
    />
  )
}
