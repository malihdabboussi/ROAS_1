'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { useActiveMessages, useChatStore } from '@/features/studio/store/use-chat-store'
import { processConversationToBrain } from '@/lib/brain/process-conversation-api'
import { assignConversationScope } from '@/lib/conversations/conversations-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import {
  CAMPAIGN_BRAIN_NUDGE_MIN_USER_TURNS,
  countUserMessageTurns,
  shouldOfferCampaignBrainNudge,
} from '../config/work-context.config'
import {
  addCampaignBrainNudgeDismissedConversationId,
  readCampaignBrainNudgeDismissedConversationIds,
} from '../lib/global-chat-storage'
import { useGlobalChatStore } from '../store/use-global-chat-store'

const NUDGE_ERRORS = {
  SELECT_CAMPAIGN: 'Pick a client campaign first.',
  SAVE_FAILED: 'Could not attach and save — try again.',
} as const

const NUDGE_SUCCESS = {
  SAVED: 'Attached to campaign and saved to campaign brain.',
} as const

export function ChatCampaignBrainNudge() {
  const workContext = useGlobalChatStore((s) => s.workContext)
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const messages = useActiveMessages()
  const spaces = useSpacesStore((s) => s.spaces)
  const [dismissedIds, setDismissedIds] = useState(() =>
    readCampaignBrainNudgeDismissedConversationIds(),
  )
  const [selectedSpaceId, setSelectedSpaceId] = useState('')
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const userTurnCount = useMemo(() => countUserMessageTurns(messages), [messages])
  const dismissed =
    Boolean(activeConversationId) && dismissedIds.includes(activeConversationId ?? '')

  const eligible = shouldOfferCampaignBrainNudge({
    surface: workContext.surface,
    spaceId: workContext.spaceId,
    userTurnCount,
    minUserTurns: CAMPAIGN_BRAIN_NUDGE_MIN_USER_TURNS,
    dismissed,
  })

  const clientSpaces = useMemo(
    () =>
      spaces.filter(
        (space) =>
          typeof space.campaign_id === 'string' &&
          space.campaign_id.length > 0 &&
          space.space_kind !== 'personal_dashboard',
      ),
    [spaces],
  )

  if (!eligible || !activeConversationId || activeConversationId.startsWith('pending-')) {
    return null
  }

  const handleDismiss = () => {
    setDismissedIds(addCampaignBrainNudgeDismissedConversationId(activeConversationId))
    setPickerOpen(false)
  }

  const handleAccept = async () => {
    const space = clientSpaces.find((row) => row.id === selectedSpaceId)
    if (!space?.campaign_id) {
      toast.error(NUDGE_ERRORS.SELECT_CAMPAIGN)
      setPickerOpen(true)
      return
    }

    setSaving(true)
    try {
      await assignConversationScope(activeConversationId, space.campaign_id, space.id)
      setWorkContext({
        surface: 'spaces',
        spaceId: space.id,
        campaignId: space.campaign_id,
      })
      const payloadMessages = messages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => ({
          role: message.role,
          content: message.content ?? '',
        }))
        .filter((message) => message.content.trim().length > 0)

      await processConversationToBrain({
        messages: payloadMessages,
        campaign_id: space.campaign_id,
        source_id: activeConversationId,
        source_title: `Conversation save · ${space.title}`,
        source_type: 'conversation',
        session_key: `studio:nudge:${activeConversationId}`,
      })

      setDismissedIds(addCampaignBrainNudgeDismissedConversationId(activeConversationId))
      toast.success(NUDGE_SUCCESS.SAVED)
    } catch (error) {
      toast.error(sanitizeUserError(error, NUDGE_ERRORS.SAVE_FAILED))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="chat-surface-rec-banner mx-2 mb-2 shrink-0">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="body-4 text-foreground font-medium leading-snug">
            This chat looks valuable — attach it to a client campaign and save decisions to that
            campaign brain?
          </p>
          {pickerOpen ? (
            <label className="mt-spacing-2 block">
              <span className="body-4 text-muted-foreground">Client campaign</span>
              <select
                className="input-glass body-3 text-foreground mt-spacing-1 h-spacing-8 w-full"
                value={selectedSpaceId}
                onChange={(event) => setSelectedSpaceId(event.target.value)}
                aria-label="Select client campaign"
              >
                <option value="">Select a campaign…</option>
                {clientSpaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <button
            type="button"
            className="button-glass-accent rounded-spacing-1 px-spacing-2 py-spacing-1 typo-caption font-medium disabled:opacity-50"
            disabled={saving || clientSpaces.length === 0}
            onClick={() => {
              if (!pickerOpen) {
                setPickerOpen(true)
                return
              }
              void handleAccept()
            }}
          >
            {saving ? 'Saving…' : pickerOpen ? 'Attach + save' : 'Add to campaign'}
          </button>
          <button type="button" className="chat-surface-rec-dismiss" onClick={handleDismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
