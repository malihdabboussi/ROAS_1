import type { MutableRefObject, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ChatInput as MissionCaptureChatInput } from '@/components/chat/ChatInputAdapter'
import type { DocumentAttachment } from '@/lib/chat/document-attachments'

const NEW_MISSION_PLACEHOLDER = 'Tell me what to run...'

interface MissionCaptureModalProps {
  campaignId: string
  submitting: boolean
  creditsExhausted: boolean
  capabilityWarning: string | null
  modalRef: RefObject<HTMLDivElement | null>
  composerMirrorRef: MutableRefObject<string>
  onClose: () => void
  onHireClick: () => void
  onSend: (content: string, documents?: DocumentAttachment[]) => void
}

export function MissionCaptureModal({
  campaignId,
  submitting,
  creditsExhausted,
  capabilityWarning,
  modalRef,
  composerMirrorRef,
  onClose,
  onHireClick,
  onSend,
}: MissionCaptureModalProps) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="z-modal-backdrop bg-modal-overlay fixed inset-0" onClick={onClose} />
      <div className="z-modal-content p-spacing-4 fixed inset-0 flex items-center justify-center overflow-y-auto">
        <div
          ref={modalRef}
          className="surface-card wizard-container-border rounded-spacing-4 flex w-full max-w-2xl flex-col overflow-visible border shadow-2xl"
        >
          <div className="px-spacing-5 pt-spacing-5 pb-spacing-3 shrink-0">
            <div className="gap-spacing-3 flex items-start justify-between">
              <h2 className="title-h6 text-foreground min-w-0 flex-1">New mission</h2>
              <button
                type="button"
                onClick={onClose}
                className="btn-icon-bare shrink-0"
                aria-label="Close"
              >
                <X className="icon-xs" />
              </button>
            </div>
          </div>
          <div className="px-spacing-5 pb-spacing-5 space-y-spacing-2">
            <MissionCaptureChatInput
              onSend={(content, documents) => onSend(content, documents)}
              disabled={submitting}
              creditsExhausted={creditsExhausted}
              placeholder={NEW_MISSION_PLACEHOLDER}
              campaignId={campaignId}
              scopeKind="campaign"
              agentKey="vibey"
              draftContextKeyOverride={`space-mission-capture:${campaignId}`}
              consumePendingComposerText={false}
              composerMirrorRef={composerMirrorRef}
              portalTargetRef={modalRef}
            />
            {capabilityWarning ? (
              <div className="border-border rounded-spacing-2 bg-warning/10 px-spacing-3 py-spacing-2 flex items-center justify-between border">
                <p className="body-4 text-warning">{capabilityWarning}</p>
                <button
                  type="button"
                  onClick={onHireClick}
                  className="button-glass-neutral rounded-spacing-2 px-spacing-2 py-spacing-1 body-4"
                >
                  Hire & Assign
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
