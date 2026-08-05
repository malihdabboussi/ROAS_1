'use client'

import { FileText } from 'lucide-react'
import type { MeetingDeliverable } from '@/features/home/services/meeting-workspace-api'
import { openDocumentInShell } from '@/lib/artifacts'

function SectionTitle({ children, count }: { children: string; count?: number }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="body-3 text-foreground font-semibold">{children}</h2>
      {typeof count === 'number' ? (
        <span className="badge-glass badge-glass-muted">{count}</span>
      ) : null}
    </div>
  )
}

export function MeetingWorkspaceAttachments({
  spaceId,
  deliverables,
  loading,
}: {
  spaceId: string
  deliverables: MeetingDeliverable[]
  loading: boolean
}) {
  return (
    <section className="gap-spacing-3 flex flex-col">
      <SectionTitle count={deliverables.length}>Attachments</SectionTitle>
      <div className="gap-spacing-2 flex flex-col">
        {deliverables.map((deliverable) => (
          <button
            key={deliverable.id}
            type="button"
            onClick={() =>
              openDocumentInShell({
                documentId: deliverable.id,
                spaceItemId: deliverable.id,
                spaceId,
                title: deliverable.title,
              })
            }
            className="section-card hover:bg-hover-subtle gap-spacing-2 p-spacing-3 flex w-full items-center text-left"
          >
            <FileText className="icon-sm text-primary shrink-0" aria-hidden />
            <span className="body-3 text-foreground truncate">{deliverable.title}</span>
          </button>
        ))}
        {!loading && deliverables.length === 0 ? (
          <p className="body-4 text-muted-foreground">No attachments yet.</p>
        ) : null}
      </div>
    </section>
  )
}
