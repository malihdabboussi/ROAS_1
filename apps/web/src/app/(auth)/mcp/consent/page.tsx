'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { SettingsSelect } from '@/components/ui/forms/SettingsSelect'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { createClient } from '@/lib/supabase/client'

type McpPermissionLevel = 'none' | 'read' | 'write'

const MCP_BASE_SCOPE = 'mcp:tools'
const PERMISSION_LEVELS = ['none', 'read', 'write'] as const
const PERMISSION_LEVEL_LABELS: Record<McpPermissionLevel, string> = {
  none: 'None',
  read: 'Read',
  write: 'Write',
}
const PERMISSION_LEVEL_RANK: Record<McpPermissionLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
}

interface ConsentPreview {
  client_id: string
  client_name: string
  client_uri: string | null
  logo_uri: string | null
  resource: string
  scopes: string[]
  account: {
    type: 'personal' | 'organization'
    id: string | null
    name: string
    avatar_url: string | null
    role?: string | null
  }
  account_options: Array<{
    type: 'personal' | 'organization'
    id: string | null
    name: string
    avatar_url: string | null
    role?: string | null
  }>
  permissions: Array<{
    id: string
    label: string
    description: string
    readScopes: string[]
    writeScopes: string[]
    includedActions: string[]
    level: McpPermissionLevel
  }>
  org_id: string | null
  expires_at: string
}

function formatActionName(action: string): string {
  return action.replace(/_/g, ' ')
}

function isPermissionLevelAvailable(
  permission: ConsentPreview['permissions'][number],
  level: McpPermissionLevel,
): boolean {
  if (level === 'none') return true
  if (PERMISSION_LEVEL_RANK[level] > PERMISSION_LEVEL_RANK[permission.level]) return false
  if (level === 'read') return permission.readScopes.length > 0
  return permission.writeScopes.length > 0
}

function resolveSelectedScopes(
  permissions: ConsentPreview['permissions'],
  selectedPermissions: Record<string, McpPermissionLevel>,
): string[] {
  const scopes = new Set<string>()
  for (const permission of permissions) {
    const level = selectedPermissions[permission.id] ?? 'none'
    if (level === 'none') continue
    for (const scope of permission.readScopes) scopes.add(scope)
    if (level === 'write') {
      for (const scope of permission.writeScopes) scopes.add(scope)
    }
  }
  if (scopes.size > 0) scopes.add(MCP_BASE_SCOPE)
  return Array.from(scopes)
}

function resolveAllPermissionsLevel(
  permissions: ConsentPreview['permissions'],
  selectedPermissions: Record<string, McpPermissionLevel>,
): McpPermissionLevel | null {
  if (permissions.length === 0) return 'none'
  const levels = permissions.map((permission) => selectedPermissions[permission.id] ?? 'none')
  const first = levels[0] ?? null
  return levels.every((level) => level === first) ? first : null
}

function isAllPermissionsLevelAvailable(
  permissions: ConsentPreview['permissions'],
  level: McpPermissionLevel,
): boolean {
  if (level === 'none') return true
  return permissions.some((permission) => isPermissionLevelAvailable(permission, level))
}

function resolveAppliedPermissionLevel(
  permission: ConsentPreview['permissions'][number],
  level: McpPermissionLevel,
): McpPermissionLevel {
  if (level === 'none') return 'none'
  if (isPermissionLevelAvailable(permission, level)) return level
  if (level === 'write' && isPermissionLevelAvailable(permission, 'read')) return 'read'
  return 'none'
}

function applyAllPermissionsLevel(
  permissions: ConsentPreview['permissions'],
  level: McpPermissionLevel,
): Record<string, McpPermissionLevel> {
  return Object.fromEntries(
    permissions.map((permission) => [
      permission.id,
      resolveAppliedPermissionLevel(permission, level),
    ]),
  )
}

function permissionLevelButtonClass(selected: boolean, available: boolean): string {
  if (!available) {
    return 'button-glass-neutral cursor-not-allowed opacity-35 grayscale'
  }
  return selected ? 'button-glass-primary' : 'button-glass-neutral'
}

function PermissionLevelButtons({
  selectedLevel,
  onSelect,
  isLevelAvailable,
  disabled,
}: {
  selectedLevel: McpPermissionLevel | null
  onSelect: (level: McpPermissionLevel) => void
  isLevelAvailable: (level: McpPermissionLevel) => boolean
  disabled?: boolean
}) {
  return (
    <div className="gap-spacing-2 flex shrink-0 items-center">
      {PERMISSION_LEVELS.map((level) => {
        const available = isLevelAvailable(level)
        const selected = selectedLevel === level
        return (
          <button
            key={level}
            type="button"
            className={`button-compact ${permissionLevelButtonClass(selected, available)}`}
            disabled={!available || disabled}
            onClick={() => onSelect(level)}
          >
            {PERMISSION_LEVEL_LABELS[level]}
          </button>
        )
      })}
    </div>
  )
}

function PermissionAccordionDetails({
  expanded,
  description,
  includedActions,
}: {
  expanded: boolean
  description: string
  includedActions: string[]
}) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
        expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden">
        <div className="bg-secondary rounded-spacing-2 px-spacing-3 py-spacing-3 ml-spacing-6 mr-spacing-2 mt-spacing-2 space-y-spacing-2">
          <p className="body-4 text-muted-foreground">{description}</p>
          <p className="typo-caption text-muted-foreground">
            Includes {includedActions.map(formatActionName).join(', ')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function McpConsentPage() {
  const supabase = useMemo(() => createClient(), [])
  const [preview, setPreview] = useState<ConsentPreview | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<
    Record<string, McpPermissionLevel>
  >({})
  const [expandedPermissionIds, setExpandedPermissionIds] = useState<Record<string, boolean>>({})
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestId =
    typeof window !== 'undefined'
      ? new URL(window.location.href).searchParams.get('request_id')
      : null
  const clientId =
    typeof window !== 'undefined'
      ? new URL(window.location.href).searchParams.get('client_id')
      : null

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!requestId || !clientId) {
        setError('Missing MCP connection request.')
        setLoading(false)
        return
      }
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token || !session.refresh_token) {
        const redirect = `/mcp/consent?request_id=${encodeURIComponent(requestId)}&client_id=${encodeURIComponent(clientId)}`
        window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}`)
        return
      }
      setAccessToken(session.access_token)
      setRefreshToken(session.refresh_token)

      const response = await fetch(
        `/api/proxy/mcp/oauth/authorize-request/${encodeURIComponent(requestId)}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      )
      if (!response.ok) {
        setError('This MCP connection request is no longer valid.')
        setLoading(false)
        return
      }
      const body = (await response.json()) as ConsentPreview
      if (!cancelled) {
        setPreview(body)
        setSelectedAccountId(body.account.id)
        setSelectedPermissions(
          Object.fromEntries(
            body.permissions.map((permission) => [permission.id, permission.level]),
          ),
        )
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [clientId, requestId, supabase])

  async function submitDecision(approved: boolean) {
    if (!requestId || !accessToken || !refreshToken) return
    setSubmitting(true)
    setError(null)
    const body = approved
      ? {
          request_id: requestId,
          selected_org_id: selectedAccountId,
          selected_scopes: preview
            ? resolveSelectedScopes(preview.permissions, selectedPermissions)
            : [],
        }
      : { request_id: requestId }
    const response = await fetch(`/api/proxy/mcp/oauth/${approved ? 'consent' : 'deny'}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-supabase-refresh-token': refreshToken,
        ...(selectedAccountId ? { 'x-org-id': selectedAccountId } : {}),
      },
      body: JSON.stringify(body),
    })
    const responseBody = (await response.json().catch(() => null)) as {
      redirect_uri?: string
      message?: string
    } | null
    if (!response.ok || !responseBody?.redirect_uri) {
      setSubmitting(false)
      setError(responseBody?.message ?? 'I could not finish this connection.')
      return
    }
    if (approved) {
      sessionStorage.setItem('vibey_mcp_oauth_redirect_uri', responseBody.redirect_uri)
      window.location.assign('/mcp/success')
      return
    }
    window.location.assign(responseBody.redirect_uri)
  }

  if (loading) {
    return <VibeyLoadingOrb size="lg" text="Getting this MCP connection ready..." />
  }

  if (error || !preview) {
    return (
      <section className="surface-card rounded-spacing-4 border-border p-spacing-6 max-w-lg border text-center">
        <h1 className="title-h6 text-foreground">CONNECT VIBEY</h1>
        <p className="body-2 mt-spacing-3 text-muted-foreground">
          {error ?? 'This MCP connection request is missing.'}
        </p>
      </section>
    )
  }

  const selectedAccount =
    preview.account_options.find((account) => account.id === selectedAccountId) ?? preview.account
  const accountSelectValue = selectedAccountId ?? 'personal'
  const accountSelectOptions = preview.account_options.map((account) => ({
    value: account.id ?? 'personal',
    label: account.name,
  }))
  const allPermissionsLevel = resolveAllPermissionsLevel(preview.permissions, selectedPermissions)

  function setPermissionLevel(permissionId: string, level: McpPermissionLevel) {
    setSelectedPermissions((current) => ({
      ...current,
      [permissionId]: level,
    }))
  }

  function setAllPermissionLevels(level: McpPermissionLevel) {
    if (!preview) return
    setSelectedPermissions(applyAllPermissionsLevel(preview.permissions, level))
  }

  function togglePermissionExpanded(permissionId: string) {
    setExpandedPermissionIds((current) => ({
      ...current,
      [permissionId]: !current[permissionId],
    }))
  }

  return (
    <section className="surface-card rounded-spacing-4 border-border flex max-h-[min(calc(100dvh-(var(--spacing-6)*2)),36rem)] w-full max-w-lg flex-col overflow-hidden border">
      <div className="scrollbar-thin p-spacing-6 min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-spacing-6">
          <h1 className="title-h6 text-foreground">
            {`${preview.client_name} would like to access your Vibey account`.toUpperCase()}
          </h1>
          <p className="body-2 text-muted-foreground">
            By continuing, you allow {preview.client_name} to use your Vibey data in accordance with
            their terms of service and privacy policy.
          </p>
          <div className="bg-secondary gap-spacing-3 rounded-spacing-3 px-spacing-3 py-spacing-2 flex items-center justify-between">
            <div className="gap-spacing-2 flex min-w-0 items-center">
              <div className="bg-card h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center rounded-full">
                <span className="body-4 text-muted-foreground">
                  {selectedAccount.name.slice(0, 1).toUpperCase()}
                </span>
              </div>
              <p className="body-2 text-foreground min-w-0 truncate">{selectedAccount.name}</p>
            </div>
            <SettingsSelect
              value={accountSelectValue}
              options={accountSelectOptions}
              disabled={submitting || preview.account_options.length <= 1}
              wrapperClassName="relative min-w-40 shrink-0"
              triggerClassName="gap-spacing-1 h-spacing-9 px-spacing-3 input-glass rounded-spacing-2 flex min-w-40 items-center justify-between transition-colors disabled:opacity-60"
              onChange={(value) => setSelectedAccountId(value === 'personal' ? null : value)}
            />
          </div>
          <div>
            <p className="body-3 text-foreground font-medium">Permissions requested</p>
            <div className="mt-spacing-3">
              <div className="border-border gap-spacing-4 py-spacing-4 flex items-center justify-between border-t first:border-t-0">
                <p className="body-3 text-foreground min-w-0 flex-1 font-medium">All permissions</p>
                <PermissionLevelButtons
                  selectedLevel={allPermissionsLevel}
                  disabled={submitting}
                  isLevelAvailable={(level) =>
                    isAllPermissionsLevelAvailable(preview.permissions, level)
                  }
                  onSelect={setAllPermissionLevels}
                />
              </div>

              {preview.permissions.map((permission) => {
                const expanded = expandedPermissionIds[permission.id] ?? false
                return (
                  <div key={permission.id} className="border-border border-t first:border-t-0">
                    <div className="gap-spacing-4 py-spacing-2 flex items-center justify-between">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={`${expanded ? 'Hide' : 'Show'} ${permission.label} details`}
                        className="gap-spacing-2 hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 py-spacing-2 flex min-w-0 flex-1 items-center text-left transition-colors"
                        onClick={() => togglePermissionExpanded(permission.id)}
                      >
                        <ChevronRight
                          className={`icon-sm text-muted-foreground shrink-0 transition-transform duration-200 ease-in-out ${expanded ? 'rotate-90' : ''}`}
                          aria-hidden
                        />
                        <span className="body-3 text-foreground min-w-0 truncate font-medium">
                          {permission.label}
                        </span>
                      </button>
                      <PermissionLevelButtons
                        selectedLevel={selectedPermissions[permission.id] ?? 'none'}
                        disabled={submitting}
                        isLevelAvailable={(level) => isPermissionLevelAvailable(permission, level)}
                        onSelect={(level) => setPermissionLevel(permission.id, level)}
                      />
                    </div>

                    <PermissionAccordionDetails
                      expanded={expanded}
                      description={permission.description}
                      includedActions={permission.includedActions}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {error ? <p className="body-3 text-destructive">{error}</p> : null}
        </div>
      </div>

      <div className="px-spacing-6 pb-spacing-6 pt-spacing-4 shrink-0">
        <div className="gap-spacing-3 flex items-center justify-end">
          <button
            type="button"
            className="button-default button-glass-neutral"
            disabled={submitting}
            onClick={() => void submitDecision(false)}
          >
            Not now
          </button>
          <button
            type="button"
            className="button-default button-glass-primary"
            disabled={submitting}
            onClick={() => void submitDecision(true)}
          >
            Connect Vibey
          </button>
        </div>
      </div>
    </section>
  )
}
