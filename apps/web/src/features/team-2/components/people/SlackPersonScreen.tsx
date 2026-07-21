'use client'

import { useState } from 'react'
import { RxDoubleArrowLeft } from 'react-icons/rx'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type {
  SlackDeliveryMode,
  SlackDiscoveredPerson,
  SlackPersonActivity,
  SlackPortalUser,
  SlackRelationshipKind,
  SlackShadowAction,
} from '../../services/slack-people.service'
import { SlackPersonConversation } from './SlackPersonConversation'
import { SlackPersonInfoPanel } from './SlackPersonInfoPanel'

interface SlackPersonScreenProps {
  person: SlackDiscoveredPerson
  portalUsers: SlackPortalUser[]
  activity: SlackPersonActivity | null
  actions: SlackShadowAction[]
  loading: boolean
  onBack: () => void
  onCreateProposal: (content: string) => Promise<boolean>
  onReview: (id: string, status: 'approved' | 'dismissed') => void
  onSend: (id: string) => void
  onUpdateDeliveryMode: (mode: SlackDeliveryMode) => void
  onUpdateRelationshipKind: (kind: SlackRelationshipKind) => void
  onConfirmIdentity: () => void
  onMapIdentity: (userId: string) => Promise<void>
  onCreateBrain: () => Promise<void>
}

export function SlackPersonScreen({
  person,
  portalUsers,
  activity,
  actions,
  loading,
  onBack,
  onCreateProposal,
  onReview,
  onSend,
  onUpdateDeliveryMode,
  onUpdateRelationshipKind,
  onConfirmIdentity,
  onMapIdentity,
  onCreateBrain,
}: SlackPersonScreenProps) {
  const [infoPanelCollapsed, setInfoPanelCollapsed] = useState(false)

  return (
    <div className="gap-spacing-3 flex h-full min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={onBack}
        className="button-compact button-glass-neutral shrink-0 self-start"
      >
        <ArrowLeft className="icon-xs" /> Back to People
      </button>
      <div className="gap-spacing-3 flex min-h-0 flex-1 overflow-hidden">
        <SlackPersonConversation
          person={person}
          messages={activity?.messages ?? []}
          actions={actions}
          loading={loading}
          onCreateProposal={onCreateProposal}
          onReview={onReview}
          onSend={onSend}
        />
        <div
          className={cn(
            'hidden min-h-0 shrink-0 md:block',
            infoPanelCollapsed ? 'w-spacing-14' : 'w-96',
          )}
        >
          {infoPanelCollapsed ? (
            <aside className="card-glass rounded-spacing-4 p-spacing-3 flex h-full flex-col items-center border-0">
              <button
                type="button"
                onClick={() => setInfoPanelCollapsed(false)}
                className="btn-icon-glass"
                aria-label="Expand person info"
                title="Expand person info"
              >
                <RxDoubleArrowLeft className="icon-sm" aria-hidden />
              </button>
            </aside>
          ) : (
            <SlackPersonInfoPanel
              person={person}
              portalUsers={portalUsers}
              messageCount={activity?.messages.length ?? 0}
              actions={actions}
              onUpdateDeliveryMode={onUpdateDeliveryMode}
              onUpdateRelationshipKind={onUpdateRelationshipKind}
              onConfirmIdentity={onConfirmIdentity}
              onMapIdentity={onMapIdentity}
              onCreateBrain={onCreateBrain}
              onRequestCollapse={() => setInfoPanelCollapsed(true)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
