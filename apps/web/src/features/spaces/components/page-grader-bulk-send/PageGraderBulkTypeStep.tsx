'use client'

import { Check, ChevronLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { PageGraderTaskTypeOption } from '../../lib/page-grader-client-tag'
import type { PageGraderClient } from '../../services/page-grader-send.service'

export function PageGraderBulkTypeStep({
  selectedClient,
  taskTypesLoading,
  taskTypes,
  selectedTaskTypeId,
  setSelectedTaskTypeId,
  selectedTaskType,
  onBack,
  onContinue,
}: {
  selectedClient: PageGraderClient | null
  taskTypesLoading: boolean
  taskTypes: PageGraderTaskTypeOption[]
  selectedTaskTypeId: string | null
  setSelectedTaskTypeId: (id: string) => void
  selectedTaskType: PageGraderTaskTypeOption | null
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <>
      <div className="border-border space-y-spacing-2 border-b px-3 py-2">
        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
          Client
        </p>
        <p className="text-foreground truncate text-xs font-medium">
          {selectedClient?.name ?? 'Selected client'}
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1 py-1">
        {taskTypesLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 px-2 py-3 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading request types…
          </div>
        ) : (
          taskTypes.map((kind) => {
            const selected = selectedTaskTypeId === kind.id
            return (
              <button
                key={kind.id}
                type="button"
                onClick={() => setSelectedTaskTypeId(kind.id)}
                className={cn(
                  'flex w-full flex-col rounded-md px-2 py-2 text-left',
                  selected
                    ? 'bg-secondary text-foreground'
                    : 'text-foreground hover:bg-hover-subtle',
                )}
              >
                <span className="flex items-center gap-2 text-xs font-medium">
                  <span className="min-w-0 flex-1">{kind.label}</span>
                  {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                </span>
                {kind.hint ? (
                  <span className="text-muted-foreground mt-0.5 text-[11px]">{kind.hint}</span>
                ) : null}
              </button>
            )
          })
        )}
      </div>
      <div className="border-border border-t px-3 py-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:bg-hover-subtle flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
          <button
            type="button"
            disabled={!selectedTaskType || taskTypesLoading}
            onClick={onContinue}
            className="button-glass-accent flex-1 rounded-md px-2 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  )
}
