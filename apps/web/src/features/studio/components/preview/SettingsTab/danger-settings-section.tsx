'use client'

import { Trash2 } from 'lucide-react'

interface DangerSettingsSectionProps {
  activeCampaignName: string | null
  deleteDialogOpen: boolean
  deleteCampaignAck: boolean
  deleteCampaignNameInput: string
  isDeletingCampaign: boolean
  setDeleteDialogOpen: (open: boolean) => void
  setDeleteCampaignAck: (acknowledged: boolean) => void
  setDeleteCampaignNameInput: (value: string) => void
  onDeleteCampaign: () => Promise<void> | void
}

export function DangerSettingsSection({
  activeCampaignName,
  deleteDialogOpen,
  deleteCampaignAck,
  deleteCampaignNameInput,
  isDeletingCampaign,
  setDeleteDialogOpen,
  setDeleteCampaignAck,
  setDeleteCampaignNameInput,
  onDeleteCampaign,
}: DangerSettingsSectionProps) {
  const campaignName = activeCampaignName ?? ''

  return (
    <div className="space-y-spacing-6">
      <div>
        <p className="body-2 text-foreground font-semibold">Delete Campaign</p>
        <p className="body-4 text-muted-foreground mt-spacing-1">
          Soft-delete this campaign now. It can be restored for 30 days, then it is permanently
          deleted.
        </p>
      </div>
      {!deleteDialogOpen ? (
        <button
          type="button"
          onClick={() => {
            setDeleteDialogOpen(true)
            setDeleteCampaignAck(false)
            setDeleteCampaignNameInput('')
          }}
          className="button-glass-destructive gap-spacing-2 rounded-spacing-2 px-spacing-4 py-spacing-2 body-3 flex items-center font-medium"
        >
          <Trash2 className="icon-sm" />
          Delete Campaign
        </button>
      ) : (
        <div className="card-glass space-y-spacing-4 border-border p-spacing-5 border">
          <label className="gap-spacing-2 flex items-start">
            <input
              type="checkbox"
              checked={deleteCampaignAck}
              onChange={(e) => setDeleteCampaignAck(e.target.checked)}
              className="checkbox-glass-primary mt-spacing-1"
              disabled={isDeletingCampaign}
            />
            <span className="body-2 text-foreground">
              I understand this campaign can be restored for 30 days, then is permanently deleted.
            </span>
          </label>
          <div className="space-y-spacing-2">
            <p className="body-3 text-muted-foreground">
              Type <span className="text-foreground font-medium">{campaignName}</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteCampaignNameInput}
              onChange={(e) => setDeleteCampaignNameInput(e.target.value)}
              className="input-glass body-3 w-full"
              placeholder={campaignName}
              disabled={isDeletingCampaign}
            />
          </div>
          <div className="gap-spacing-2 flex items-center">
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              className="button-glass-neutral body-3 rounded-spacing-2 px-spacing-4 py-spacing-2 font-medium"
              disabled={isDeletingCampaign}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onDeleteCampaign()}
              className="button-glass-destructive body-3 rounded-spacing-2 px-spacing-4 py-spacing-2 font-medium disabled:opacity-50"
              disabled={
                isDeletingCampaign ||
                !deleteCampaignAck ||
                deleteCampaignNameInput.trim() !== campaignName
              }
            >
              {isDeletingCampaign ? 'Deleting...' : 'Delete Campaign'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
