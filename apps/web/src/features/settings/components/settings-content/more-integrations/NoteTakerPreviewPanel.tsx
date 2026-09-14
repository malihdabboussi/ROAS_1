'use client'

import type { NoteTakerPreviewResult } from '@/lib/integrations/meeting-provider-definitions'

type Props = {
  samplePayload: string
  error?: string
  previewing: boolean
  preview: NoteTakerPreviewResult | null
  previewError: string | null
  onSampleChange: (value: string) => void
  onRunPreview: () => void
}

/** Paste one delivery the tool would send and see what ROAS would import from it. */
export function NoteTakerPreviewPanel({
  samplePayload,
  error,
  previewing,
  preview,
  previewError,
  onSampleChange,
  onRunPreview,
}: Props) {
  return (
    <div className="space-y-spacing-3">
      <div>
        <p className="body-2 text-foreground font-medium">Test with a sample delivery</p>
        <p className="body-4 text-muted-foreground">
          Paste the JSON the tool sends for one finished meeting. Nothing is saved by the test.
        </p>
      </div>
      <textarea
        id="nt-samplePayload"
        value={samplePayload}
        onChange={(e) => onSampleChange(e.target.value)}
        rows={8}
        placeholder='{"session_id": "abc", "title": "Kickoff", "transcript": {"speaker_blocks": [{"speaker": {"name": "Ana"}, "words": "Hello"}]}}'
        className={`input-glass body-3 w-full font-mono ${error ? 'border-destructive' : ''}`}
        aria-label="Sample delivery JSON"
      />
      {error ? <p className="body-4 text-destructive">{error}</p> : null}
      <div className="gap-spacing-2 flex items-center">
        <button
          type="button"
          onClick={onRunPreview}
          disabled={previewing}
          className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 disabled:opacity-50"
        >
          {previewing ? 'Testing…' : 'Test mapping'}
        </button>
      </div>
      {previewError ? <p className="body-4 text-destructive">{previewError}</p> : null}
      {preview && !preview.ok ? (
        <p className="body-3 text-destructive" data-testid="preview-error">
          {preview.error}
        </p>
      ) : null}
      {preview && preview.ok ? (
        <dl
          className="rounded-spacing-2 border-border bg-secondary p-spacing-3 gap-x-spacing-3 gap-y-spacing-1 body-4 grid grid-cols-[auto_1fr] border"
          data-testid="preview-result"
        >
          <dt className="text-muted-foreground">Meeting id</dt>
          <dd className="text-foreground font-mono">{preview.result.externalId}</dd>
          <dt className="text-muted-foreground">Title</dt>
          <dd className="text-foreground">{preview.result.title}</dd>
          <dt className="text-muted-foreground">Transcript turns</dt>
          <dd className="text-foreground">{preview.result.transcriptTurns}</dd>
          {preview.result.firstTurn ? (
            <>
              <dt className="text-muted-foreground">First turn</dt>
              <dd className="text-foreground">
                {preview.result.firstTurn.speakerName}: {preview.result.firstTurn.text}
              </dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">Attendees</dt>
          <dd className="text-foreground">
            {preview.result.participantEmails.length > 0
              ? preview.result.participantEmails.join(', ')
              : 'none found'}
          </dd>
          <dt className="text-muted-foreground">Action items</dt>
          <dd className="text-foreground">
            {preview.result.actions.length > 0 ? preview.result.actions.join(' · ') : 'none found'}
          </dd>
          <dt className="text-muted-foreground">Summary</dt>
          <dd className="text-foreground">{preview.result.summaryPreview ?? 'none found'}</dd>
        </dl>
      ) : null}
    </div>
  )
}
