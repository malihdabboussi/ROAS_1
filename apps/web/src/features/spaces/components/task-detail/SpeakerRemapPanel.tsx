'use client'

import { useMemo, useState } from 'react'
import { remapMeetingSpeaker } from '../../services/spaces.service'
import type { SpaceItem } from '../../types'

type SpeakerRemapPanelProps = {
  item: SpaceItem
  spaceId: string
  personOptions: Array<{ label: string; email?: string | null }>
  onRemapped: (item: SpaceItem) => void
}

function readUnresolvedSpeakers(item: SpaceItem): string[] {
  const custom =
    item.custom_data && typeof item.custom_data === 'object'
      ? (item.custom_data as Record<string, unknown>)
      : {}
  if (!Array.isArray(custom.unresolved_speakers)) return []
  return custom.unresolved_speakers.map((v) => String(v).trim()).filter(Boolean)
}

export function SpeakerRemapPanel({
  item,
  spaceId,
  personOptions,
  onRemapped,
}: SpeakerRemapPanelProps) {
  const unresolved = useMemo(() => readUnresolvedSpeakers(item), [item])
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const uniquePeople = useMemo(() => {
    const seen = new Set<string>()
    const out: Array<{ label: string; email?: string | null }> = []
    for (const person of personOptions) {
      const key = person.label.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(person)
    }
    return out
  }, [personOptions])

  if (unresolved.length === 0) return null

  const handleBind = async (speakerKey: string, label: string, email?: string | null) => {
    setPendingKey(speakerKey)
    setError(null)
    try {
      const updated = await remapMeetingSpeaker(spaceId, item.id, {
        speaker_key: speakerKey,
        label,
        email: email ?? null,
      })
      onRemapped(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save speaker mapping')
    } finally {
      setPendingKey(null)
    }
  }

  return (
    <div className="border-border bg-secondary mt-spacing-2 rounded-spacing-2 p-spacing-3 border">
      <p className="body-2 text-foreground mb-spacing-2 font-medium">Map unknown speakers</p>
      <p className="body-3 text-muted-foreground mb-spacing-3">
        Fathom labeled someone as Speaker N. Bind them to a person on this call.
      </p>
      <ul className="gap-spacing-2 flex flex-col">
        {unresolved.map((speakerKey) => (
          <li key={speakerKey} className="gap-spacing-2 flex flex-wrap items-center">
            <span className="body-2 text-muted-foreground">{speakerKey}</span>
            <select
              className="border-border bg-background text-foreground body-2 rounded-spacing-2 px-spacing-2 py-spacing-1 border"
              disabled={pendingKey === speakerKey || uniquePeople.length === 0}
              defaultValue=""
              onChange={(event) => {
                const label = event.target.value
                if (!label) return
                const person = uniquePeople.find((p) => p.label === label)
                void handleBind(speakerKey, label, person?.email)
                event.target.value = ''
              }}
            >
              <option value="">Choose person…</option>
              {uniquePeople.map((person) => (
                <option key={person.label} value={person.label}>
                  {person.label}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      {error ? <p className="body-3 text-destructive mt-spacing-2">{error}</p> : null}
    </div>
  )
}
