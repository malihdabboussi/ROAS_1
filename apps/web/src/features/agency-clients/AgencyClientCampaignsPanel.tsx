'use client'

import Link from 'next/link'
import { ExternalLink, MoreHorizontal, PanelRightOpen, Pencil } from 'lucide-react'
import type { AgencyClient, AgencyClientCampaign } from '@/lib/agency-clients'
import { formatAgencyDate } from './agency-client-format'
import { AgencyCampaignEditPanel, type CampaignPatch } from './AgencyCampaignEditPanel'
import { AGENCY_CLIENT_MESSAGES } from './config/messages.config'

export function AgencyClientCampaignsPanel({
  clientId,
  client,
  campaigns,
  spaceByCampaign,
  editingCampaignId,
  updatingId,
  onEdit,
  onCancel,
  onSave,
}: {
  clientId: string
  client?: AgencyClient
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
    <section className="surface-card rounded-spacing-3 border-border overflow-hidden border">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="body-4 text-muted-foreground border-border border-b text-left">
              <th className="px-spacing-4 py-spacing-3 font-medium">Stage</th>
              <th className="px-spacing-4 py-spacing-3 font-medium">Campaign Name</th>
              <th className="px-spacing-4 py-spacing-3 font-medium">Type</th>
              <th className="px-spacing-4 py-spacing-3 font-medium">Created By</th>
              <th className="px-spacing-4 py-spacing-3 font-medium">Account Manager</th>
              <th className="px-spacing-4 py-spacing-3 font-medium">Client</th>
              <th className="px-spacing-4 py-spacing-3 font-medium">Launch Day</th>
              <th className="px-spacing-4 py-spacing-3 text-right font-medium">Options</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => {
              if (editingCampaignId === campaign.id) {
                return (
                  <tr key={campaign.id}>
                    <td colSpan={8} className="p-spacing-4">
                      <AgencyCampaignEditPanel
                        campaign={campaign}
                        saving={updatingId === campaign.id}
                        onCancel={onCancel}
                        onSave={(patch) => onSave(campaign.id, patch)}
                      />
                    </td>
                  </tr>
                )
              }

              const spaceId = spaceByCampaign.get(campaign.id)
              const clientName =
                campaign.clients?.friendly_name ||
                campaign.clients?.name ||
                client?.display_name ||
                client?.name ||
                'Client'
              return (
                <tr
                  key={campaign.id}
                  className="hover:bg-hover-subtle border-border border-b last:border-b-0"
                >
                  <td className="px-spacing-4 py-spacing-3 align-top">
                    <span className="body-4 bg-secondary text-muted-foreground rounded-spacing-4 px-spacing-2 py-spacing-1 inline-flex whitespace-nowrap capitalize">
                      {readable(campaign.status || campaign.platform_status)}
                    </span>
                  </td>
                  <td className="px-spacing-4 py-spacing-3 align-top">
                    {spaceId ? (
                      <Link
                        href={`/spaces?space=${encodeURIComponent(spaceId)}`}
                        className="body-3 text-foreground hover:text-primary font-medium"
                      >
                        {campaign.name}
                      </Link>
                    ) : (
                      <span className="body-3 text-foreground font-medium">{campaign.name}</span>
                    )}
                  </td>
                  <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top capitalize">
                    {readable(String(campaign.campaign_type || 'Not set'))}
                  </td>
                  <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                    {String(campaign.created_by_name || campaign.created_by || 'Portal')}
                  </td>
                  <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                    {String(
                      campaign.account_manager_name ||
                        client?.account_manager?.name ||
                        'Unassigned',
                    )}
                  </td>
                  <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                    {clientName}
                  </td>
                  <td className="body-3 text-muted-foreground px-spacing-4 py-spacing-3 whitespace-nowrap align-top">
                    {formatAgencyDate(campaign.start_date)}
                  </td>
                  <td className="px-spacing-4 py-spacing-3 align-top">
                    <div className="gap-spacing-1 flex justify-end">
                      <button
                        aria-label={`Edit campaign ${campaign.name}`}
                        type="button"
                        onClick={() => onEdit(campaign.id)}
                        title={AGENCY_CLIENT_MESSAGES.EDIT}
                        className="btn-icon-bare hover:bg-hover-subtle text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="icon-sm" />
                      </button>
                      <Link
                        href={`/clients/${clientId}?surface=portal&portal_path=${encodeURIComponent(`/campaigns/${campaign.id}`)}`}
                        aria-label={`Open ${campaign.name} in Portal`}
                        title="Open in Portal"
                        className="btn-icon-bare hover:bg-hover-subtle text-muted-foreground hover:text-foreground"
                      >
                        <PanelRightOpen className="icon-sm" />
                      </Link>
                      {spaceId ? (
                        <Link
                          href={`/spaces?space=${encodeURIComponent(spaceId)}`}
                          aria-label={`Open ${campaign.name} Campaign Space`}
                          title="Open Campaign Space"
                          className="btn-icon-bare hover:bg-hover-subtle text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="icon-sm" />
                        </Link>
                      ) : (
                        <span
                          title="Campaign Space is still syncing"
                          className="btn-icon-bare text-muted-foreground opacity-40"
                        >
                          <MoreHorizontal className="icon-sm" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function readable(value: string) {
  return value.replace(/[_-]/g, ' ').toLowerCase()
}
