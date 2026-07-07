'use client'

import { Mail, Send } from 'lucide-react'
import { EmailPreviewEditor } from '@/components/artifacts'
import type { ContactMergeFieldRow } from '../../utils/contact-merge-fields'
import { htmlToPlainText } from './ContactCommunicationPanel.helpers'

interface ContactCommunicationComposerProps {
  composerOpen: boolean
  subject: string
  draft: string
  sending: boolean
  mergeFields: ContactMergeFieldRow[]
  onDraftChange: (draft: string) => void
  onSend: () => void
  onSubjectChange: (subject: string) => void
  onToggleComposer: () => void
}

export function ContactCommunicationComposer({
  composerOpen,
  subject,
  draft,
  sending,
  mergeFields,
  onDraftChange,
  onSend,
  onSubjectChange,
  onToggleComposer,
}: ContactCommunicationComposerProps) {
  return (
    <div className="px-spacing-4 py-spacing-3">
      {composerOpen ? (
        <div className="border-comms-inner mx-auto mb-2 w-full max-w-3xl overflow-hidden rounded-lg">
          <div className="border-comms-inner-b p-1">
            <input
              type="text"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="Email subject"
              className="h-6 w-full rounded-md bg-transparent px-2 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:bg-hover-subtle focus:bg-hover-subtle"
            />
          </div>

          <div className="min-h-[220px] min-w-0">
            <EmailPreviewEditor
              content={draft}
              onContentChange={onDraftChange}
              placeholder={'Write email body\u2026'}
              className="h-full max-h-[min(420px,40vh)] min-h-[220px] flex-col overflow-hidden border-0 [&>div:last-child]:border-t-0"
              mergeFields={mergeFields}
              footer={
                <button
                  type="button"
                  onClick={onSend}
                  disabled={!htmlToPlainText(draft) || sending}
                  className="button-glass-neutral inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
                  aria-label="Send email"
                >
                  <Send className="icon-sm" />
                </button>
              }
            />
          </div>
        </div>
      ) : null}

      <div className="border-comms-inner px-spacing-2 py-spacing-1-5 flex w-full items-center justify-center gap-1 rounded-lg">
        <button
          type="button"
          onClick={onToggleComposer}
          aria-pressed={composerOpen}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors hover:bg-hover-subtle ${
            composerOpen ? 'bg-hover-subtle text-foreground' : 'text-muted-foreground'
          }`}
        >
          <Mail className="icon-sm" />
          Email
        </button>
      </div>
    </div>
  )
}
