import { KeyRound } from 'lucide-react'
import type { MissionAccessRequest } from '../../types'

interface MissionAccessApprovalCardProps {
  pendingAccessRequests: MissionAccessRequest[]
  approvingAccess: boolean
  onApproveAccess: () => void
}

export function MissionAccessApprovalCard({
  pendingAccessRequests,
  approvingAccess,
  onApproveAccess,
}: MissionAccessApprovalCardProps) {
  if (pendingAccessRequests.length === 0) return null

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
          <button
            type="button"
            onClick={() => void onApproveAccess()}
            disabled={approvingAccess}
            className="button-primary button-small mt-spacing-3"
          >
            {approvingAccess ? 'Approving...' : 'Approve access'}
          </button>
        </div>
      </div>
    </div>
  )
}
