'use client'

import { NoteTakerFieldMapSection } from './NoteTakerFieldMapSection'
import { NoteTakerPreviewPanel } from './NoteTakerPreviewPanel'
import { NoteTakerStartSection } from './NoteTakerStartSection'
import type { useNoteTakerDefinitionForm } from './use-note-taker-definition-form'

type Form = ReturnType<typeof useNoteTakerDefinitionForm>

const SELECT_CLASS =
  'border-border bg-background text-foreground body-3 rounded-spacing-2 px-spacing-3 h-spacing-9 w-full border outline-none'

function TextField({
  id,
  label,
  value,
  error,
  placeholder,
  required,
  onChange,
}: {
  id: string
  label: string
  value: string
  error?: string
  placeholder?: string
  required?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="body-3 text-muted-foreground mb-spacing-1 block" htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input-glass body-3 w-full ${error ? 'border-destructive' : ''}`}
      />
      {error ? <p className="body-4 text-destructive mt-spacing-1">{error}</p> : null}
    </div>
  )
}

/** Step 2 of "More integrations": everything a new note taker needs, then a test. */
export function NoteTakerDefinitionForm({ form }: { form: Form }) {
  const { state, errors, setField } = form
  const signed = state.signatureScheme === 'hmac_sha256'
  return (
    <div className="space-y-spacing-6">
      <NoteTakerStartSection form={form} />

      <section className="space-y-spacing-3">
        <p className="body-2 text-foreground font-medium">About the tool</p>
        <div className="gap-spacing-3 grid grid-cols-1 sm:grid-cols-2">
          <TextField
            id="nt-displayName"
            label="Name"
            value={state.displayName}
            error={errors.displayName}
            placeholder="Otter"
            required
            onChange={(v) => setField('displayName', v)}
          />
          <TextField
            id="nt-logoUrl"
            label="Logo image address"
            value={state.logoUrl}
            error={errors.logoUrl}
            placeholder="https://…/logo.png"
            onChange={(v) => setField('logoUrl', v)}
          />
        </div>
        <TextField
          id="nt-description"
          label="One line shown on the card"
          value={state.description}
          placeholder="Meeting transcripts from Otter into your brain and Meetings."
          onChange={(v) => setField('description', v)}
        />
      </section>

      <section className="space-y-spacing-3">
        <div>
          <p className="body-2 text-foreground font-medium">How the tool signs its deliveries</p>
          <p className="body-4 text-muted-foreground">
            Most tools send an HMAC-SHA256 of the request body in a header. Users paste the secret
            when they connect.
          </p>
        </div>
        <div className="gap-spacing-3 grid grid-cols-1 sm:grid-cols-2">
          <div>
            <label className="body-3 text-muted-foreground mb-spacing-1 block" htmlFor="nt-scheme">
              Signature
            </label>
            <select
              id="nt-scheme"
              value={state.signatureScheme}
              onChange={(e) =>
                setField('signatureScheme', e.target.value as 'none' | 'hmac_sha256')
              }
              className={SELECT_CLASS}
            >
              <option value="hmac_sha256">HMAC-SHA256 over the body</option>
              <option value="none">No signature</option>
            </select>
          </div>
          {signed ? (
            <TextField
              id="nt-signatureHeader"
              label="Header that carries the signature"
              value={state.signatureHeader}
              error={errors.signatureHeader}
              placeholder="X-Signature"
              required
              onChange={(v) => setField('signatureHeader', v)}
            />
          ) : null}
        </div>
        {signed ? (
          <div className="gap-spacing-3 grid grid-cols-1 sm:grid-cols-3">
            <div>
              <label
                className="body-3 text-muted-foreground mb-spacing-1 block"
                htmlFor="nt-encoding"
              >
                Digest format
              </label>
              <select
                id="nt-encoding"
                value={state.signatureEncoding}
                onChange={(e) => setField('signatureEncoding', e.target.value as 'hex' | 'base64')}
                className={SELECT_CLASS}
              >
                <option value="hex">hex</option>
                <option value="base64">base64</option>
              </select>
            </div>
            <TextField
              id="nt-prefix"
              label="Text before the digest"
              value={state.signaturePrefix}
              placeholder="sha256="
              onChange={(v) => setField('signaturePrefix', v)}
            />
            <div>
              <label className="body-3 text-muted-foreground mb-spacing-1 block" htmlFor="nt-key">
                Secret is given as
              </label>
              <select
                id="nt-key"
                value={state.signatureKeyEncoding}
                onChange={(e) =>
                  setField('signatureKeyEncoding', e.target.value as 'utf8' | 'base64')
                }
                className={SELECT_CLASS}
              >
                <option value="utf8">plain text</option>
                <option value="base64">base64</option>
              </select>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-spacing-3">
        <div>
          <p className="body-2 text-foreground font-medium">Which deliveries to accept</p>
          <p className="body-4 text-muted-foreground">
            Optional. Tools that also post "meeting started" pings need an event filter.
          </p>
        </div>
        <div className="gap-spacing-3 grid grid-cols-1 sm:grid-cols-3">
          <TextField
            id="nt-eventTypePath"
            label="Event type field"
            value={state.eventTypePath}
            error={errors.eventTypePath}
            placeholder="event"
            onChange={(v) => setField('eventTypePath', v)}
          />
          <TextField
            id="nt-acceptValues"
            label="Accepted values, comma separated"
            value={state.acceptValues}
            placeholder="meeting.completed"
            onChange={(v) => setField('acceptValues', v)}
          />
          <TextField
            id="nt-deliveryIdPath"
            label="Delivery id field"
            value={state.deliveryIdPath}
            error={errors.deliveryIdPath}
            placeholder="request_id"
            onChange={(v) => setField('deliveryIdPath', v)}
          />
        </div>
      </section>

      <section className="space-y-spacing-3">
        <p className="body-2 text-foreground font-medium">Where the meeting lives in the JSON</p>
        <NoteTakerFieldMapSection state={state} errors={errors} setField={setField} />
      </section>

      <NoteTakerPreviewPanel
        hasSample={state.samplePayload.trim().length > 0}
        previewing={form.previewing}
        preview={form.preview}
        previewError={form.previewError}
        onRunPreview={form.runPreview}
      />
    </div>
  )
}
