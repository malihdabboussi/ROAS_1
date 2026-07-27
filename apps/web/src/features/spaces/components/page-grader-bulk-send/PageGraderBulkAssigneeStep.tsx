'use client'

import { Check, ChevronLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { PageGraderAssigneeOption } from '../../lib/page-grader-send-preview'

export function PageGraderBulkAssigneeStep({
  assigneeQuery,
  setAssigneeQuery,
  assigneesLoading,
  filteredAssignees,
  selectedAssigneeId,
  setSelectedAssigneeId,
  selectedAssignee,
  onBack,
  onContinue,
}: {
  assigneeQuery: string
  setAssigneeQuery: (v: string) => void
  assigneesLoading: boolean
  filteredAssignees: PageGraderAssigneeOption[]
  selectedAssigneeId: string | null
  setSelectedAssigneeId: (id: string | null) => void
  selectedAssignee: PageGraderAssigneeOption | null
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <>
      <div className="border-border border-b px-3 py-2">
        <input
          type="search"
          value={assigneeQuery}
          onChange={(e) => setAssigneeQuery(e.target.value)}
          placeholder="Search assignees"
          className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-2 py-1.5 text-xs outline-none"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {assigneesLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 px-2 py-3 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading assignees…
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setSelectedAssigneeId(null)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs',
                selectedAssigneeId == null
                  ? 'bg-secondary text-foreground'
                  : 'text-foreground hover:bg-hover-subtle',
              )}
            >
              <span className="min-w-0 flex-1 truncate">Unassigned</span>
              {selectedAssigneeId == null ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>
            {filteredAssignees.map((person) => {
              const selected = person.id === selectedAssigneeId
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => setSelectedAssigneeId(person.id)}
                  className={cn(
                    'flex w-full flex-col rounded-md px-2 py-1.5 text-left',
                    selected
                      ? 'bg-secondary text-foreground'
                      : 'text-foreground hover:bg-hover-subtle',
                  )}
                >
                  <span className="flex items-center gap-2 text-xs font-medium">
                    <span className="min-w-0 flex-1 truncate">{person.name}</span>
                    {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                  </span>
                  {person.email ? (
                    <span className="text-muted-foreground truncate text-[11px]">
                      {person.email}
                    </span>
                  ) : null}
                </button>
              )
            })}
            {!assigneesLoading && filteredAssignees.length === 0 ? (
              <p className="text-muted-foreground px-2 py-3 text-xs">
                No ROAS Portal people match. Leave Unassigned or clear search.
              </p>
            ) : null}
          </>
        )}
      </div>
      <div className="border-border border-t px-3 py-2">
        <div className="bg-secondary mb-2 rounded-md px-2 py-1.5">
          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            Selected assignee
          </p>
          <p className="text-foreground truncate text-xs font-medium">
            {selectedAssignee?.name ?? 'Unassigned'}
          </p>
        </div>
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
            disabled={assigneesLoading}
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
