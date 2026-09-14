'use client'

import type { useNoteTakerDefinitionForm } from './use-note-taker-definition-form'

type Form = ReturnType<typeof useNoteTakerDefinitionForm>

const SELECT_CLASS =
  'border-border bg-background text-foreground body-3 rounded-spacing-2 px-spacing-3 h-spacing-9 w-full border outline-none'

/**
 * The fast path for non-technical admins: paste one delivery and let ROAS
 * fill the paths, or start from a template for a known payload shape.
 */
export function NoteTakerStartSection({ form }: { form: Form }) {
  const { state, errors, setField } = form
  return (
    <section className="rounded-spacing-3 border-border bg-secondary p-spacing-4 space-y-spacing-3 border">
      <div>
        <p className="body-2 text-foreground font-medium">Fastest way: paste one delivery</p>
        <p className="body-4 text-muted-foreground">
          Paste the JSON the tool sends for one finished meeting (most tools have a "send test
          request" button). ROAS finds the fields and fills the form; you only fix what it got
          wrong.
        </p>
      </div>
      <textarea
        id="nt-samplePayload"
        value={state.samplePayload}
        onChange={(e) => setField('samplePayload', e.target.value)}
        rows={6}
        placeholder='{"session_id": "abc", "title": "Kickoff", "transcript": {"speaker_blocks": [{"speaker": {"name": "Ana"}, "words": "Hello"}]}}'
        className={`input-glass body-3 w-full font-mono ${errors.samplePayload ? 'border-destructive' : ''}`}
        aria-label="Sample delivery JSON"
      />
      {errors.samplePayload ? (
        <p className="body-4 text-destructive">{errors.samplePayload}</p>
      ) : null}
      <div className="gap-spacing-3 flex flex-col sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => void form.detectFields()}
          disabled={form.detecting}
          className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
        >
          {form.detecting ? 'Detecting…' : 'Detect fields'}
        </button>
        {form.templates.length > 0 ? (
          <div className="gap-spacing-2 flex min-w-0 flex-1 items-center">
            <span className="body-4 text-muted-foreground shrink-0">or start from</span>
            <select
              aria-label="Start from a template"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) form.applyTemplate(e.target.value)
                e.target.value = ''
              }}
              className={SELECT_CLASS}
            >
              <option value="">a template…</option>
              {form.templates.map((template) => (
                <option key={template.key} value={template.key} title={template.description}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      {form.detection ? (
        <div className="body-4 space-y-spacing-1" data-testid="detection-note">
          {form.detection.detected.length > 0 ? (
            <p className="text-foreground">Found: {form.detection.detected.join(', ')}.</p>
          ) : null}
          {form.detection.missing.length > 0 ? (
            <p className="text-destructive">
              Not found:{' '}
              {form.detection.missing
                .map((key) => (key === 'externalId' ? 'the meeting id' : 'the transcript turns'))
                .join(' and ')}
              . Fill those paths below.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Check the mapping result at the bottom, then save.
            </p>
          )}
        </div>
      ) : null}
    </section>
  )
}
