'use client'

import { useState } from 'react'

type DnsRow = { type: string; host: string; data: string; valid: boolean }

export function DomainSetupCard({
  dnsRecords,
  onSubmitDomain,
  onVerify,
  busy,
}: {
  dnsRecords: DnsRow[]
  onSubmitDomain: (domain: string, subdomain: string) => Promise<void>
  onVerify: () => Promise<void>
  busy: boolean
}) {
  const [domain, setDomain] = useState('')
  const [subdomain, setSubdomain] = useState('')

  return (
    <div className="surface-card rounded-spacing-3 p-spacing-5 border border-[var(--border)]">
      <h2 className="title-h3 text-foreground mb-spacing-3">1. Sending domain</h2>
      <form
        className="gap-spacing-3 flex flex-wrap items-end"
        onSubmit={(e) => {
          e.preventDefault()
          void onSubmitDomain(domain.trim(), subdomain.trim())
        }}
      >
        <div>
          <label className="body-3 text-muted-foreground mb-spacing-1 block">Domain</label>
          <input
            className="rounded-spacing-2 px-spacing-3 py-spacing-2 body-2 text-foreground min-w-[200px] border border-[var(--border)] bg-[var(--background)]"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="roas.io"
            required
          />
        </div>
        <div>
          <label className="body-3 text-muted-foreground mb-spacing-1 block">
            Subdomain (optional)
          </label>
          <input
            className="rounded-spacing-2 px-spacing-3 py-spacing-2 body-2 text-foreground min-w-[160px] border border-[var(--border)] bg-[var(--background)]"
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
            placeholder="mail"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="button-glass-purple rounded-spacing-2 px-spacing-4 py-spacing-2 body-2 disabled:opacity-40"
        >
          Create / update in SendGrid
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onVerify()}
          className="button-glass-neutral rounded-spacing-2 px-spacing-4 py-spacing-2 body-2 disabled:opacity-40"
        >
          Verify DNS
        </button>
      </form>
      {dnsRecords.length > 0 && (
        <div className="mt-spacing-4">
          <p className="body-2 text-muted-foreground mb-spacing-2">DNS records to add:</p>
          <ul className="space-y-spacing-2 body-3 text-foreground font-mono">
            {dnsRecords.map((r, i) => (
              <li key={i} className="rounded-spacing-2 bg-[var(--muted)]/30 p-spacing-2">
                <span className="text-muted-foreground">{r.type}</span> {r.host} → {r.data}{' '}
                {r.valid ? '✓' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
