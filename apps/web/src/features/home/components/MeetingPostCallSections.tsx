import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import type { MeetingRecording } from '@/features/home/services/meeting-workspace-api'

function uniqueRecordingSummaries(recordings: MeetingRecording[]): string[] {
  return Array.from(
    new Set(
      recordings
        .map((recording) => recording.provider_summary?.trim())
        .filter((summary): summary is string => Boolean(summary)),
    ),
  )
}

/** Post-call recap only — Notes live in their own always-editable section. */
export function MeetingPostCallSections({ recordings }: { recordings: MeetingRecording[] }) {
  const summaries = uniqueRecordingSummaries(recordings)

  return (
    <div className="gap-spacing-3 flex flex-col">
      {summaries.length > 0 ? (
        summaries.map((summary) => (
          <div key={summary} className="body-4">
            <MarkdownRenderer compact muted>
              {summary}
            </MarkdownRenderer>
          </div>
        ))
      ) : (
        <p className="body-4 text-muted-foreground">No recap is available yet.</p>
      )}
    </div>
  )
}
