'use client'

import type { Dispatch, SetStateAction } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Check, Download, Loader2, X } from 'lucide-react'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import type { FathomMeeting } from '../../services/user-brain-import.service'
import { formatMeetingTime } from './utils'

export interface FathomImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loadingFathom: boolean
  sortedFathom: FathomMeeting[]
  selectedFathomIds: Set<string>
  setSelectedFathomIds: Dispatch<SetStateAction<Set<string>>>
  toggleFathomSelection: (id: string) => void
  getMeetingId: (m: FathomMeeting) => string
  fathomNextCursor: string | undefined
  loadingMoreFathom: boolean
  onLoadMore: () => void
  onLoadAll: () => void
  importingBatch: boolean
  onBatchImport: () => void
}

export function FathomImportModal({
  open,
  onOpenChange,
  loadingFathom,
  sortedFathom,
  selectedFathomIds,
  setSelectedFathomIds,
  toggleFathomSelection,
  getMeetingId,
  fathomNextCursor,
  loadingMoreFathom,
  onLoadMore,
  onLoadAll,
  importingBatch,
  onBatchImport,
}: FathomImportModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-layer-3 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false)
          }}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Import Fathom Calls</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="relative flex h-full w-full max-w-none flex-col sm:h-auto sm:max-h-[85vh] sm:max-w-2xl">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2 shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="title-h6">FATHOM CALLS</h2>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="btn-icon-bare"
                    aria-label="Close"
                  >
                    <X className="icon-xs" />
                  </button>
                </div>
                <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                  Select calls to import. Each runs crystallization and memory extraction.
                </DialogPrimitive.Description>
              </div>
              <div className="scrollbar-thin px-spacing-6 py-spacing-4 space-y-spacing-2 min-h-0 flex-1 overflow-y-auto sm:min-h-[320px]">
                {loadingFathom ? (
                  <div className="flex h-full min-h-[280px] items-center justify-center">
                    <div className="h-10 w-10">
                      <VibeyChatOrb state="processing" />
                    </div>
                  </div>
                ) : sortedFathom.length === 0 ? (
                  <p className="body-3 text-muted-foreground py-spacing-4 text-center">
                    No Fathom calls found.
                  </p>
                ) : (
                  <>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedFathomIds.size === sortedFathom.length) {
                            setSelectedFathomIds(new Set())
                          } else {
                            setSelectedFathomIds(new Set(sortedFathom.map((m) => getMeetingId(m))))
                          }
                        }}
                        className="body-4 text-muted-foreground hover:text-foreground flex items-center gap-2"
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            selectedFathomIds.size === sortedFathom.length &&
                            sortedFathom.length > 0
                              ? 'dropdown-sort-option-selected'
                              : 'border-border'
                          }`}
                        >
                          {selectedFathomIds.size === sortedFathom.length &&
                            sortedFathom.length > 0 && (
                              <Check className="text-muted-foreground h-3 w-3" />
                            )}
                        </div>
                        Select all
                      </button>
                    </div>
                    {sortedFathom.map((meeting) => {
                      const meetingId = getMeetingId(meeting)
                      const isSelected = selectedFathomIds.has(meetingId)
                      return (
                        <button
                          type="button"
                          key={meetingId}
                          onClick={() => toggleFathomSelection(meetingId)}
                          className={`rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-3 flex w-full items-center text-left transition-colors ${
                            isSelected
                              ? 'card-glass-blue'
                              : 'border-border bg-muted/20 hover:bg-muted/30 border'
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              isSelected ? 'dropdown-sort-option-selected' : 'border-border'
                            }`}
                          >
                            {isSelected && <Check className="text-muted-foreground h-3 w-3" />}
                          </div>
                          <div className="min-w-0">
                            <p className="body-3 text-foreground truncate font-medium">
                              {meeting.title || meeting.meeting_title || 'Untitled Meeting'}
                            </p>
                            <p className="typo-caption text-muted-foreground">
                              {formatMeetingTime(meeting.created_at)}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                    {fathomNextCursor && (
                      <div className="py-spacing-2 flex w-full items-center justify-center gap-3">
                        {loadingMoreFathom ? (
                          <span className="body-3 text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading...
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={onLoadMore}
                              className="body-3 text-muted-foreground hover:text-foreground"
                            >
                              Load more
                            </button>
                            <span className="text-muted-foreground/40">·</span>
                            <button
                              type="button"
                              onClick={onLoadAll}
                              className="body-3 text-muted-foreground hover:text-foreground"
                            >
                              Load all
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              {selectedFathomIds.size > 0 && (
                <div className="border-border px-spacing-6 py-spacing-3 shrink-0 border-t">
                  <button
                    type="button"
                    disabled={importingBatch}
                    onClick={onBatchImport}
                    className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
                  >
                    {importingBatch ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {importingBatch ? 'Importing...' : `Import ${selectedFathomIds.size} Selected`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
