'use client'

import { useRef } from 'react'
import { ArrowLeft, Check, Loader2, Redo2, Undo2 } from 'lucide-react'
import { FunnelDesignControls } from '@/components/artifacts'
import type { FunnelPageBundle } from '@/features/studio/services/artifact-preview.service'
import {
  useFunnelDesignChatStore,
  type FunnelDesignSaveOptions,
} from '@/features/studio/store/use-funnel-design-chat-store'
import { useFunnelFullModeStore } from '@/features/studio/store/use-funnel-full-mode-store'
import type { FunnelElementTrace } from '@/features/studio/types'
import { cn } from '@/lib/utils/cn'

interface FunnelDesignChatViewProps {
  funnelName: string
  bundle: FunnelPageBundle | null
  selectedTrace: FunnelElementTrace | null
  onSaveFile: (path: string, content: string, options?: FunnelDesignSaveOptions) => void
  onBack: () => void
}

export function FunnelDesignChatView({
  funnelName,
  bundle,
  selectedTrace,
  onSaveFile,
  onBack,
}: FunnelDesignChatViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const undoStackLength = useFunnelDesignChatStore((s) => s.undoStack.length)
  const redoStackLength = useFunnelDesignChatStore((s) => s.redoStack.length)
  const undoDesignEdit = useFunnelDesignChatStore((s) => s.undo)
  const redoDesignEdit = useFunnelDesignChatStore((s) => s.redo)
  const saveStatus = useFunnelDesignChatStore((s) => s.saveStatus)
  const setSelectedTrace = useFunnelDesignChatStore((s) => s.setSelectedTrace)
  const setLiveStyles = useFunnelFullModeStore((s) => s.setLiveStyles)
  const historyButtonClass =
    'text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 hover:bg-hover-subtle flex shrink-0 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40'

  return (
    <div className="surface-bg flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="border-border pt-spacing-2 pb-spacing-1 relative shrink-0 border-b px-3 md:px-4">
        <div className="gap-spacing-2 mx-auto flex w-full max-w-3xl items-center">
          <button
            type="button"
            onClick={onBack}
            className={historyButtonClass}
            aria-label="Back to conversation"
          >
            <ArrowLeft className="icon-sm" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="body-2 text-foreground font-semibold">Design</p>
            <p className="body-4 text-muted-foreground truncate">{funnelName}</p>
          </div>
          <div className="gap-spacing-1 flex shrink-0 items-center">
            <button
              type="button"
              onClick={undoDesignEdit}
              disabled={undoStackLength === 0}
              className={historyButtonClass}
              aria-label="Undo design edit"
            >
              <Undo2 className="icon-sm" aria-hidden />
            </button>
            <button
              type="button"
              onClick={redoDesignEdit}
              disabled={redoStackLength === 0}
              className={historyButtonClass}
              aria-label="Redo design edit"
            >
              <Redo2 className="icon-sm" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 md:px-4">
        <div
          className={cn(
            'mx-auto w-full max-w-3xl',
            selectedTrace ? 'py-spacing-4' : 'flex min-h-full flex-col',
          )}
        >
          <FunnelDesignControls
            bundle={bundle}
            selectedTrace={selectedTrace}
            onSaveFile={onSaveFile}
            onLiveStylesChange={setLiveStyles}
            onSelectedTraceChange={setSelectedTrace}
          />
        </div>
      </div>

      <div className="border-border py-spacing-3 shrink-0 border-t px-3 md:px-4">
        <div className="gap-spacing-1 text-muted-foreground mx-auto flex w-full max-w-3xl items-center justify-center">
          {saveStatus === 'saving' ? (
            <Loader2 className="icon-xs animate-spin" />
          ) : saveStatus === 'saved' ? (
            <Check className="icon-xs text-success" />
          ) : null}
          <p className="typo-caption">
            {saveStatus === 'saving'
              ? 'Saving changes...'
              : saveStatus === 'error'
                ? 'Some changes could not be saved'
                : saveStatus === 'saved'
                  ? 'All changes saved'
                  : 'Changes save automatically'}
          </p>
        </div>
      </div>
    </div>
  )
}
