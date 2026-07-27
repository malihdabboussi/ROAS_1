'use client'

import { ChevronLeft, Loader2 } from 'lucide-react'
import type { PageGraderTaskTypeOption } from '../../lib/page-grader-client-tag'
import type { PageGraderAssigneeOption } from '../../lib/page-grader-send-preview'
import type { PageGraderClient } from '../../services/page-grader-send.service'

export function PageGraderBulkPreviewStep({
  selectedClient,
  selectedTaskType,
  selectedAssignee,
  previews,
  dueDate,
  setDueDate,
  note,
  setNote,
  campaignId,
  campaignName,
  hasExistingCampaignMap,
  rememberCampaign,
  setRememberCampaign,
  sending,
  onBack,
  onSend,
}: {
  selectedClient: PageGraderClient | null
  selectedTaskType: PageGraderTaskTypeOption | null
  selectedAssignee: PageGraderAssigneeOption | null
  previews: Array<{
    spaceItemId: string
    title: string
    priority?: string | null
    dueDate?: string | null
    description: string
  }>
  dueDate: string
  setDueDate: (v: string) => void
  note: string
  setNote: (v: string) => void
  campaignId: string | null
  campaignName: string | null
  hasExistingCampaignMap: boolean
  rememberCampaign: boolean
  setRememberCampaign: (v: boolean) => void
  sending: boolean
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
            {selectedClient?.name} · {selectedTaskType?.label} ·{' '}
            {selectedAssignee?.name ?? 'Unassigned'}
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
            onChange={(e) => setDueDate(e.target.value)}
            className="border-border bg-background text-foreground w-full rounded-md border px-2 py-1.5 text-xs outline-none"
          />
          <p className="text-muted-foreground text-[10px]">
            Saves on the ROAS task and The ROAS Portal deadline.
          </p>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note (saved on ROAS task + The ROAS Portal)"
          rows={2}
          className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-md border px-2 py-1.5 text-xs outline-none"
        />
        {campaignId && campaignName ? (
          <label className="text-muted-foreground flex items-start gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={rememberCampaign}
              onChange={(e) => setRememberCampaign(e.target.checked)}
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
            disabled={!selectedClient || !selectedTaskType || sending}
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
