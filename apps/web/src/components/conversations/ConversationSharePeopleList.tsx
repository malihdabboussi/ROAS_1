import { ChevronDown, ChevronRight } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import { SettingsDropdown } from '@/components/ui/forms/SettingsDropdown'
import type {
  ConversationShareLevel,
  ConversationShareRecord,
} from '@/lib/conversations/conversation.types'
import {
  CONVERSATION_SHARE_PERMISSION_DROPDOWN_OPTIONS,
  type ConversationShareRosterEntry,
} from './ConversationShareTypes'
import { ConversationShareMemberAvatar } from './ConversationShareMemberAvatar'

interface ConversationSharePeopleListProps {
  activeOrgId: string | null
  busyShareIds: Record<string, boolean>
  inviteLevel: ConversationShareLevel
  loading: boolean
  orgName: string
  orgRowOpen: boolean
  roster: ConversationShareRosterEntry[]
  rosterByUserId: Map<string, ConversationShareRosterEntry>
  shareByUserId: Map<string, ConversationShareRecord>
  sharedOrgRow: ConversationShareRecord | null
  sharedUsersNotInRoster: ConversationShareRecord[]
  sharingOpen: boolean
  onLevelChange: (share: ConversationShareRecord, level: ConversationShareLevel) => void
  onOrgRowOpenChange: (open: boolean) => void
  onRemoveShare: (share: ConversationShareRecord) => void
  onSharingOpenChange: (open: boolean) => void
  onToggleOrgShare: () => void
  onToggleShare: (entry: ConversationShareRosterEntry, checked: boolean) => void
}

export function ConversationSharePeopleList({
  activeOrgId,
  busyShareIds,
  inviteLevel,
  loading,
  orgName,
  orgRowOpen,
  roster,
  rosterByUserId,
  shareByUserId,
  sharedOrgRow,
  sharedUsersNotInRoster,
  sharingOpen,
  onLevelChange,
  onOrgRowOpenChange,
  onRemoveShare,
  onSharingOpenChange,
  onToggleOrgShare,
  onToggleShare,
}: ConversationSharePeopleListProps) {
  return (
    <div className="px-spacing-6 py-spacing-4 max-h-[44vh] flex-1 overflow-y-auto">
      <p className="body-3 text-muted-foreground mb-spacing-2">Share with</p>

      {loading ? (
        <p className="body-3 text-muted-foreground py-3 text-center">Loading...</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onSharingOpenChange(!sharingOpen)}
            className="hover:bg-hover-subtle -mx-spacing-2 flex w-full items-center gap-2 rounded px-2 py-2"
          >
            {sharingOpen ? (
              <ChevronDown className="icon-sm text-muted-foreground" />
            ) : (
              <ChevronRight className="icon-sm text-muted-foreground" />
            )}
            <span className="body-2 text-foreground flex-1 text-left font-medium">People</span>
          </button>

          {sharingOpen && (
            <div className="mt-1 space-y-1">
              {activeOrgId ? (
                <>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOrgRowOpenChange(!orgRowOpen)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onOrgRowOpenChange(!orgRowOpen)
                      }
                    }}
                    className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded px-2 py-1.5"
                  >
                    {orgRowOpen ? (
                      <ChevronDown className="icon-xs text-muted-foreground" />
                    ) : (
                      <ChevronRight className="icon-xs text-muted-foreground" />
                    )}
                    <span className="body-3 text-foreground flex-1 text-left">{orgName}</span>
                    <span className="body-3 text-muted-foreground">
                      {sharedOrgRow?.level ?? 'No org share'}
                    </span>
                    <span onClick={(event) => event.stopPropagation()}>
                      <Switch
                        checked={Boolean(sharedOrgRow)}
                        disabled={busyShareIds[sharedOrgRow?.id ?? `org:${activeOrgId}`]}
                        onCheckedChange={() => onToggleOrgShare()}
                      />
                    </span>
                  </div>
                  {orgRowOpen ? (
                    <div className="ml-5 space-y-1">
                      {roster
                        .filter((entry) => entry.kind === 'human' && entry.user_id)
                        .map((entry) => {
                          const share = shareByUserId.get(entry.user_id!)
                          const busyKey = share?.id ?? `member:${entry.user_id}`
                          return (
                            <div
                              key={entry.participant_id}
                              className="flex items-center gap-2 rounded px-2 py-1.5"
                            >
                              <ConversationShareMemberAvatar entry={entry} />
                              <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                                {entry.display_name}
                              </span>
                              <div className="w-36 shrink-0">
                                <SettingsDropdown
                                  value={share?.level ?? inviteLevel}
                                  options={CONVERSATION_SHARE_PERMISSION_DROPDOWN_OPTIONS}
                                  onChange={(value) => {
                                    if (!share) return
                                    onLevelChange(share, value as ConversationShareLevel)
                                  }}
                                  disabled={!share || busyShareIds[busyKey]}
                                  appearance="spaces"
                                  compact
                                  minWidth={160}
                                />
                              </div>
                              <Switch
                                checked={Boolean(share)}
                                onCheckedChange={(checked) => onToggleShare(entry, checked)}
                                disabled={busyShareIds[busyKey]}
                              />
                            </div>
                          )
                        })}
                    </div>
                  ) : null}
                </>
              ) : null}

              {sharedUsersNotInRoster.length > 0 ? (
                <div className="pt-1">
                  {sharedUsersNotInRoster.map((share) => {
                    const entry = rosterByUserId.get(share.entity_id)
                    return (
                      <div key={share.id} className="flex items-center gap-2 rounded px-2 py-1.5">
                        {entry ? <ConversationShareMemberAvatar entry={entry} /> : null}
                        <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                          {entry?.display_name ?? share.entity_id}
                        </span>
                        <div className="w-36 shrink-0">
                          <SettingsDropdown
                            value={share.level}
                            options={CONVERSATION_SHARE_PERMISSION_DROPDOWN_OPTIONS}
                            onChange={(value) =>
                              onLevelChange(share, value as ConversationShareLevel)
                            }
                            disabled={busyShareIds[share.id]}
                            appearance="spaces"
                            compact
                            minWidth={160}
                          />
                        </div>
                        <button
                          type="button"
                          className="body-3 text-muted-foreground hover:text-foreground rounded px-1"
                          onClick={() => onRemoveShare(share)}
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  )
}
