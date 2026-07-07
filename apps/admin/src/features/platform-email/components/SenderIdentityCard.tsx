'use client'

import { useState } from 'react'

export function SenderIdentityCard({
  domainVerified,
  onSubmit,
  onSync,
  busy,
}: {
  domainVerified: boolean
  onSubmit: (body: {
    email: string
    name: string
    replyTo: string
    address: string
    city: string
    country: string
    state: string
    zip: string
  }) => Promise<void>
  onSync: () => Promise<void>
  busy: boolean
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('Vibey')
  const [replyTo, setReplyTo] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')

  return (
    <div className="surface-card rounded-spacing-3 p-spacing-5 border border-[var(--border)]">
      <h2 className="title-h3 text-foreground mb-spacing-3">2. Sender identity</h2>
      {!domainVerified ? (
        <p className="body-2 text-muted-foreground">Verify your domain first.</p>
      ) : (
        <form
          className="gap-spacing-3 grid max-w-3xl sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            void onSubmit({
              email: email.trim(),
              name: name.trim(),
              replyTo: replyTo.trim(),
              address: address.trim(),
              city: city.trim(),
              country: country.trim(),
              state: state.trim(),
              zip: zip.trim(),
            })
          }}
        >
          <div className="sm:col-span-2">
            <label className="body-3 text-muted-foreground mb-spacing-1 block">From email</label>
            <input
              className="rounded-spacing-2 px-spacing-3 py-spacing-2 body-2 text-foreground w-full border border-[var(--border)] bg-[var(--background)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@yourdomain.com"
              required
            />
          </div>
          <div>
            <label className="body-3 text-muted-foreground mb-spacing-1 block">From name</label>
            <input
              className="rounded-spacing-2 px-spacing-3 py-spacing-2 body-2 text-foreground w-full border border-[var(--border)] bg-[var(--background)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="body-3 text-muted-foreground mb-spacing-1 block">
              Reply-to (optional)
            </label>
            <input
              className="rounded-spacing-2 px-spacing-3 py-spacing-2 body-2 text-foreground w-full border border-[var(--border)] bg-[var(--background)]"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              type="email"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="body-3 text-muted-foreground mb-spacing-1 block">
              Street address (CAN-SPAM)
            </label>
            <input
              className="rounded-spacing-2 px-spacing-3 py-spacing-2 body-2 text-foreground w-full border border-[var(--border)] bg-[var(--background)]"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="body-3 text-muted-foreground mb-spacing-1 block">City</label>
            <input
              className="rounded-spacing-2 px-spacing-3 py-spacing-2 body-2 text-foreground w-full border border-[var(--border)] bg-[var(--background)]"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="body-3 text-muted-foreground mb-spacing-1 block">
              Country (ISO 2-letter, e.g. US)
            </label>
            <input
              className="rounded-spacing-2 px-spacing-3 py-spacing-2 body-2 text-foreground w-full border border-[var(--border)] bg-[var(--background)]"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="US"
              maxLength={2}
              autoCapitalize="characters"
              required
            />
          </div>
          <div>
            <label className="body-3 text-muted-foreground mb-spacing-1 block">
              State / region (optional, max 2 letters, e.g. CA)
            </label>
            <input
              className="rounded-spacing-2 px-spacing-3 py-spacing-2 body-2 text-foreground w-full border border-[var(--border)] bg-[var(--background)]"
              value={state}
              onChange={(e) => setState(e.target.value)}
              maxLength={2}
              autoCapitalize="characters"
            />
          </div>
          <div>
            <label className="body-3 text-muted-foreground mb-spacing-1 block">ZIP</label>
            <input
              className="rounded-spacing-2 px-spacing-3 py-spacing-2 body-2 text-foreground w-full border border-[var(--border)] bg-[var(--background)]"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              maxLength={32}
            />
          </div>
          <div className="gap-spacing-2 flex sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="button-glass-purple rounded-spacing-2 px-spacing-4 py-spacing-2 body-2 disabled:opacity-40"
            >
              Create sender in SendGrid
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSync()}
              className="button-glass-neutral rounded-spacing-2 px-spacing-4 py-spacing-2 body-2 disabled:opacity-40"
            >
              Refresh verification status
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
