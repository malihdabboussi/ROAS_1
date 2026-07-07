'use client'

import { Info, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Switch } from '@/components/ui/forms/switch'
import type {
  LearnFromSlackResponse,
  TeamRosterEntry,
  UpdateTeamProfilePayload,
} from '@/features/org/services/org.service'
import { TimezoneSelect } from '@/components/datetime/TimezoneSelect'
import { computeReadinessMissing } from './TeamMemberReadinessBadge'

type SlackEvidence = {
  functional_role?: string
  specialties?: string
  delegation_notes?: string
  timezone?: string
}

export interface TeamMemberProfileFormProps {
  member: TeamRosterEntry
  canEdit: boolean
  saving: boolean
  onSave: (patch: UpdateTeamProfilePayload) => Promise<void>
  onLearnFromSlack?: () => Promise<LearnFromSlackResponse | null>
  registerLearnHandler?: (handler: (() => Promise<void>) | null) => void
}

export function TeamMemberProfileForm({
  member,
  canEdit,
  saving,
  onSave,
  onLearnFromSlack,
  registerLearnHandler,
}: TeamMemberProfileFormProps) {
  const [functionalRole, setFunctionalRole] = useState(member.role_label ?? '')
  const [specialtyInput, setSpecialtyInput] = useState('')
  const [specialties, setSpecialties] = useState<string[]>(member.specialties ?? [])
  const [acceptsAssignments, setAcceptsAssignments] = useState(member.accepts_assignments ?? true)
  const [delegationNotes, setDelegationNotes] = useState(member.delegation_notes ?? '')
  const [timezone, setTimezone] = useState(member.timezone ?? '')
  const [outOfOfficeUntil, setOutOfOfficeUntil] = useState(
    member.out_of_office_until ? member.out_of_office_until.slice(0, 10) : '',
  )
  const [slackEvidence, setSlackEvidence] = useState<SlackEvidence>({})

  const draftMember = useMemo(
    () => ({
      is_ready: member.is_ready,
      role_label: functionalRole || null,
      specialties,
      accepts_assignments: acceptsAssignments,
    }),
    [acceptsAssignments, functionalRole, member.is_ready, specialties],
  )
  const missing = useMemo(() => computeReadinessMissing(draftMember), [draftMember])

  const isDirty =
    functionalRole !== (member.role_label ?? '') ||
    specialties.length !== (member.specialties?.length ?? 0) ||
    specialties.some((t, i) => t !== (member.specialties ?? [])[i]) ||
    acceptsAssignments !== (member.accepts_assignments ?? true) ||
    delegationNotes !== (member.delegation_notes ?? '') ||
    timezone !== (member.timezone ?? '') ||
    outOfOfficeUntil !== (member.out_of_office_until ? member.out_of_office_until.slice(0, 10) : '')

  const addSpecialty = () => {
    const tag = specialtyInput.trim()
    if (!tag) return
    if (specialties.includes(tag)) {
      setSpecialtyInput('')
      return
    }
    setSpecialties((prev) => [...prev, tag])
    setSpecialtyInput('')
  }

  const removeSpecialty = (tag: string) => {
    setSpecialties((prev) => prev.filter((s) => s !== tag))
  }

  const handleLearn = useCallback(async () => {
    if (!canEdit || !onLearnFromSlack) return
    if (isDirty) {
      const ok = window.confirm(
        'Learning from Slack will overwrite your current edits. Continue?',
      )
      if (!ok) return
    }
    const result = await onLearnFromSlack()
    if (!result) return
    const { suggestions } = result
    const nextEvidence: SlackEvidence = {}

    if (suggestions.functional_role.value !== null) {
      setFunctionalRole(suggestions.functional_role.value)
      nextEvidence.functional_role = suggestions.functional_role.evidence ?? ''
    }
    if (suggestions.specialties.value.length > 0) {
      setSpecialties(suggestions.specialties.value)
      nextEvidence.specialties = suggestions.specialties.evidence ?? ''
    }
    if (suggestions.delegation_notes.value !== null) {
      setDelegationNotes(suggestions.delegation_notes.value)
      nextEvidence.delegation_notes = suggestions.delegation_notes.evidence ?? ''
    }
    if (suggestions.timezone.value !== null) {
      setTimezone(suggestions.timezone.value)
      nextEvidence.timezone = `Slack timezone: ${suggestions.timezone.value}`
    }
    setSlackEvidence(nextEvidence)
  }, [canEdit, isDirty, onLearnFromSlack])

  useEffect(() => {
    registerLearnHandler?.(handleLearn)
    return () => registerLearnHandler?.(null)
  }, [handleLearn, registerLearnHandler])

  const handleSave = async () => {
    const patch: UpdateTeamProfilePayload = {
      functional_role: functionalRole.trim() ? functionalRole.trim() : null,
      specialties,
      accepts_agent_assignments: acceptsAssignments,
      delegation_notes: delegationNotes.trim() ? delegationNotes.trim() : null,
      timezone: timezone.trim() ? timezone.trim() : null,
      out_of_office_until: outOfOfficeUntil ? new Date(outOfOfficeUntil).toISOString() : null,
    }
    await onSave(patch)
    setSlackEvidence({})
  }

  return (
    <div className="space-y-spacing-4 pt-spacing-4">
      <div>
        <label className="body-3 text-muted-foreground mb-spacing-1 gap-spacing-2 flex items-center">
          Functional role
          {slackEvidence.functional_role !== undefined && (
            <SlackSuggestionBadge evidence={slackEvidence.functional_role} />
          )}
        </label>
        <input
          type="text"
          value={functionalRole}
          onChange={(e) => setFunctionalRole(e.target.value)}
          disabled={!canEdit}
          placeholder="e.g. Lead Designer, Founder & CEO"
          className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border disabled:opacity-60"
        />
      </div>

      <div>
        <label className="body-3 text-muted-foreground mb-spacing-1 gap-spacing-2 flex items-center">
          Specialties
          {slackEvidence.specialties !== undefined && (
            <SlackSuggestionBadge evidence={slackEvidence.specialties} />
          )}
        </label>
        <div className="gap-spacing-2 flex flex-wrap">
          {specialties.map((tag) => (
            <span
              key={tag}
              className="body-3 bg-secondary text-foreground rounded-spacing-1 px-spacing-2 py-spacing-1 gap-spacing-1 inline-flex items-center"
            >
              {tag}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removeSpecialty(tag)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        {canEdit && (
          <div className="mt-spacing-2 gap-spacing-2 flex">
            <input
              type="text"
              value={specialtyInput}
              onChange={(e) => setSpecialtyInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addSpecialty()
                }
              }}
              placeholder="add tag and press Enter (e.g. copywriting)"
              className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground flex-1 border"
            />
            <button
              type="button"
              onClick={addSpecialty}
              className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-2 font-medium"
            >
              Add
            </button>
          </div>
        )}
      </div>

      <div className="gap-spacing-3 flex items-center">
        <Switch
          checked={acceptsAssignments}
          onCheckedChange={(v) => setAcceptsAssignments(!!v)}
          disabled={!canEdit}
        />
        <div>
          <div className="body-2 text-foreground font-medium">Accepts agent-assigned work</div>
          <div className="body-3 text-muted-foreground">
            When off, the manager agent will never hand off a subtask to this teammate.
          </div>
        </div>
      </div>

      <div>
        <label className="body-3 text-muted-foreground mb-spacing-1 gap-spacing-2 flex items-center">
          What you want (and don&apos;t want) delegated to you
          {slackEvidence.delegation_notes !== undefined && (
            <SlackSuggestionBadge evidence={slackEvidence.delegation_notes} />
          )}
        </label>
        <textarea
          value={delegationNotes}
          onChange={(e) => setDelegationNotes(e.target.value)}
          disabled={!canEdit}
          rows={3}
          placeholder="e.g. Ask me for brand-tone decisions. Don't ask me to draft copy — Ivy owns that."
          className="px-spacing-3 py-spacing-2 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border disabled:opacity-60"
        />
      </div>

      <div className="gap-spacing-3 grid grid-cols-1 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`roster-tz-${member.participant_id}`}
            className="body-3 text-muted-foreground mb-spacing-1 gap-spacing-2 flex items-center"
          >
            Timezone
            {slackEvidence.timezone !== undefined && (
              <SlackSuggestionBadge evidence={slackEvidence.timezone} />
            )}
          </label>
          <TimezoneSelect
            id={`roster-tz-${member.participant_id}`}
            value={timezone}
            onChange={setTimezone}
            disabled={!canEdit}
            allowEmpty
          />
        </div>
        <div>
          <label className="body-3 text-muted-foreground mb-spacing-1 block">
            Out of office until
          </label>
          <input
            type="date"
            value={outOfOfficeUntil}
            onChange={(e) => setOutOfOfficeUntil(e.target.value)}
            disabled={!canEdit}
            className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg text-foreground w-full border disabled:opacity-60"
          />
        </div>
      </div>

      <div className="gap-spacing-3 flex items-center justify-end pt-spacing-2">
        {canEdit && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="button-glass-accent rounded-spacing-2 px-spacing-4 py-spacing-2 body-2 font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      {missing.length > 0 && (
        <p className="body-3 text-muted-foreground">
          Add {missing.join(', ')} so Vibey can loop this teammate into missions.
        </p>
      )}
    </div>
  )
}

function SlackSuggestionBadge({ evidence }: { evidence: string }) {
  return (
    <span
      className="body-3 bg-secondary text-muted-foreground rounded-spacing-1 px-spacing-2 py-spacing-1 gap-spacing-1 inline-flex items-center"
      title={evidence || 'Suggested by Slack'}
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      Suggested by Slack
      {evidence && <Info className="h-3 w-3" aria-hidden />}
    </span>
  )
}
