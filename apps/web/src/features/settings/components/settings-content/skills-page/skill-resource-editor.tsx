'use client'

import { useEffect, useRef, useState } from 'react'
import type { MissionAgentSkillResource } from '@/features/mission-control/types'

export function SkillResourceEditor({
  resource,
  onSave,
}: {
  resource: MissionAgentSkillResource
  onSave: (content: string) => void | Promise<void>
}) {
  const [value, setValue] = useState(resource.content ?? '')
  const [saving, setSaving] = useState(false)
  const lastSavedRef = useRef(resource.content ?? '')

  useEffect(() => {
    const next = resource.content ?? ''
    setValue(next)
    lastSavedRef.current = next
  }, [resource.id, resource.content])

  const persist = async (content: string) => {
    if (content === lastSavedRef.current) return
    setSaving(true)
    try {
      await onSave(content)
      lastSavedRef.current = content
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {saving ? <p className="body-4 text-muted-foreground mb-spacing-2">Saving…</p> : null}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void persist(value)}
        placeholder="Write reference content…"
        className="body-3 text-foreground placeholder:text-muted-foreground min-h-[300px] w-full flex-1 resize-none bg-transparent font-mono outline-none"
      />
    </div>
  )
}
