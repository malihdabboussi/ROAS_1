'use client'

import { Check, ChevronLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { PageGraderTaskTypeOption } from '../../lib/page-grader-client-tag'
import type { PageGraderAssigneeOption } from '../../lib/page-grader-send-preview'
import type { PageGraderClient } from '../../services/page-grader-send.service'

export function PageGraderBulkSendAssigneeStep({
  assigneeQuery,
  onAssigneeQueryChange,
  assigneesLoading,
  filteredAssignees,
  selectedAssigneeId,
  selectedAssignee,
  onSelectAssignee,
  onBack,
  onContinue,
}: {
  assigneeQuery: string
  onAssigneeQueryChange: (value: string) => void
  assigneesLoading: boolean
  filteredAssignees: PageGraderAssigneeOption[]
  selectedAssigneeId: string | null
  selectedAssignee: PageGraderAssigneeOption | null
  onSelectAssignee: (id: string | null) => void
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <>
      <div className="border-border border-b px-3 py-2">
        <input
          type="search"
          value={assigneeQuery}
          onChange={(e) => onAssigneeQueryChange(e.target.value)}
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
              onClick={() => onSelectAssignee(null)}
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
                  onClick={() => onSelectAssignee(person.id)}
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

export function PageGraderBulkSendPreviewStep({
  selectedClientName,
  selectedTaskTypeLabel,
  selectedAssigneeName,
  previews,
  dueDate,
  onDueDateChange,
  note,
  onNoteChange,
  campaignId,
  campaignName,
  rememberCampaign,
  onRememberCampaignChange,
  hasExistingCampaignMap,
  sending,
  canSend,
  onBack,
  onSend,
}: {
  selectedClientName: string
  selectedTaskTypeLabel: string
  selectedAssigneeName: string
  previews: Array<{
    spaceItemId: string
    title: string
    priority?: string | null
    dueDate?: string | null
    description: string
  }>
  dueDate: string
  onDueDateChange: (value: string) => void
  note: string
  onNoteChange: (value: string) => void
  campaignId: string | null
  campaignName: string | null
  rememberCampaign: boolean
  onRememberCampaignChange: (value: boolean) => void
  hasExistingCampaignMap: boolean
  sending: boolean
  canSend: boolean
  onBack: () => void
  onSend: () => void
}) {
  return (
    <>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
        <div className="space-y-1">
          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            Summary
          </p>
          <p className="text-foreground text-xs">
            {selectedClientName} · {selectedTaskTypeLabel} · {selectedAssigneeName}
          </p>
        </div>
        {previews.map((row) => (
          <div key={row.spaceItemId} className="border-border rounded-md border px-2 py-2">
            <p className="text-foreground text-xs font-medium">{row.title}</p>
            {row.priority || row.dueDate ? (
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {[row.priority, row.dueDate].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            <p className="text-muted-foreground mt-1 line-clamp-4 whitespace-pre-wrap text-[11px]">
              {row.description || 'No description/notes on this Space task.'}
            </p>
          </div>
        ))}
        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
            Deadline
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => onDueDateChange(e.target.value)}
            className="border-border bg-background text-foreground w-full rounded-md border px-2 py-1.5 text-xs outline-none"
          />
          <p className="text-muted-foreground text-[10px]">
            Saves on the ROAS task and The ROAS Portal deadline.
          </p>
        </div>
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Optional note (saved on ROAS task + The ROAS Portal)"
          rows={2}
          className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-md border px-2 py-1.5 text-xs outline-none"
        />
        {campaignId && campaignName ? (
          <label className="text-muted-foreground flex items-start gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={rememberCampaign}
              onChange={(e) => onRememberCampaignChange(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              {hasExistingCampaignMap
                ? `Update map: ${campaignName} → this client`
                : `Map ${campaignName} campaign to this client`}
            </span>
          </label>
        ) : null}
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
            disabled={!canSend || sending}
            onClick={onSend}
            className="button-glass-accent flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </>
  )
}
