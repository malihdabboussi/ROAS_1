'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Bot, Brain, CheckCircle2, RefreshCw, X } from 'lucide-react'
import { SuggestionDetail } from '@/features/home/components/SuggestionReviewDetails'
import {
  getSuggestionSourceLabel,
  getSuggestionStatusLabel,
  isJaimeActionableStatus,
  type SuggestionReviewItem,
} from '@/features/home/lib/suggestion-review'

interface SuggestionReviewModalProps {
  open: boolean
  items: SuggestionReviewItem[]
  selectedId: string | null
  busyId: string | null
  onApplyJaime: (item: SuggestionReviewItem & { source: 'jaime' }) => void
  onAtlasDecision: (
    item: SuggestionReviewItem & { source: 'atlas' },
    decision: 'approve' | 'reject',
  ) => void
  onDismissJaime: (item: SuggestionReviewItem & { source: 'jaime' }) => void
  onEvaluateJaime: (item: SuggestionReviewItem & { source: 'jaime' }) => void
  onOpenChange: (open: boolean) => void
  onSelect: (id: string) => void
}

function SuggestionIcon({ source }: { source: SuggestionReviewItem['source'] }) {
  const Icon = source === 'atlas' ? Brain : Bot
  return <Icon className="icon-sm text-muted-foreground shrink-0" />
}

function ModalActions({
  busyId,
  item,
  onApplyJaime,
  onAtlasDecision,
  onDismissJaime,
  onEvaluateJaime,
  onOpenChange,
}: Pick<
  SuggestionReviewModalProps,
  | 'busyId'
  | 'onApplyJaime'
  | 'onAtlasDecision'
  | 'onDismissJaime'
  | 'onEvaluateJaime'
  | 'onOpenChange'
> & {
  item: SuggestionReviewItem | null
}) {
  if (!item) return null
  const busy = busyId === item.id

  if (item.source === 'atlas') {
    const reviewed = getSuggestionStatusLabel(item) !== 'Open'
    return (
      <>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={busy}
          className="button-default button-glass-neutral font-medium disabled:opacity-50"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => onAtlasDecision(item, 'reject')}
          disabled={busy || reviewed}
          className="button-default button-glass-neutral font-medium disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => onAtlasDecision(item, 'approve')}
          disabled={busy || reviewed}
          className="button-default button-glass-primary font-medium disabled:opacity-50"
        >
          Approve
        </button>
      </>
    )
  }

  const status = item.recommendation.status
  const canApply = status === 'ready'
  const canEvaluate = status === 'experiment_running'

  return (
    <>
      <button
        type="button"
        onClick={() => onDismissJaime(item)}
        disabled={busy || !isJaimeActionableStatus(status)}
        className="button-default button-glass-neutral font-medium disabled:opacity-50"
      >
        Dismiss
      </button>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        disabled={busy}
        className="button-default button-glass-neutral font-medium disabled:opacity-50"
      >
        Close
      </button>
      {canEvaluate ? (
        <button
          type="button"
          onClick={() => onEvaluateJaime(item)}
          disabled={busy}
          className="button-default button-glass-primary gap-spacing-2 inline-flex items-center font-medium disabled:opacity-50"
        >
          <RefreshCw className="icon-sm" />
          Check experiment
        </button>
      ) : null}
      {canApply ? (
        <button
          type="button"
          onClick={() => onApplyJaime(item)}
          disabled={busy}
          className="button-default button-glass-primary gap-spacing-2 inline-flex items-center font-medium disabled:opacity-50"
        >
          <CheckCircle2 className="icon-sm" />
          Apply
        </button>
      ) : null}
    </>
  )
}

export function SuggestionReviewModal({
  open,
  items,
  selectedId,
  busyId,
  onApplyJaime,
  onAtlasDecision,
  onDismissJaime,
  onEvaluateJaime,
  onOpenChange,
  onSelect,
}: SuggestionReviewModalProps) {
  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0] ?? null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 border-border bg-card flex max-h-full w-full max-w-4xl flex-col overflow-hidden border shadow-2xl">
            <div className="px-spacing-6 pt-spacing-5 pb-spacing-3 shrink-0">
              <div className="gap-spacing-3 flex items-start justify-between">
                <div className="min-w-0">
                  <DialogPrimitive.Title className="title-h6 text-foreground">
                    Review suggestions
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                    Review what Jaime and Atlas noticed before changes are applied.
                  </DialogPrimitive.Description>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="btn-icon-bare shrink-0"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            </div>

            <div className="border-border flex min-h-0 flex-1 flex-col overflow-hidden border-t md:flex-row">
              <aside className="border-border max-h-64 shrink-0 overflow-y-auto border-b md:max-h-none md:w-80 md:border-b-0 md:border-r">
                <div className="p-spacing-3 space-y-spacing-1">
                  {items.map((item) => {
                    const selected = selectedItem?.id === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelect(item.id)}
                        className={`rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-2 body-3 flex w-full items-start text-left transition-colors ${
                          selected
                            ? 'nav-glass-selected-purple nav-glass-text-purple'
                            : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                        }`}
                      >
                        <SuggestionIcon source={item.source} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.title}</span>
                          <span className="body-4 text-muted-foreground mt-spacing-1 block truncate">
                            {getSuggestionSourceLabel(item.source)} ·{' '}
                            {getSuggestionStatusLabel(item)}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </aside>

              <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
                {selectedItem ? <SuggestionDetail item={selectedItem} /> : null}
              </main>
            </div>

            <div className="border-border px-spacing-6 py-spacing-3 gap-spacing-2 flex shrink-0 flex-wrap items-center justify-end border-t">
              <ModalActions
                busyId={busyId}
                item={selectedItem}
                onApplyJaime={onApplyJaime}
                onAtlasDecision={onAtlasDecision}
                onDismissJaime={onDismissJaime}
                onEvaluateJaime={onEvaluateJaime}
                onOpenChange={onOpenChange}
              />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
