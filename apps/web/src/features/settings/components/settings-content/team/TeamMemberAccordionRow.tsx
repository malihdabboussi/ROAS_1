'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Slack } from 'lucide-react'
import type {
  LearnFromSlackResponse,
  TeamRosterEntry,
  UpdateTeamProfilePayload,
} from '@/features/org/services/org.service'
import { TeamMemberProfileForm } from './TeamMemberProfileForm'
import { TeamMemberReadinessBadge } from './TeamMemberReadinessBadge'

export interface TeamMemberAccordionRowProps {
  member: TeamRosterEntry
  canEdit: boolean
  saving: boolean
  initiallyOpen?: boolean
  canLearnFromSlack?: boolean
  onSave: (patch: UpdateTeamProfilePayload) => Promise<void>
  onLearnFromSlack?: () => Promise<LearnFromSlackResponse | null>
}

export function TeamMemberAccordionRow({
  member,
  canEdit,
  saving,
  initiallyOpen,
  canLearnFromSlack,
  onSave,
  onLearnFromSlack,
}: TeamMemberAccordionRowProps) {
  const [open, setOpen] = useState(!!initiallyOpen)
  const [learning, setLearning] = useState(false)
  const [queuedLearn, setQueuedLearn] = useState(false)
  const [learnHandler, setLearnHandler] = useState<(() => Promise<void>) | null>(null)
  const canShowLearnButton = canEdit && canLearnFromSlack && !!onLearnFromSlack

  const runLearn = useCallback(async () => {
    if (!learnHandler) return
    setLearning(true)
    try {
      await learnHandler()
    } finally {
      setLearning(false)
    }
  }, [learnHandler])

  const handleLearn = () => {
    if (!open) {
      setOpen(true)
      setQueuedLearn(true)
      return
    }
    void runLearn()
  }

  useEffect(() => {
    if (!queuedLearn || !open || !learnHandler) return
    setQueuedLearn(false)
    void runLearn()
  }, [learnHandler, open, queuedLearn, runLearn])

  return (
    <div className="section-card">
      <div className="p-spacing-4 gap-spacing-3 flex w-full items-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="gap-spacing-3 flex min-w-0 flex-1 items-center text-left"
        >
          <div className="bg-secondary h-spacing-10 w-spacing-10 flex-shrink-0 overflow-hidden rounded-full">
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.display_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="body-2 text-muted-foreground flex h-full w-full items-center justify-center font-medium">
                {member.display_name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="body-2 text-foreground truncate font-medium">{member.display_name}</div>
            <div className="body-3 text-muted-foreground truncate">
              {member.role_label || 'No role set'}
              {member.email ? ` · ${member.email}` : ''}
            </div>
          </div>
        </button>
        <div className="gap-spacing-2 flex items-center">
          <TeamMemberReadinessBadge member={member} compact />
          {canShowLearnButton && (
            <button
              type="button"
              onClick={handleLearn}
              disabled={learning || saving || (open && !learnHandler)}
              className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 gap-spacing-2 inline-flex items-center font-medium disabled:opacity-50"
            >
              <Slack className="h-4 w-4" aria-hidden />
              {learning ? 'Asking ROAS to read Slack…' : 'Learn from Slack'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={open ? 'Collapse teammate details' : 'Expand teammate details'}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
        </div>
      </div>
      {open && (
        <div className="p-spacing-4 border-border border-t">
          <TeamMemberProfileForm
            member={member}
            canEdit={canEdit}
            saving={saving}
            onSave={onSave}
            onLearnFromSlack={onLearnFromSlack}
            registerLearnHandler={setLearnHandler}
          />
        </div>
      )}
    </div>
  )
}
