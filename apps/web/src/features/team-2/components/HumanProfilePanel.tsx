'use client'

import { useEffect, useState } from 'react'
import type { DmPartnerProfile } from '../services/dm.service'

interface HumanProfilePanelProps {
  partner: DmPartnerProfile
  orgRole: string | null
}

function useLocalTime(timezone: string | null): string | null {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    if (!timezone) {
      setTime(null)
      return
    }

    const update = () => {
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        setTime(formatter.format(new Date()))
      } catch {
        setTime(null)
      }
    }

    update()
    const id = window.setInterval(update, 30_000)
    return () => window.clearInterval(id)
  }, [timezone])

  return time
}

export function HumanProfilePanel({ partner, orgRole }: HumanProfilePanelProps) {
  const localTime = useLocalTime(partner.timezone)
  const displayName = partner.full_name?.trim() || 'Unknown user'
  const initial = displayName.slice(0, 1).toUpperCase()

  return (
    <aside className="surface-card border-subtle rounded-spacing-3 flex h-full min-h-0 w-full flex-col overflow-hidden border">
      <div className="gap-spacing-3 p-spacing-5 flex flex-col items-center border-b border-[var(--border)]">
        {partner.avatar_url ? (
          <img
            src={partner.avatar_url}
            alt=""
            className="h-20 w-20 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex h-20 w-20 items-center justify-center rounded-full">
            <span className="text-2xl font-semibold uppercase">{initial}</span>
          </div>
        )}
        <div className="gap-spacing-1 flex flex-col items-center text-center">
          <span className="body-1 text-foreground font-semibold">{displayName}</span>
          {partner.functional_role && (
            <span className="body-3 text-muted-foreground">{partner.functional_role}</span>
          )}
        </div>
        {(partner.status_emoji || partner.status_text) && (
          <div className="surface-card-soft body-3 text-foreground gap-spacing-2 px-spacing-3 flex items-center rounded-full py-1">
            {partner.status_emoji && <span>{partner.status_emoji}</span>}
            {partner.status_text && <span className="truncate">{partner.status_text}</span>}
          </div>
        )}
      </div>

      <div className="scrollbar-hide gap-spacing-3 p-spacing-5 flex flex-1 flex-col overflow-y-auto">
        <Row label="Org role" value={orgRole ? capitalize(orgRole) : '—'} />
        <Row label="Local time" value={localTime ?? '—'} />
        <Row label="Timezone" value={partner.timezone ?? '—'} />
      </div>
    </aside>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="gap-spacing-1 flex flex-col">
      <span className="body-3 text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="body-2 text-foreground">{value}</span>
    </div>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
