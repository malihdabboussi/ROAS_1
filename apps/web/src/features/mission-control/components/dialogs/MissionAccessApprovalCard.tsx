import { KeyRound } from 'lucide-react'
import type { MissionAccessRequest } from '../../types'

interface MissionAccessApprovalCardProps {
  pendingAccessRequests: MissionAccessRequest[]
  approvingAccess: boolean
  denyingAccess: boolean
  onApproveAccess: (ids: string[]) => void
  onDenyAccess: (ids: string[]) => void
}

export function MissionAccessApprovalCard({
  pendingAccessRequests,
  approvingAccess,
  denyingAccess,
  onApproveAccess,
  onDenyAccess,
}: MissionAccessApprovalCardProps) {
  if (pendingAccessRequests.length === 0) return null
  const ids = pendingAccessRequests.map((request) => request.id)
  const images = pendingAccessRequests.every(
    (request) =>
      request.capability_id === 'generate_media' ||
      request.metadata?.required_action === 'generate_image',
  )

  return (
    <div className="card-glass p-spacing-3">
      <div className="flex items-start gap-3">
        <div className="chip-glass-neutral h-spacing-8 w-spacing-8 text-status-amber flex shrink-0 items-center justify-center rounded-lg">
          <KeyRound className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="body-2 text-primary">Agent access needed</div>
          <div className="body-3 mt-spacing-1 text-muted-foreground">
            {pendingAccessRequests
              .map((request) => `${request.agent_key}: ${request.capability_id}`)
              .join(', ')}
          </div>
          <div className="mt-spacing-3 gap-spacing-2 flex flex-wrap">
            <button
              type="button"
              onClick={() => void onApproveAccess(ids)}
              disabled={approvingAccess || denyingAccess}
              className="button-primary button-small"
            >
              {approvingAccess
                ? 'Approving...'
                : images
                  ? 'Approve image generation'
                  : 'Approve access'}
            </button>
            <button
              type="button"
              onClick={() => void onDenyAccess(ids)}
              disabled={approvingAccess || denyingAccess}
              className="button-secondary button-small"
            >
              {denyingAccess ? 'Denying...' : 'Deny'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
