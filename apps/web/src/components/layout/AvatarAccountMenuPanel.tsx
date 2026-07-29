'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Building2, ChevronRight, LogOut, Plus, Rocket, Settings, Star, User } from 'lucide-react'
import { toast } from 'sonner'
import { CreditPurchaseDialog } from '@/features/billing/components/CreditPurchaseDialog'
import { ImpersonationClientsSection } from '@/features/impersonation/components/ImpersonationClientsSection'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useAccountSettingsModal } from '@/features/settings/contexts/AccountSettingsModalContext'
import { useWorkspaceSettingsModal } from '@/features/settings/contexts/WorkspaceSettingsModalContext'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { backendPatch } from '@/lib/api/backend-client'
import { billingApi } from '@/lib/billing/billing-api'
import type { BillingStatusResponse } from '@/lib/billing/billing.types'
import { resolveMarketingSiteUrl } from '@/lib/platform/platform-urls'
import { createClient } from '@/lib/supabase/client'
import { clearOrgSensitiveState, navigateHomeAfterOrgSwitch } from '@/lib/utils/clear-org-state'
import { clearActiveOrgStorage } from '@/lib/utils/org-storage'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { AvatarRoleSimulatorSection } from './AvatarRoleSimulatorSection'
import { SIDEBAR_TOAST_ERRORS } from './config/sidebar-toast-errors.config'
import { CreditsSummarySection } from './CreditsSummarySection'

export type AvatarAccountMenuPanelProps = {
  email: string
  featureUpdates?: { hasUnread: boolean; onOpen: (anchor: HTMLElement) => void }
  /** Anchor used when opening the Updates panel from this menu. */
  updatesAnchorRef?: React.RefObject<HTMLElement | null>
  onClose: () => void
}

/** Account card body: credits, settings, org switcher, logout. Shared by avatar trigger + More flyout. */
export function AvatarAccountMenuPanel({
  email,
  featureUpdates,
  updatesAnchorRef,
  onClose,
}: AvatarAccountMenuPanelProps) {
  const { openAccountSettings } = useAccountSettingsModal()
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const { activeOrgId, hasMinRole } = useOrgStore()
  const showOrgSettings = !!activeOrgId && hasMinRole('admin')
  const [creditDialogOpen, setCreditDialogOpen] = React.useState(false)

  React.useEffect(() => {
    const handler = () => setCreditDialogOpen(true)
    window.addEventListener('open-credit-purchase', handler)
    return () => window.removeEventListener('open-credit-purchase', handler)
  }, [])

  const storeCreditBalance = useChatStore((s) => s.creditBalance)
  const setStoreCreditBalance = useChatStore((s) => s.setCreditBalance)
  const [billingStatus, setBillingStatus] = React.useState<BillingStatusResponse | null>(null)
  const [creditsLoading, setCreditsLoading] = React.useState(false)
  const [initialCreditsFetched, setInitialCreditsFetched] = React.useState(false)

  const loadCredits = React.useCallback(
    async (opts?: { force?: boolean }) => {
      setCreditsLoading(true)
      try {
        const data = await billingApi.getStatusCached(opts)
        setBillingStatus(data)
        if (data.balance) {
          setStoreCreditBalance({
            totalAvailable: data.balance.totalAvailable,
            totalUsed: data.balance.totalUsed,
            baseCredits: data.balance.baseCredits,
          })
        }
      } catch {
        setBillingStatus(null)
      } finally {
        setCreditsLoading(false)
        setInitialCreditsFetched(true)
      }
    },
    [setStoreCreditBalance],
  )

  React.useEffect(() => {
    void loadCredits({ force: true })
  }, [activeOrgId, loadCredits])

  const creditRemaining = storeCreditBalance?.totalAvailable ?? 0
  const balanceKnown =
    billingStatus?.balance != null || (initialCreditsFetched && storeCreditBalance != null)

  const handleSignOut = async () => {
    clearActiveOrgStorage()
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = resolveMarketingSiteUrl()
  }

  const closeAnd = (action: () => void) => {
    onClose()
    window.dispatchEvent(new CustomEvent('close-mobile-sidebar'))
    action()
  }

  return (
    <>
      <CreditsSummarySection
        status={billingStatus}
        loading={creditsLoading}
        displayTotal={creditRemaining}
        balanceKnown={balanceKnown}
        onAddCredits={() => {
          setCreditDialogOpen(true)
        }}
        onViewUsage={() => closeAnd(() => openAccountSettings('usage'))}
      />

      <div className="border-b border-[var(--color-border)] py-1">
        <MenuItem
          icon={<User className="h-4 w-4" />}
          label="Account Settings"
          onClick={() => closeAnd(() => openAccountSettings())}
        />
        <MenuItem
          icon={<Settings className="h-4 w-4" />}
          label="Workspace Settings"
          onClick={() => closeAnd(() => openWorkspaceSettings())}
        />
        {featureUpdates ? (
          <MenuItem
            icon={<Rocket className="h-4 w-4" />}
            label="Updates"
            showUnreadDot={featureUpdates.hasUnread}
            onClick={() => {
              onClose()
              window.dispatchEvent(new CustomEvent('close-mobile-sidebar'))
              const anchor = updatesAnchorRef?.current
              if (anchor) featureUpdates.onOpen(anchor)
            }}
          />
        ) : null}
      </div>

      <OrgSwitcherSection onClose={onClose} />
      <AvatarRoleSimulatorSection onClose={onClose} />

      {showOrgSettings ? (
        <div className="border-b border-[var(--color-border)] py-1">
          <MenuItem
            icon={<Building2 className="h-4 w-4" />}
            label="Organization Settings"
            onClick={() => closeAnd(() => openAccountSettings('organization'))}
          />
        </div>
      ) : null}

      <div className="py-1">
        <div className="border-border border-b px-3 py-2">
          <p className="body-3 text-muted-foreground truncate">{email}</p>
        </div>
        <MenuItem icon={<LogOut className="h-4 w-4" />} label="Log out" onClick={handleSignOut} />
      </div>

      <CreditPurchaseDialog
        open={creditDialogOpen}
        onClose={() => {
          setCreditDialogOpen(false)
          void loadCredits({ force: true })
        }}
        currentCredits={creditRemaining}
      />
    </>
  )
}

const ORG_SUBMENU_WIDTH = 224
type DefaultAccountMode = 'personal' | 'org'
type DefaultAccountResponse = {
  ok: true
  default_account_mode: DefaultAccountMode
  default_org_id: string | null
}

function OrgSwitcherSection({ onClose }: { onClose: () => void }) {
  const {
    activeOrgId,
    memberships,
    setActiveOrg,
    fetchMemberships,
    isLoaded,
    isOrgOnly,
    defaultAccountMode,
    defaultOrgId,
    setDefaultAccountPreference,
  } = useOrgStore()
  const [subMenuOpen, setSubMenuOpen] = React.useState(false)
  const [savingDefaultKey, setSavingDefaultKey] = React.useState<string | null>(null)
  const subTriggerRef = React.useRef<HTMLButtonElement>(null)
  const subMenuRef = React.useRef<HTMLDivElement>(null)
  const [subMenuPos, setSubMenuPos] = React.useState({ top: 0, left: 0 })

  React.useEffect(() => {
    if (!isLoaded) void fetchMemberships()
  }, [isLoaded, fetchMemberships])

  React.useLayoutEffect(() => {
    if (!subMenuOpen || !subTriggerRef.current) return

    const update = () => {
      const el = subTriggerRef.current
      const panel = subMenuRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const gap = 4
      const margin = 8
      let left = rect.right + gap
      if (left + ORG_SUBMENU_WIDTH > window.innerWidth - margin) {
        left = rect.left - ORG_SUBMENU_WIDTH - gap
      }
      if (left < margin) {
        left = window.innerWidth - ORG_SUBMENU_WIDTH - margin
      }
      if (left < margin) left = margin
      const panelH = panel?.offsetHeight ?? 0
      let top = rect.bottom - panelH
      if (top < margin) top = margin
      setSubMenuPos({ top, left })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [subMenuOpen])

  React.useEffect(() => {
    if (!subMenuOpen) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (subTriggerRef.current?.contains(target) || subMenuRef.current?.contains(target)) {
        return
      }
      setSubMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [subMenuOpen])

  const activeOrg = memberships.find((m) => m.org_id === activeOrgId)
  const activeLabel = activeOrg ? activeOrg.organizations.name : 'Personal Account'
  const ActiveIcon = activeOrg ? Building2 : User

  const closeSubAndMain = () => {
    setSubMenuOpen(false)
    onClose()
  }

  const saveDefaultAccount = React.useCallback(
    async (mode: DefaultAccountMode, orgId: string | null) => {
      const key = mode === 'org' && orgId ? orgId : 'personal'
      const alreadyDefault =
        mode === 'personal'
          ? defaultAccountMode === 'personal'
          : defaultAccountMode === 'org' && defaultOrgId === orgId
      if (alreadyDefault || savingDefaultKey) return

      setSavingDefaultKey(key)
      try {
        const saved = await backendPatch<DefaultAccountResponse>(
          '/api/profile/default-account',
          { mode, orgId },
          { orgId: null },
        )
        setDefaultAccountPreference(saved.default_account_mode, saved.default_org_id)
      } catch (err) {
        toast.error(
          sanitizeUserError(err, SIDEBAR_TOAST_ERRORS.DEFAULT_ACCOUNT_SAVE_FAILED.userMessage),
        )
      } finally {
        setSavingDefaultKey(null)
      }
    },
    [defaultAccountMode, defaultOrgId, savingDefaultKey, setDefaultAccountPreference],
  )

  return (
    <div className="border-b border-[var(--color-border)] py-1">
      <button
        ref={subTriggerRef}
        type="button"
        onClick={() => setSubMenuOpen(!subMenuOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
      >
        <ActiveIcon className="text-muted-foreground h-4 w-4 flex-shrink-0" />
        <span className="body-2 min-w-0 flex-1 truncate text-left">{activeLabel}</span>
        <ChevronRight className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
      </button>

      {subMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={subMenuRef}
            data-avatar-dropdown
            className="border-border bg-card text-card-foreground rounded-spacing-2 fixed z-[1000] w-56 overflow-hidden border shadow-lg"
            style={{ top: subMenuPos.top, left: subMenuPos.left }}
          >
            {!isOrgOnly ? (
              <div
                className={`group flex w-full items-center transition-colors ${
                  !activeOrgId ? 'avatar-org-submenu-row-selected' : 'hover:bg-hover-subtle'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!activeOrgId) {
                      setSubMenuOpen(false)
                      return
                    }
                    setActiveOrg(null)
                    clearOrgSensitiveState()
                    closeSubAndMain()
                    navigateHomeAfterOrgSwitch()
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2"
                >
                  <User className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                  <span className="body-3 min-w-0 flex-1 truncate text-left">Personal Account</span>
                </button>
                <DefaultAccountButton
                  active={defaultAccountMode === 'personal'}
                  saving={savingDefaultKey === 'personal'}
                  label="Make Personal Account the default"
                  onClick={() => saveDefaultAccount('personal', null)}
                />
              </div>
            ) : null}

            {memberships.map((m) => {
              const selected = activeOrgId === m.org_id
              const isDefault = defaultAccountMode === 'org' && defaultOrgId === m.org_id
              return (
                <div
                  key={m.org_id}
                  className={`group flex w-full items-center transition-colors ${
                    selected ? 'avatar-org-submenu-row-selected' : 'hover:bg-hover-subtle'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (selected) {
                        setSubMenuOpen(false)
                        return
                      }
                      setActiveOrg(m.org_id)
                      clearOrgSensitiveState()
                      closeSubAndMain()
                      navigateHomeAfterOrgSwitch()
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2"
                  >
                    <Building2 className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                    <span className="body-3 min-w-0 flex-1 truncate text-left">
                      {m.organizations.name}
                    </span>
                  </button>
                  <DefaultAccountButton
                    active={isDefault}
                    saving={savingDefaultKey === m.org_id}
                    label={`Make ${m.organizations.name} the default`}
                    onClick={() => saveDefaultAccount('org', m.org_id)}
                  />
                </div>
              )
            })}

            {!isOrgOnly ? (
              <button
                type="button"
                onClick={() => {
                  setSubMenuOpen(false)
                  onClose()
                  window.dispatchEvent(new CustomEvent('open-create-org'))
                }}
                className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-[var(--color-secondary)]"
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span className="body-3">New Organization</span>
              </button>
            ) : null}

            <ImpersonationClientsSection onSelect={closeSubAndMain} />
          </div>,
          document.body,
        )}
    </div>
  )
}

function DefaultAccountButton({
  active,
  saving,
  label,
  onClick,
}: {
  active: boolean
  saving: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={active ? 'Default account' : label}
      aria-pressed={active}
      title={active ? 'Default account' : label}
      disabled={saving}
      onClick={onClick}
      className={`btn-icon-bare-sm mr-spacing-2 shrink-0 ${
        active ? 'opacity-100' : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100'
      } ${saving ? 'cursor-wait opacity-60' : ''}`}
    >
      <Star className={`icon-sm ${active ? 'fill-primary text-primary' : ''}`} />
    </button>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  active = false,
  showUnreadDot = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  showUnreadDot?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)] ${
        active ? 'bg-[var(--color-secondary)]' : ''
      }`}
    >
      {icon}
      <span className="body-2">{label}</span>
      {showUnreadDot ? (
        <span className="bg-primary ml-auto h-2 w-2 shrink-0 rounded-full" />
      ) : null}
    </button>
  )
}
