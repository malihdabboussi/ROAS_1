'use client'

import { useEffect, useState } from 'react'
import type { AgencyClient } from '@/lib/agency-clients'
import { AGENCY_CLIENT_MESSAGES } from './config/messages.config'

type ClientPatch = {
  friendly_name: string | null
  status: string | null
  website_url: string | null
  ai_overview: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
}

function nullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed || null
}

export function AgencyClientEditPanel({
  client,
  saving,
  onCancel,
  onSave,
}: {
  client: AgencyClient
  saving: boolean
  onCancel: () => void
  onSave: (patch: ClientPatch) => Promise<void>
}) {
  const [name, setName] = useState(client.display_name || client.name)
  const [status, setStatus] = useState(client.pipeline_stage || client.status || '')
  const [website, setWebsite] = useState(String(client.website_url || ''))
  const [overview, setOverview] = useState(String(client.overview || ''))
  const [contact, setContact] = useState(String(client.contact_name || ''))
  const [email, setEmail] = useState(String(client.email || ''))
  const [phone, setPhone] = useState(String(client.phone || ''))

  useEffect(() => {
    setName(client.display_name || client.name)
    setStatus(client.pipeline_stage || client.status || '')
    setWebsite(String(client.website_url || ''))
    setOverview(String(client.overview || ''))
    setContact(String(client.contact_name || ''))
    setEmail(String(client.email || ''))
    setPhone(String(client.phone || ''))
  }, [client])

  return (
    <section className="surface-card rounded-spacing-3 border-border p-spacing-5 border">
      <div className="gap-spacing-4 grid md:grid-cols-2">
        <Field label="Client name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Pipeline stage">
          <input
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Website">
          <input
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Contact name">
          <input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Contact email">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Contact phone">
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Account overview" wide>
          <textarea
            value={overview}
            onChange={(event) => setOverview(event.target.value)}
            rows={5}
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
              friendly_name: nullable(name),
              status: nullable(status),
              website_url: nullable(website),
              ai_overview: nullable(overview),
              contact_name: nullable(contact),
              email: nullable(email),
              phone: nullable(phone),
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
