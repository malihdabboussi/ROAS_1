'use client'

import { ChevronDown, ChevronRight, Crown, Users } from 'lucide-react'
import { SettingsSelect } from '@/components/ui/forms/SettingsSelect'
import Switch from '@/components/ui/forms/switch'
import {
  getOrgMemberInitials,
  getOrgMemberName,
  SHARE_PERMISSION_OPTIONS,
  type MemberShareState,
  type SharePermission,
} from '@/lib/org'
import { ShareMemberAvatar } from './ShareMemberAvatar'

export function ShareModalPeopleList({
  loading,
  memberStates,
  onOwnerAvatarError,
  onPermissionChange,
  onToggle,
  ownerAvatarSrc,
  ownerLabel,
  peopleOpen,
  setPeopleOpen,
  sharedCount,
}: {
  loading: boolean
  memberStates: MemberShareState[]
  onOwnerAvatarError: () => void
  onPermissionChange: (memberId: string, permission: SharePermission) => void
  onToggle: (memberId: string, checked: boolean) => void
  ownerAvatarSrc: string | null
  ownerLabel: string
  peopleOpen: boolean
  setPeopleOpen: (open: boolean) => void
  sharedCount: number
}) {
  return (
    <div className="px-spacing-6 py-spacing-4 min-h-0 flex-1 overflow-y-auto">
      <p className="body-3 text-muted-foreground mb-spacing-3">Share with</p>

      {loading ? (
        <div className="py-spacing-6 flex items-center justify-center">
          <p className="body-3 text-muted-foreground">Loading team...</p>
        </div>
      ) : memberStates.length === 0 ? (
        <div className="py-spacing-4 text-center">
          <p className="body-3 text-muted-foreground">No team members yet. Invite someone above.</p>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setPeopleOpen(!peopleOpen)}
            className="gap-spacing-2 py-spacing-2 hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 -mx-spacing-2 flex w-full items-center"
          >
            {peopleOpen ? (
              <ChevronDown className="icon-sm text-muted-foreground" />
            ) : (
              <ChevronRight className="icon-sm text-muted-foreground" />
            )}
            <Users className="icon-sm text-muted-foreground" />
            <span className="body-2 text-foreground flex-1 text-left font-medium">People</span>
            {sharedCount > 0 ? (
              <div className="flex -space-x-1.5">
                {memberStates
                  .filter((state) => state.enabled)
                  .slice(0, 3)
                  .map((state) => (
                    <div
                      key={state.member.id}
                      className="border-border overflow-hidden rounded-full border-2"
                    >
                      <ShareMemberAvatar
                        avatarUrl={state.member.profiles?.avatar_url}
                        name={getOrgMemberName(state.member)}
                        initials={getOrgMemberInitials(state.member)}
                        sizeClass="h-spacing-6 w-spacing-6"
                        textClassName="typo-caption leading-none"
                      />
                    </div>
                  ))}
                {sharedCount > 3 ? (
                  <div className="bg-secondary border-border h-spacing-6 w-spacing-6 flex items-center justify-center rounded-full border-2">
                    <span className="typo-caption text-muted-foreground font-medium leading-none">
                      +{sharedCount - 3}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </button>

          {peopleOpen ? (
            <div className="mt-spacing-2 space-y-spacing-1">
              <div className="px-spacing-2 py-spacing-1 flex items-center justify-between">
                <span className="typo-caption text-muted-foreground">
                  {sharedCount} shared with
                </span>
              </div>

              <div className="gap-spacing-3 px-spacing-2 py-spacing-2 flex items-center">
                <div className="bg-primary/20 h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center overflow-hidden rounded-full">
                  {ownerAvatarSrc ? (
                    <img
                      src={ownerAvatarSrc}
                      alt="Me"
                      referrerPolicy="no-referrer"
                      className="h-spacing-8 w-spacing-8 rounded-full object-cover"
                      onError={onOwnerAvatarError}
                    />
                  ) : (
                    <Crown className="icon-xs text-primary" />
                  )}
                </div>
                <div className="gap-spacing-2 flex min-w-0 flex-1 flex-wrap items-center">
                  <p className="body-2 text-foreground font-medium">Me</p>
                  <span className="badge-glass badge-glass-green typo-caption shrink-0 font-medium">
                    {ownerLabel} Owner
                  </span>
                </div>
                <span className="body-3 text-muted-foreground italic">Full edit</span>
                <Switch checked disabled />
              </div>

              {memberStates.map((state) => (
                <div
                  key={state.member.id}
                  className="gap-spacing-3 px-spacing-2 py-spacing-2 flex items-center"
                >
                  <ShareMemberAvatar
                    avatarUrl={state.member.profiles?.avatar_url}
                    name={getOrgMemberName(state.member)}
                    initials={getOrgMemberInitials(state.member)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="body-2 text-foreground truncate">
                      {getOrgMemberName(state.member)}
                    </p>
                  </div>
                  <div className="w-32 shrink-0">
                    <SettingsSelect
                      value={state.permission}
                      options={SHARE_PERMISSION_OPTIONS}
                      onChange={(permission) => onPermissionChange(state.member.id, permission)}
                      disabled={state.saving}
                      triggerClassName="gap-spacing-1 h-spacing-8 px-spacing-2 input-glass rounded-spacing-2 body-3 flex w-full items-center justify-between transition-colors disabled:opacity-60"
                    />
                  </div>
                  <Switch
                    checked={state.enabled}
                    onCheckedChange={(checked) => onToggle(state.member.id, checked)}
                    disabled={state.saving}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
