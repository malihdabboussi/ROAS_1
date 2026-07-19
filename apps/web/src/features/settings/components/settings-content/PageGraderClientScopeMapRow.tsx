'use client'

import { Brain } from 'lucide-react'
import type { Campaign } from '@/lib/campaigns/campaign-api'
import type { SpaceSummary } from '@/lib/spaces/spaces-api'
import type { PageGraderClient } from '../../services/page-grader-scope-api'

type DraftRow = {
  campaignId: string
  spaceId: string
}

export function PageGraderClientScopeMapRow({
  client,
  row,
  campaigns,
  campaignSpaces,
  isImporting,
  onDraftChange,
  onImportBrain,
}: {
  client: PageGraderClient
  row: DraftRow
  campaigns: Campaign[]
  campaignSpaces: SpaceSummary[]
  isImporting: boolean
  onDraftChange: (clientId: string, next: DraftRow) => void
  onImportBrain: (client: PageGraderClient) => void
}) {
  const isMapped = Boolean(row.campaignId)

  return (
    <div className="border-border space-y-2 rounded-lg border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="body-3 text-foreground min-w-0 truncate font-medium">{client.name}</p>
        <button
          type="button"
          onClick={() => onImportBrain(client)}
          disabled={isImporting}
          className="button-glass-accent inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium disabled:opacity-50"
          title={
            isMapped
              ? "Import this Page Grader client's intelligence into the mapped ROAS campaign"
              : 'Create a campaign + space named after this client, then import its brain'
          }
        >
          <Brain className="h-3 w-3" />
          {isImporting
            ? isMapped
              ? 'Importing'
              : 'Creating…'
            : isMapped
              ? 'Import brain'
              : 'Create & import brain'}
        </button>
      </div>
      <label className="block">
        <span className="typo-caption text-muted-foreground">Campaign</span>
        <select
          value={row.campaignId}
          onChange={(e) => {
            onDraftChange(client.id, { campaignId: e.target.value, spaceId: '' })
          }}
          className="border-border bg-background text-foreground mt-1 w-full rounded-md border px-2 py-1.5 text-xs outline-none"
        >
          <option value="">Not mapped</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
        {!isMapped ? (
          <p className="typo-caption text-muted-foreground mt-1">
            Creates a campaign + space named after this client
          </p>
        ) : null}
      </label>
      {row.campaignId ? (
        <label className="block">
          <span className="typo-caption text-muted-foreground">Space (optional)</span>
          <select
            value={row.spaceId}
            onChange={(e) => {
              onDraftChange(client.id, { ...row, spaceId: e.target.value })
            }}
            className="border-border bg-background text-foreground mt-1 w-full rounded-md border px-2 py-1.5 text-xs outline-none"
          >
            <option value="">Any space in campaign</option>
            {campaignSpaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  )
}
