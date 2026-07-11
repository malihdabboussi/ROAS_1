'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { cachedBrainScopeNav } from '@/features/brain/hooks/use-brain-scope-nav-options'
import { OrgLogoPicker } from '@/features/org/components/OrgLogoPicker'
import {
  orgService,
  type Organization,
  type OrgInvitation,
  type OrgMember,
} from '@/features/org/services/org.service'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { formatOrgPublicUrl } from '@/lib/org/org-public-url'
import { createClient } from '@/lib/supabase/client'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { TeamTabPanel } from './team'

const INVITABLE_ROLES = ['admin', 'creator', 'editor', 'viewer'] as const

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  creator: 'Creator',
  editor: 'Editor',
  viewer: 'Viewer',
}

export default function OrgSettingsContent() {
  const { activeOrgId, myRole, hasMinRole, fetchMemberships } = useOrgStore()
  const isOwner = myRole === 'owner'

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [invitations, setInvitations] = useState<OrgInvitation[]>([])

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('editor')
  const [inviting, setInviting] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) setCurrentUserId(data.user.id)
      })
  }, [])

  const loadData = useCallback(async () => {
    if (!activeOrgId) return
    try {
      const [orgRes, membersRes, invitesRes] = await Promise.all([
        orgService.getOrg(activeOrgId),
        orgService.listMembers(activeOrgId),
        orgService.listInvitations(activeOrgId),
      ])
      if (orgRes.success && orgRes.org) {
        setOrg(orgRes.org)
        setName(orgRes.org.name)
        setSlug(orgRes.org.slug)
        setLogoUrl(orgRes.org.avatar_url ?? null)
      }
      if (membersRes.success) setMembers(membersRes.members)
      if (invitesRes.success) setInvitations(invitesRes.invitations)
    } catch {
      toast.error('Failed to load organization data')
    } finally {
      setLoading(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleSave = async () => {
    if (!activeOrgId || !name.trim() || !slug.trim()) return
    setSaving(true)
    try {
      const res = await orgService.updateOrg(activeOrgId, {
        name: name.trim(),
        slug: slug.trim(),
        avatar_url: logoUrl?.trim() || null,
      })
      if (res.success && res.org) {
        setOrg(res.org)
        setLogoUrl(res.org.avatar_url ?? null)
        await fetchMemberships()
        cachedBrainScopeNav.invalidate()
        void cachedBrainScopeNav.reload()
        toast.success('Organization updated')
      }
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to update organization'))
    } finally {
      setSaving(false)
    }
  }

  const handleInvite = async () => {
    if (!activeOrgId || !inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await orgService.invite(activeOrgId, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      })
      if (res.success) {
        setInviteEmail('')
        setInviteRole('editor')
        setInvitations((prev) => [...prev, res.invitation])
        toast.success(`Invitation sent to ${inviteEmail.trim()}`)
      }
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to send invitation'))
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvite = async (invitationId: string) => {
    if (!activeOrgId) return
    try {
      await orgService.revokeInvitation(activeOrgId, invitationId)
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId))
      toast.success('Invitation revoked')
    } catch {
      toast.error('Failed to revoke invitation')
    }
  }

  const handleResendInvite = async (inv: OrgInvitation) => {
    if (!activeOrgId) return
    try {
      await orgService.revokeInvitation(activeOrgId, inv.id)
      const res = await orgService.invite(activeOrgId, { email: inv.email, role: inv.role })
      if (res.success) {
        setInvitations((prev) => prev.filter((i) => i.id !== inv.id).concat(res.invitation))
        toast.success(`Invitation resent to ${inv.email}`)
      }
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to resend invitation'))
    }
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!activeOrgId) return
    try {
      await orgService.changeMemberRole(activeOrgId, memberId, newRole)
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
      toast.success('Role updated')
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to change role'))
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!activeOrgId) return
    try {
      await orgService.removeMember(activeOrgId, memberId)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      await fetchMemberships()
      toast.success(`${memberName} removed`)
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to remove member'))
    }
  }

  const handleDeleteOrg = async () => {
    if (!activeOrgId || !org || deleteConfirm !== org.name) return
    setDeleting(true)
    try {
      await orgService.deleteOrg(activeOrgId)
      await fetchMemberships()
      toast.success('Organization deleted')
      window.location.reload()
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to delete organization'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading Organization..." state="processing" size="sm" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="body-2 text-muted-foreground">Organization not found</p>
      </div>
    )
  }

  const pendingInvitations = invitations.filter((i) => i.status === 'pending')

  return (
    <div className="p-spacing-4 md:p-spacing-8">
      <Tabs defaultValue="general" className="space-y-spacing-4 sm:space-y-spacing-6 max-w-3xl">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">
            Members{members.length > 0 && ` (${members.length})`}
          </TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        {/* ── General Tab ── */}
        <TabsContent value="general">
          <div className="space-y-spacing-6">
            <div className="section-card p-spacing-6">
              <div className="space-y-spacing-4">
                <OrgLogoPicker value={logoUrl} onChange={setLogoUrl} disabled={!isOwner} />

                <div>
                  <label className="body-3 text-muted-foreground mb-spacing-1 block">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isOwner}
                    className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="body-3 text-muted-foreground mb-spacing-1 block">Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '')
                          .slice(0, 48),
                      )
                    }
                    disabled={!isOwner}
                    className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <p className="body-3 text-muted-foreground mt-spacing-1">
                    {formatOrgPublicUrl(slug)}
                  </p>
                </div>

                <div>
                  <label className="body-3 text-muted-foreground mb-spacing-1 block">
                    Account Type
                  </label>
                  <input
                    type="text"
                    value={org.account_type === 'agency' ? 'Agency' : 'Team'}
                    disabled
                    className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border bg-secondary text-muted-foreground w-full cursor-not-allowed border"
                  />
                </div>
              </div>

              {isOwner && (
                <div className="mt-spacing-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving || !name.trim() || !slug.trim()}
                    className="button-glass-accent rounded-spacing-2 px-spacing-6 py-spacing-2 body-2 gap-spacing-2 flex items-center font-medium disabled:opacity-50"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            {/* Danger Zone — owner only */}
            {isOwner && (
              <div className="section-card border-[var(--color-destructive)]/30 p-spacing-6 border">
                <div className="mb-spacing-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-[var(--color-destructive)]" />
                  <h3 className="body-1 font-medium text-[var(--color-destructive)]">
                    DANGER ZONE
                  </h3>
                </div>
                <p className="body-3 text-muted-foreground mb-spacing-4">
                  Deleting this organization is permanent and cannot be undone. All members will
                  lose access.
                </p>
                <div className="space-y-spacing-3">
                  <div>
                    <label className="body-3 text-muted-foreground mb-spacing-1 block">
                      Type <span className="text-foreground font-medium">{org.name}</span> to
                      confirm
                    </label>
                    <input
                      type="text"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder={org.name}
                      className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
                    />
                  </div>
                  <button
                    onClick={handleDeleteOrg}
                    disabled={deleting || deleteConfirm !== org.name}
                    className="button-glass-destructive rounded-spacing-2 px-spacing-4 py-spacing-2 body-2 gap-spacing-2 flex items-center font-medium disabled:opacity-50"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete Organization
                  </button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Members Tab ── */}
        <TabsContent value="members">
          <div className="space-y-spacing-6">
            {/* Invite Form */}
            {hasMinRole('admin') && (
              <div className="section-card p-spacing-6">
                <h3 className="body-1 mb-spacing-4 flex items-center gap-2 font-medium">
                  <UserPlus className="text-muted-foreground h-5 w-5" />
                  INVITE MEMBER
                </h3>
                <div className="gap-spacing-3 flex flex-col sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label className="body-3 text-muted-foreground mb-spacing-1 block">Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
                    />
                  </div>
                  <div className="w-full sm:w-36">
                    <label className="body-3 text-muted-foreground mb-spacing-1 block">Role</label>
                    <RoleDropdown value={inviteRole} onChange={setInviteRole} />
                  </div>
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim()}
                    className="button-glass-accent rounded-spacing-2 px-spacing-4 py-spacing-2 body-2 gap-spacing-2 h-spacing-10 flex items-center font-medium disabled:opacity-50"
                  >
                    {inviting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Send Invite
                  </button>
                </div>
              </div>
            )}

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <div className="section-card p-spacing-6">
                <h3 className="body-1 mb-spacing-4 font-medium">
                  PENDING INVITATIONS ({pendingInvitations.length})
                </h3>
                <div className="space-y-spacing-2">
                  {pendingInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="gap-spacing-3 rounded-spacing-2 border-border px-spacing-4 py-spacing-3 flex items-center justify-between border"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="body-2 text-foreground truncate">{inv.email}</p>
                        <p className="body-3 text-muted-foreground">
                          {ROLE_LABELS[inv.role] ?? inv.role} &middot; Expires{' '}
                          {new Date(inv.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      {hasMinRole('admin') && (
                        <div className="gap-spacing-1 flex flex-shrink-0 items-center">
                          <Tooltip label="Resend invitation" side="top" delayMs={200}>
                            <button
                              onClick={() => void handleResendInvite(inv)}
                              className="btn-icon-glass"
                            >
                              <RefreshCw className="icon-sm" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Revoke invitation" side="top" delayMs={200}>
                            <button
                              onClick={() => handleRevokeInvite(inv.id)}
                              className="btn-icon-glass-destructive"
                            >
                              <X className="icon-sm" />
                            </button>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members List */}
            <div className="section-card p-spacing-6">
              <h3 className="body-1 mb-spacing-4 font-medium">MEMBERS ({members.length})</h3>
              <div className="space-y-spacing-2">
                {members.map((member) => {
                  const profile = member.profiles
                  const memberName = profile?.full_name || 'Unknown'
                  const memberInitials = memberName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                  const isMemberOwner = member.role === 'owner'
                  const isSelf = currentUserId != null && member.user_id === currentUserId

                  return (
                    <div
                      key={member.id}
                      className="gap-spacing-3 rounded-spacing-2 border-border px-spacing-4 py-spacing-3 flex items-center border"
                    >
                      <div className="bg-primary flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={memberName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-primary-foreground text-xs font-medium">
                            {memberInitials}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="body-2 text-foreground truncate">
                          {memberName}
                          {isSelf && <span className="text-muted-foreground ml-1">(you)</span>}
                        </p>
                        <p className="body-3 text-muted-foreground truncate">
                          {profile?.email ??
                            (member.accepted_at
                              ? `Joined ${new Date(member.accepted_at).toLocaleDateString()}`
                              : `Joined ${new Date(member.created_at).toLocaleDateString()}`)}
                        </p>
                      </div>

                      {/* Role badge or selector */}
                      {isMemberOwner || isSelf || !hasMinRole('admin') ? (
                        <span className="body-3 rounded-spacing-1 border-border gap-spacing-1 flex items-center border px-2 py-1 font-medium">
                          {isMemberOwner && <Shield className="h-3 w-3" />}
                          {ROLE_LABELS[member.role] ?? member.role}
                        </span>
                      ) : (
                        <RoleDropdown
                          value={member.role}
                          onChange={(role) => handleChangeRole(member.id, role)}
                          compact
                        />
                      )}

                      {/* Remove button */}
                      {!isMemberOwner && !isSelf && hasMinRole('admin') && (
                        <button
                          onClick={() => handleRemoveMember(member.id, memberName)}
                          className="btn-icon-glass-destructive flex-shrink-0"
                          title="Remove member"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Team Tab ── */}
        <TabsContent value="team">
          <TeamTabPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RoleDropdown({
  value,
  onChange,
  compact = false,
}: {
  value: string
  onChange: (role: string) => void
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !ref.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={
          compact
            ? 'body-3 rounded-spacing-1 border-border surface-bg gap-spacing-1 flex items-center border py-1 pl-2 pr-1 font-medium'
            : 'h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg text-foreground flex w-full items-center justify-between border'
        }
      >
        <span>{ROLE_LABELS[value] ?? value}</span>
        <ChevronDown
          className={compact ? 'text-muted-foreground h-3 w-3' : 'text-muted-foreground h-4 w-4'}
        />
      </button>
      {open && (
        <div className="mt-spacing-1 z-dropdown absolute right-0 top-full" data-dropdown>
          <div className="dropdown-menu-solid p-spacing-1 min-w-36">
            <div className="space-y-spacing-0">
              {INVITABLE_ROLES.map((role) => {
                const isSelected = value === role
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      onChange(role)
                      setOpen(false)
                    }}
                    className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left ${
                      isSelected
                        ? 'bg-primary/10 text-foreground'
                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="font-medium">{ROLE_LABELS[role]}</span>
                    {isSelected && <Check className="icon-sm text-primary" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
