'use client'

import Link from 'next/link'
import { FolderKanban, PanelRightOpen, Pencil } from 'lucide-react'
import type { AgencyClientCampaign } from '@/lib/agency-clients'
import { formatAgencyBudget, formatAgencyDate } from './agency-client-format'
import { AgencyCampaignEditPanel, type CampaignPatch } from './AgencyCampaignEditPanel'
import { AGENCY_CLIENT_MESSAGES } from './config/messages.config'

export function AgencyClientCampaignsPanel({
  clientId,
  campaigns,
  spaceByCampaign,
  editingCampaignId,
  updatingId,
  onEdit,
  onCancel,
  onSave,
}: {
  clientId: string
  campaigns: AgencyClientCampaign[]
  spaceByCampaign: Map<string, string>
  editingCampaignId: string | null
  updatingId: string | null
  onEdit: (campaignId: string) => void
  onCancel: () => void
  onSave: (campaignId: string, patch: CampaignPatch) => Promise<void>
}) {
  if (campaigns.length === 0) {
    return (
      <p className="surface-card body-3 text-muted-foreground rounded-spacing-3 border-border p-spacing-5 border">
        No client campaigns have been added yet.
      </p>
    )
  }

  return (
    <div className="gap-spacing-3 grid md:grid-cols-2">
      {campaigns.map((campaign) => {
        if (editingCampaignId === campaign.id) {
          return (
            <AgencyCampaignEditPanel
              key={campaign.id}
              campaign={campaign}
              saving={updatingId === campaign.id}
              onCancel={onCancel}
              onSave={(patch) => onSave(campaign.id, patch)}
            />
          )
        }

        const spaceId = spaceByCampaign.get(campaign.id)
        const summary = (
          <>
            <div className="gap-spacing-3 flex items-start justify-between">
              <div>
                <h2 className="body-2 text-foreground font-semibold">{campaign.name}</h2>
                <p className="body-4 text-muted-foreground capitalize">
                  {campaign.status || campaign.platform_status}
                </p>
              </div>
              <FolderKanban className="icon-md text-muted-foreground" />
            </div>
            <p className="body-3 text-muted-foreground mt-spacing-3 line-clamp-2">
              {campaign.campaign_overview ||
                campaign.description ||
                campaign.next_action ||
                'Campaign workspace'}
            </p>
            <div className="body-4 text-muted-foreground mt-spacing-4 gap-spacing-4 border-border pt-spacing-3 flex flex-wrap border-t">
              <span>Event: {formatAgencyDate(campaign.event_date)}</span>
              <span>
                Budget:{' '}
                {formatAgencyBudget(
                  campaign.budget_amount,
                  campaign.currency,
                  campaign.budget_type,
                )}
              </span>
            </div>
          </>
        )

        return (
          <article
            key={campaign.id}
            className="surface-card rounded-spacing-3 border-border p-spacing-4 border"
          >
            {spaceId ? (
              <Link
                href={`/spaces?space=${spaceId}`}
                className="hover:bg-hover-subtle rounded-spacing-2 block"
              >
                {summary}
              </Link>
            ) : (
              summary
            )}
            <div className="mt-spacing-3 gap-spacing-2 flex flex-wrap">
              <button
                aria-label={`Edit campaign ${campaign.name}`}
                type="button"
                onClick={() => onEdit(campaign.id)}
                className="button-compact button-glass-neutral"
              >
                <Pencil className="icon-sm" /> {AGENCY_CLIENT_MESSAGES.EDIT}
              </button>
              <Link
                href={`/clients/${clientId}?surface=portal&portal_path=${encodeURIComponent(`/campaigns/${campaign.id}`)}`}
                aria-label={`Open ${campaign.name} in Portal`}
                className="button-compact button-glass-purple"
              >
                <PanelRightOpen className="icon-sm" /> Portal
              </Link>
            </div>
          </article>
        )
      })}
    </div>
  )
}
