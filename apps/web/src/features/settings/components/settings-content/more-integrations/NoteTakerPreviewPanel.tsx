'use client'

import type { NoteTakerPreviewResult } from '@/lib/integrations/meeting-provider-definitions'

type Props = {
  hasSample: boolean
  previewing: boolean
  preview: NoteTakerPreviewResult | null
  previewError: string | null
  onRunPreview: () => void
}

/** Run the current mapping over the sample pasted at the top of the form and show what would be imported. */
export function NoteTakerPreviewPanel({
  hasSample,
  previewing,
  preview,
  previewError,
  onRunPreview,
}: Props) {
  return (
    <div className="space-y-spacing-3">
      <div>
        <p className="body-2 text-foreground font-medium">Check the mapping</p>
        <p className="body-4 text-muted-foreground">
          Runs the paths above over the sample delivery pasted at the top. Nothing is saved by the
          test.
        </p>
      </div>
      <div className="gap-spacing-2 flex items-center">
        <button
          type="button"
          onClick={onRunPreview}
          disabled={previewing || !hasSample}
          className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 disabled:opacity-50"
        >
          {previewing ? 'Testing…' : 'Test mapping'}
        </button>
        {!hasSample ? (
          <span className="body-4 text-muted-foreground">Paste a sample delivery first.</span>
        ) : null}
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
