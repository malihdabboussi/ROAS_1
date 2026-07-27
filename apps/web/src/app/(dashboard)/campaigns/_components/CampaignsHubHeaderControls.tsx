'use client'

import Link from 'next/link'
import { Plus, Search, X } from 'lucide-react'
import type { Program } from '@/lib/programs'

export function CampaignsHubHeaderControls({
  embedded,
  focusProgram,
  query,
  newCampaignName,
  showComposer,
  creatingCampaign,
  onQueryChange,
  onStartCreate,
  onCancelCreate,
  onNewCampaignNameChange,
  onSubmitCreate,
}: {
  embedded: boolean
  focusProgram: Program | null
  query: string
  newCampaignName: string
  showComposer: boolean
  creatingCampaign: boolean
  onQueryChange: (value: string) => void
  onStartCreate: () => void
  onCancelCreate?: () => void
  onNewCampaignNameChange: (value: string) => void
  onSubmitCreate: () => void
}) {
  return (
    <>
      <div className="mb-spacing-4 flex flex-wrap items-start justify-between gap-3">
        {!embedded ? (
          <div className="min-w-0">
            <h1 className="title-h3 text-foreground">
              {focusProgram ? focusProgram.name.toUpperCase() : 'CAMPAIGNS'}
            </h1>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              {focusProgram
                ? 'Campaigns and spaces in this program.'
                : 'Programs group campaigns. Create a campaign inside a program to land it there.'}
            </p>
          </div>
        ) : null}
        <div className="gap-spacing-2 flex flex-wrap items-center">
          {focusProgram && !embedded ? (
            <Link href="/campaigns" className="button-glass-neutral button-compact">
              All campaigns
            </Link>
          ) : null}
          {!embedded ? (
            <Link href="/all-tasks" className="button-glass-neutral button-compact">
              All Tasks
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onStartCreate}
            className="button-glass-primary button-compact"
          >
            <Plus className="icon-sm" />
            New campaign
          </button>
        </div>
      </div>

      <div className="mb-spacing-4 gap-spacing-2 flex flex-col sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <Search className="icon-left-center text-muted-foreground icon-sm pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search campaigns or spaces…"
            aria-label="Search campaigns or spaces"
            className="input-glass input-leading body-3 text-foreground placeholder:text-muted-foreground w-full outline-none"
          />
        </label>
        {showComposer ? (
          <div className="gap-spacing-2 flex min-w-0 flex-1 sm:max-w-xs">
            <input
              autoFocus
              value={newCampaignName}
              onChange={(event) => onNewCampaignNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSubmitCreate()
              }}
              placeholder="Campaign name"
              className="input-glass body-3 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 outline-none"
            />
            <button
              type="button"
              disabled={creatingCampaign || !newCampaignName.trim()}
              onClick={onSubmitCreate}
              className="button-glass-accent button-compact disabled:opacity-50"
            >
              {creatingCampaign ? 'Creating…' : 'Create'}
            </button>
            {onCancelCreate ? (
              <button
                type="button"
                onClick={onCancelCreate}
                className="btn-icon-glass"
                aria-label="Cancel campaign creation"
              >
                <X className="icon-sm" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  )
}
