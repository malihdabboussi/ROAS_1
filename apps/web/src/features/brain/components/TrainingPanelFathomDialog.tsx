'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Check, Download, Loader2, X } from 'lucide-react'
import {
  formatTrainingPanelMeetingTime,
  getTrainingPanelMeetingId,
} from '../hooks/training-panel-call-import-helpers'
import type { FathomMeeting } from '../services/user-brain-import.service'

interface TrainingPanelFathomDialogProps {
  importingBatch: boolean
  loading: boolean
  loadingMore: boolean
  meetings: FathomMeeting[]
  nextCursor?: string
  onBatchImport: () => void | Promise<void>
  onLoadAll: () => void | Promise<void>
  onLoadMore: () => void | Promise<void>
  onOpenChange: (open: boolean) => void
  onToggleAll: () => void
  onToggleSelection: (meetingId: string) => void
  open: boolean
  selectedIds: Set<string>
}

export function TrainingPanelFathomDialog({
  importingBatch,
  loading,
  loadingMore,
  meetings,
  nextCursor,
  onBatchImport,
  onLoadAll,
  onLoadMore,
  onOpenChange,
  onToggleAll,
  onToggleSelection,
  open,
  selectedIds,
}: TrainingPanelFathomDialogProps) {
  const allSelected = selectedIds.size === meetings.length && meetings.length > 0

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
                  >
                    <X className="icon-xs" />
                  </button>
                </div>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  Select calls to import. Each runs crystallization and memory extraction.
                </p>
              </div>
              <div className="scrollbar-thin px-spacing-6 py-spacing-4 space-y-spacing-2 min-h-0 flex-1 overflow-y-auto sm:min-h-[320px]">
                {loading ? (
                  <div className="flex h-full min-h-[280px] items-center justify-center">
                    <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                  </div>
                ) : meetings.length === 0 ? (
                  <p className="body-3 text-muted-foreground py-spacing-4 text-center">
                    No Fathom calls found.
                  </p>
                ) : (
                  <>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={onToggleAll}
                        className="body-4 text-muted-foreground hover:text-foreground flex items-center gap-2"
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            allSelected ? 'dropdown-sort-option-selected' : 'border-border'
                          }`}
                        >
                          {allSelected && <Check className="text-muted-foreground h-3 w-3" />}
                        </div>
                        Select all
                      </button>
                    </div>
                    {meetings.map((meeting) => {
                      const meetingId = getTrainingPanelMeetingId(meeting)
                      const isSelected = selectedIds.has(meetingId)
                      return (
                        <div
                          key={meetingId}
                          onClick={() => onToggleSelection(meetingId)}
                          className={`rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-3 flex cursor-pointer items-center transition-colors ${
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
                              {formatTrainingPanelMeetingTime(meeting.created_at)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    {nextCursor && (
                      <div className="py-spacing-2 flex w-full items-center justify-center gap-3">
                        {loadingMore ? (
                          <span className="body-3 text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading...
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void onLoadMore()}
                              className="body-3 text-muted-foreground hover:text-foreground"
                            >
                              Load more
                            </button>
                            <span className="text-muted-foreground/40">·</span>
                            <button
                              type="button"
                              onClick={() => void onLoadAll()}
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
              {selectedIds.size > 0 && (
                <div className="border-border px-spacing-6 py-spacing-3 shrink-0 border-t">
                  <button
                    type="button"
                    disabled={importingBatch}
                    onClick={() => void onBatchImport()}
                    className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
                  >
                    {importingBatch ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {importingBatch ? 'Importing...' : `Import ${selectedIds.size} Selected`}
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
