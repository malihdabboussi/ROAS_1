'use client'

import { useEffect, useState } from 'react'
import { SLACK_PEOPLE_MESSAGES } from '../../config/messages.config'
import {
  fetchSlackAutomationHealth,
  type SlackAutomationHealth,
} from '../../services/slack-people.service'

export function SlackAutomationHealthCard() {
  const [health, setHealth] = useState<SlackAutomationHealth | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let cancelled = false
    void fetchSlackAutomationHealth()
      .then((summary) => {
        if (!cancelled) setHealth(summary)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const skipped = health ? Object.values(health.skipped).reduce((sum, count) => sum + count, 0) : 0
  const held = health ? Object.values(health.held).reduce((sum, count) => sum + count, 0) : 0
  const reasons = health
    ? [
        ...Object.entries(health.skipped).map(([reason, count]) => `Skipped: ${reason} (${count})`),
        ...Object.entries(health.held).map(([reason, count]) => `Held: ${reason} (${count})`),
      ]
    : []

  return (
    <section className="surface-card border-border p-spacing-3 rounded-spacing-3 border">
      <div className="gap-spacing-3 flex flex-wrap items-center">
        <p className="body-3 text-foreground font-medium">Pixel activity · last 24h</p>
        {health ? (
          <>
            <span className="badge-glass badge-glass-muted body-4">Ran {health.ran}</span>
            <span className="badge-glass badge-glass-green body-4">
              Delivered {health.delivered}
            </span>
            <span className="badge-glass badge-glass-orange body-4">Skipped {skipped}</span>
            <span className="badge-glass badge-glass-muted body-4">Held {held}</span>
          </>
        ) : error ? (
          <p className="body-4 text-destructive">{SLACK_PEOPLE_MESSAGES.AUTOMATION_HEALTH_ERROR}</p>
        ) : (
          <p className="body-4 text-muted-foreground">Loading activity…</p>
        )}
      </div>
      {reasons.length > 0 ? (
        <p className="body-4 text-muted-foreground mt-spacing-2">{reasons.join(' · ')}</p>
      ) : null}
    </section>
  )
}
