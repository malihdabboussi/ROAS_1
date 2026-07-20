'use client'

import { ArrowLeft } from 'lucide-react'
import type {
  SlackDiscoveredPerson,
  SlackPersonActivity,
} from '../../services/slack-people.service'
import { SlackPersonDetail } from './SlackPersonDetail'

interface SlackPersonScreenProps {
  person: SlackDiscoveredPerson
  activity: SlackPersonActivity | null
  loading: boolean
  onBack: () => void
  onConfirmIdentity: () => void
}

export function SlackPersonScreen({
  person,
  activity,
  loading,
  onBack,
  onConfirmIdentity,
}: SlackPersonScreenProps) {
  return (
    <div className="gap-spacing-4 flex flex-col">
      <button
        type="button"
        onClick={onBack}
        className="button-compact button-glass-neutral self-start"
      >
        <ArrowLeft className="icon-xs" /> Back to People
      </button>
      <header>
        <p className="eyebrow text-muted-foreground">People intelligence</p>
        <h1 className="title-h4 text-foreground mt-spacing-1">PERSON CONVERSATION</h1>
        <p className="body-3 text-muted-foreground mt-spacing-2">{person.display_name}</p>
      </header>
      <SlackPersonDetail
        person={person}
        activity={activity}
        loading={loading}
        onConfirmIdentity={onConfirmIdentity}
      />
    </div>
  )
}
