'use client'

import { ArrowLeft } from 'lucide-react'
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
        <div className="hidden min-h-0 w-96 shrink-0 md:block">
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
          />
        </div>
      </div>
    </div>
  )
}
