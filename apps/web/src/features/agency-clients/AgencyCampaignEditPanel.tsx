'use client'

import { useEffect, useState } from 'react'
import type { AgencyClientCampaign } from '@/lib/agency-clients'
import { AGENCY_CLIENT_MESSAGES } from './config/messages.config'

export type CampaignPatch = {
  name: string
  status: string | null
  event_date: string | null
  budget_amount: number | null
  budget_type: string | null
  currency: string | null
  campaign_overview: string | null
  next_action: string | null
}

function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed || null
}

export function AgencyCampaignEditPanel({
  campaign,
  saving,
  onCancel,
  onSave,
}: {
  campaign: AgencyClientCampaign
  saving: boolean
  onCancel: () => void
  onSave: (patch: CampaignPatch) => Promise<void>
}) {
  const [name, setName] = useState(campaign.name)
  const [status, setStatus] = useState(campaign.status || campaign.platform_status || '')
  const [eventDate, setEventDate] = useState(campaign.event_date || '')
  const [budget, setBudget] = useState(campaign.budget_amount?.toString() || '')
  const [budgetType, setBudgetType] = useState(campaign.budget_type || '')
  const [currency, setCurrency] = useState(campaign.currency || '')
  const [overview, setOverview] = useState(campaign.campaign_overview || '')
  const [nextAction, setNextAction] = useState(campaign.next_action || '')

  useEffect(() => {
    setName(campaign.name)
    setStatus(campaign.status || campaign.platform_status || '')
    setEventDate(campaign.event_date || '')
    setBudget(campaign.budget_amount?.toString() || '')
    setBudgetType(campaign.budget_type || '')
    setCurrency(campaign.currency || '')
    setOverview(campaign.campaign_overview || '')
    setNextAction(campaign.next_action || '')
  }, [campaign])

  return (
    <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border">
      <div className="gap-spacing-4 grid md:grid-cols-2">
        <Field label="Campaign name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Status">
          <input
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Event date">
          <input
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Budget">
          <input
            type="number"
            min="0"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Budget type">
          <input
            value={budgetType}
            onChange={(event) => setBudgetType(event.target.value)}
            placeholder="monthly, total, daily"
            className={inputClass}
          />
        </Field>
        <Field label="Currency">
          <input
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            placeholder="USD or $"
            className={inputClass}
          />
        </Field>
        <Field label="Campaign overview" wide>
          <textarea
            value={overview}
            onChange={(event) => setOverview(event.target.value)}
            rows={4}
            className={inputClass}
          />
        </Field>
        <Field label="Next action" wide>
          <textarea
            value={nextAction}
            onChange={(event) => setNextAction(event.target.value)}
            rows={3}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="mt-spacing-4 gap-spacing-2 flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="button-compact button-glass-neutral"
        >
          {AGENCY_CLIENT_MESSAGES.CANCEL}
        </button>
        <button
          type="button"
          disabled={saving || !name.trim()}
          onClick={() =>
            void onSave({
              name: name.trim(),
              status: nullable(status),
              event_date: nullable(eventDate),
              budget_amount: budget.trim() ? Number(budget) : null,
              budget_type: nullable(budgetType),
              currency: nullable(currency),
              campaign_overview: nullable(overview),
              next_action: nullable(nextAction),
            })
          }
          className="button-compact button-glass-primary disabled:opacity-50"
        >
          {saving ? AGENCY_CLIENT_MESSAGES.SAVING : AGENCY_CLIENT_MESSAGES.SAVE}
        </button>
      </div>
    </section>
  )
}

const inputClass =
  'body-3 bg-secondary text-foreground rounded-spacing-2 border-border px-spacing-3 py-spacing-2 focus:ring-primary w-full border outline-none focus:ring-1'

function Field({
  label,
  wide = false,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={wide ? 'md:col-span-2' : ''}>
      <span className="body-4 text-muted-foreground mb-spacing-1 block">{label}</span>
      {children}
    </label>
  )
}
