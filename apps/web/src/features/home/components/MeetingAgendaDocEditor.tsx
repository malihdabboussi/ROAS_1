'use client'

import { useEffect, useState } from 'react'
import { SpaceDocDeliverablePreview } from '@/components/deliverables/SpaceDocDeliverablePreview'
import { createClient } from '@/lib/supabase/client'

export function MeetingAgendaDocEditor({
  spaceId,
  itemId,
  title,
}: {
  spaceId: string
  itemId: string
  title: string
}) {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`meeting-agenda-doc:${itemId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'space_items',
          filter: `id=eq.${itemId}`,
        },
        () => setRevision((value) => value + 1),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [itemId])

  return (
    <div className="border-border bg-card rounded-spacing-2 min-h-72 overflow-hidden border">
      <SpaceDocDeliverablePreview
        key={`${itemId}-${revision}`}
        spaceId={spaceId}
        itemId={itemId}
        title={title}
      />
    </div>
  )
}
