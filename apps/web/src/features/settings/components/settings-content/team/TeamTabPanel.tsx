'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  orgService,
  type LearnFromSlackResponse,
  type TeamRosterEntry,
  type UpdateTeamProfilePayload,
} from '@/features/org/services/org.service'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { backendGet } from '@/lib/api/backend-client'
import { createClient } from '@/lib/supabase/client'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { TeamMemberAccordionRow } from './TeamMemberAccordionRow'

type SlackStatusResponse = {
  success: boolean
  connected: boolean
}

export function TeamTabPanel() {
  const { myRole } = useOrgStore()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [roster, setRoster] = useState<TeamRosterEntry[]>([])
  const [slackConnected, setSlackConnected] = useState(false)

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) setCurrentUserId(data.user.id)
      })
  }, [])

  useEffect(() => {
    backendGet<SlackStatusResponse>('/api/slack/status')
      .then((res) => setSlackConnected(!!res?.connected))
      .catch(() => setSlackConnected(false))
  }, [])

  const isAdmin = myRole === 'owner' || myRole === 'admin'
  const canLearnFromSlack = isAdmin && slackConnected

  const loadRoster = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await orgService.listRoster({ kind: 'human' })
      setRoster(rows)
    } catch {
      toast.error("Couldn't load the team — try again in a moment.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  const handleSave = useCallback(
    async (member: TeamRosterEntry, patch: UpdateTeamProfilePayload) => {
      if (!member.user_id) return
      setSaving(member.user_id)
      try {
        const updated =
          currentUserId && member.user_id === currentUserId
            ? await orgService.updateMyRoster(patch)
            : await orgService.updateRosterMember(member.user_id, patch)
        if (updated) {
          setRoster((prev) =>
            prev.map((r) => (r.user_id === updated.user_id ? { ...r, ...updated } : r)),
          )
        }
        toast.success('Saved — your teammate profile is live.')
      } catch (err) {
        toast.error(sanitizeUserError(err, 'Could not save — try again.'))
      } finally {
        setSaving(null)
      }
    },
    [currentUserId],
  )

  const canEditMember = (member: TeamRosterEntry): boolean => {
    if (!member.user_id) return false
    if (currentUserId && member.user_id === currentUserId) return true
    return myRole === 'owner' || myRole === 'admin'
  }

  const handleLearnFromSlack = useCallback(
    async (member: TeamRosterEntry): Promise<LearnFromSlackResponse | null> => {
      if (!member.user_id) return null
      try {
        const result = await orgService.learnFromSlack(member.user_id)
        toast.success(
          `Learned from Slack — used ${result.credits_used} credits (${result.credits_remaining} left)`,
        )
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not read Slack for this teammate.'
        if (msg.includes('credits_exhausted')) {
          toast.error('Out of credits — top up to use Learn from Slack.')
        } else if (msg.includes('slack_not_connected')) {
          toast.error('Connect Slack first to use this.')
        } else if (msg.includes('slack_user_not_found')) {
          toast.error("Couldn't find this person in your Slack workspace.")
        } else if (msg.includes('target_has_no_email')) {
          toast.error('This teammate has no email on file to match to Slack.')
        } else {
          toast.error(msg)
        }
        return null
      }
    },
    [],
  )

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <VibeyLoadingOrb text="Loading the team..." state="processing" size="sm" />
      </div>
    )
  }

  if (roster.length === 0) {
    return (
      <div className="section-card p-spacing-6 text-center">
        <p className="body-2 text-foreground font-medium">Nobody on the roster yet</p>
        <p className="body-3 text-muted-foreground mt-spacing-1">
          Invite teammates on the Members tab. Once they&apos;re in, fill in their role and
          specialties here so ROAS knows when to loop them into missions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-spacing-3">
      <p className="body-3 text-muted-foreground">
        Teammates flip to <span className="text-foreground font-medium">Ready for delegation</span>{' '}
        once their role, at least one specialty, and the agent-assignment opt-in are set. Only ready
        teammates appear in the manager agent&apos;s assignment list.
      </p>
      {roster.map((member) => (
        <TeamMemberAccordionRow
          key={member.participant_id}
          member={member}
          canEdit={canEditMember(member)}
          saving={saving === member.user_id}
          canLearnFromSlack={canLearnFromSlack && !!member.user_id}
          onSave={(patch) => handleSave(member, patch)}
          onLearnFromSlack={() => handleLearnFromSlack(member)}
        />
      ))}
    </div>
  )
}
