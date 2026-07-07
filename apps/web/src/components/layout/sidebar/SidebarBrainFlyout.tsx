'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo, useState, type ReactNode } from 'react'
import {
  Bot,
  Brain,
  Building2,
  GraduationCap,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Share2,
  User,
  Users,
} from 'lucide-react'
import { ShareModal } from '@/components/org'
import { BrainScopeContextMenu } from '@/features/brain/components/BrainScopeContextMenu'
import { useBrainScopeMenuActions } from '@/features/brain/hooks/use-brain-scope-menu-actions'
import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'
import { useBrainScopeNavOptions } from '@/features/brain/hooks/use-brain-scope-nav-options'
import { dispatchBrainAddAgentModal } from '@/features/brain/lib/brain-agent-modal.events'
import { brainHomeHref, brainScopeHref } from '@/features/brain/lib/brain-scope-nav'
import { dispatchBrainTrainModal } from '@/features/brain/lib/brain-training-modal.events'
import { useTeam2Perms } from '@/features/team-2/hooks/use-team2-perms'
import { useOrgStore } from '@/lib/org'

const CAMPAIGN_KNOWLEDGE_RECENT_LIMIT = 5

const CUSTOMER_PLACEHOLDER_OPTION: BrainScopeNavOption = {
  id: 'customer',
  label: 'Customer Brain',
  agentId: null,
  brainId: null,
  scopeType: 'customer',
}

function scopeRowIcon(option: BrainScopeNavOption, fallback: ReactNode): ReactNode {
  const imageUrl = option.imageUrl?.trim()
  if (imageUrl) {
    return <img src={imageUrl} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />
  }
  return fallback
}

function sectionHeader(label: string) {
  return (
    <div className="flex items-center justify-between px-3 pb-1 pt-1">
      <span className="text-[10px] font-medium tracking-wider text-[var(--color-muted-foreground)]">
        {label}
      </span>
    </div>
  )
}

function BrainScopeRow({
  option,
  pathname,
  currentScope,
  onNavigate,
  icon,
  menuOpen,
  onOpenMenu,
}: {
  option: BrainScopeNavOption
  pathname: string
  currentScope: string | null
  onNavigate?: () => void
  icon: ReactNode
  menuOpen: boolean
  onOpenMenu: (option: BrainScopeNavOption, clientX: number, clientY: number) => void
}) {
  const isActive = pathname.startsWith('/brain') && currentScope === option.id

  const openMenuAt = (clientX: number, clientY: number) => {
    onOpenMenu(option, clientX, clientY)
  }

  const openMenuFromButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    onOpenMenu(option, rect.right - 224, rect.bottom + 4)
  }

  return (
    <div
      className="group/brain-scope relative flex items-center"
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openMenuAt(e.clientX, e.clientY)
      }}
    >
      <Link
        href={brainScopeHref(option.id)}
        onClick={() => onNavigate?.()}
        className={`nav-glass-hover-purple body-3 flex w-full items-center gap-2 rounded-lg py-1.5 pl-3 pr-8 transition-all ${
          isActive ? 'home-sidebar-item-active' : 'text-[var(--color-muted-foreground)]'
        }`}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
      </Link>
      <div className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
        <button
          type="button"
          aria-label="Brain actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={openMenuFromButton}
          className={`absolute inset-0 flex items-center justify-center rounded p-0.5 text-[var(--color-muted-foreground)] transition-opacity hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] ${
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover/brain-scope:opacity-100'
          }`}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function CustomerBrainPlaceholderRow({
  menuOpen,
  onOpenMenu,
}: {
  menuOpen: boolean
  onOpenMenu: (option: BrainScopeNavOption, clientX: number, clientY: number) => void
}) {
  const openMenuAt = (clientX: number, clientY: number) => {
    onOpenMenu(CUSTOMER_PLACEHOLDER_OPTION, clientX, clientY)
  }

  const openMenuFromButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    onOpenMenu(CUSTOMER_PLACEHOLDER_OPTION, rect.right - 224, rect.bottom + 4)
  }

  return (
    <div
      className="group/brain-scope relative flex items-center"
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        openMenuAt(e.clientX, e.clientY)
      }}
    >
      <div className="body-3 flex w-full items-center gap-2 rounded-lg py-1.5 pl-3 pr-8 text-[var(--color-muted-foreground)]">
        <Users className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">No customer brain yet</span>
      </div>
      <div className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
        <button
          type="button"
          aria-label="Customer brain actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={openMenuFromButton}
          className={`absolute inset-0 flex items-center justify-center rounded p-0.5 text-[var(--color-muted-foreground)] transition-opacity hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] ${
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover/brain-scope:opacity-100'
          }`}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function SidebarBrainNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentScope = searchParams.get('scope') ?? null
  const { scopeOptions, agentsWithoutBrain, loading } = useBrainScopeNavOptions()
  const { getMenuContext, shareModalProps } = useBrainScopeMenuActions()
  const isOrg = useOrgStore((s) => s.isOrgContext())
  const perms = useTeam2Perms()
  const [menuState, setMenuState] = useState<{
    option: BrainScopeNavOption
    position: { x: number; y: number }
  } | null>(null)
  const [campaignKnowledgeExpanded, setCampaignKnowledgeExpanded] = useState(false)

  const { userBrain, sharedBrains, companyBrain, customerBrain, agentBrains, campaignKnowledge } =
    useMemo(() => {
      const user =
        scopeOptions.find((o) => o.scopeType === 'user') ??
        scopeOptions.find((o) => o.id === 'user') ??
        null
      const customer = scopeOptions.find((o) => o.scopeType === 'customer') ?? null
      const company = scopeOptions.find((o) => o.scopeType === 'company') ?? null
      const cmp = (a: BrainScopeNavOption, b: BrainScopeNavOption) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
      const sharedBrains = scopeOptions.filter((o) => o.scopeType === 'shared').sort(cmp)
      const agentBrains = scopeOptions.filter((o) => o.scopeType === 'agent').sort(cmp)
      const campaignKnowledge = scopeOptions
        .filter((o) => o.scopeType === 'campaign_knowledge')
        .sort(cmp)
      return {
        userBrain: user,
        sharedBrains,
        companyBrain: company,
        customerBrain: customer,
        agentBrains,
        campaignKnowledge,
      }
    }, [scopeOptions])

  const showCustomerPlaceholderMenu = isOrg && perms.isAdmin && !customerBrain

  const openMenu = (option: BrainScopeNavOption, clientX: number, clientY: number) => {
    setMenuState({ option, position: { x: clientX, y: clientY } })
  }

  const closeMenu = () => setMenuState(null)

  const menuCtx = menuState ? getMenuContext(menuState.option) : null
  const isMenuOpenFor = (optionId: string) => menuState?.option.id === optionId

  const isManageBrainsActive = pathname === '/brain' && !currentScope

  return (
    <div>
      <div className="mb-3 space-y-0.5">
        <Link
          href={brainHomeHref()}
          onClick={() => onNavigate?.()}
          className={`nav-glass-hover-purple body-3 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 transition-all ${
            isManageBrainsActive
              ? 'home-sidebar-item-active'
              : 'text-[var(--color-muted-foreground)]'
          }`}
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Manage Brains</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            dispatchBrainTrainModal()
          }}
          className="nav-glass-hover-purple body-3 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[var(--color-muted-foreground)] transition-all hover:text-[var(--foreground)]"
        >
          <GraduationCap className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">Train Brain</span>
        </button>
      </div>
      {loading ? (
        <p className="px-3 py-1 text-[11px] text-[var(--color-muted-foreground)]">Loading…</p>
      ) : (
        <div className="gap-spacing-6 flex flex-col">
          <div className="space-y-0.5">
            {sectionHeader('User brains')}
            {userBrain ? (
              <BrainScopeRow
                option={userBrain}
                pathname={pathname}
                currentScope={currentScope}
                onNavigate={onNavigate}
                icon={scopeRowIcon(userBrain, <User className="h-4 w-4 shrink-0" />)}
                menuOpen={isMenuOpenFor(userBrain.id)}
                onOpenMenu={openMenu}
              />
            ) : (
              <p className="px-3 py-1 text-[11px] text-[var(--color-muted-foreground)]">
                No user brain yet
              </p>
            )}
            {sharedBrains.map((option) => (
              <BrainScopeRow
                key={option.id}
                option={option}
                pathname={pathname}
                currentScope={currentScope}
                onNavigate={onNavigate}
                icon={scopeRowIcon(option, <Share2 className="h-4 w-4 shrink-0" />)}
                menuOpen={isMenuOpenFor(option.id)}
                onOpenMenu={openMenu}
              />
            ))}
          </div>

          {companyBrain ? (
            <div className="space-y-0.5">
              {sectionHeader('Company brains')}
              <BrainScopeRow
                option={companyBrain}
                pathname={pathname}
                currentScope={currentScope}
                onNavigate={onNavigate}
                icon={<Building2 className="h-4 w-4 shrink-0" />}
                menuOpen={isMenuOpenFor(companyBrain.id)}
                onOpenMenu={openMenu}
              />
            </div>
          ) : null}

          <div className="space-y-0.5">
            {sectionHeader('Customer brains')}
            {customerBrain ? (
              <BrainScopeRow
                option={customerBrain}
                pathname={pathname}
                currentScope={currentScope}
                onNavigate={onNavigate}
                icon={<Users className="h-4 w-4 shrink-0" />}
                menuOpen={isMenuOpenFor(customerBrain.id)}
                onOpenMenu={openMenu}
              />
            ) : showCustomerPlaceholderMenu ? (
              <CustomerBrainPlaceholderRow
                menuOpen={isMenuOpenFor(CUSTOMER_PLACEHOLDER_OPTION.id)}
                onOpenMenu={openMenu}
              />
            ) : (
              <p className="px-3 py-1 text-[11px] text-[var(--color-muted-foreground)]">
                No customer brain yet
              </p>
            )}
          </div>

          <div className="space-y-0.5">
            {sectionHeader('Agent brains')}
            {agentBrains.length === 0 ? (
              agentsWithoutBrain.length === 0 ? (
                <p className="px-3 py-1 text-[11px] text-[var(--color-muted-foreground)]">
                  No agent brains yet
                </p>
              ) : null
            ) : (
              agentBrains.map((option) => (
                <BrainScopeRow
                  key={option.id}
                  option={option}
                  pathname={pathname}
                  currentScope={currentScope}
                  onNavigate={onNavigate}
                  icon={scopeRowIcon(option, <Bot className="h-4 w-4 shrink-0" />)}
                  menuOpen={isMenuOpenFor(option.id)}
                  onOpenMenu={openMenu}
                />
              ))
            )}
            {agentsWithoutBrain.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onNavigate?.()
                  dispatchBrainAddAgentModal()
                }}
                className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="body-3">Add Agent Brain</span>
              </button>
            ) : null}
          </div>

          <div className="space-y-0.5">
            {sectionHeader('Campaign Knowledge')}
            {campaignKnowledge.length === 0 ? (
              <p className="px-3 py-1 text-[11px] text-[var(--color-muted-foreground)]">
                No campaigns yet
              </p>
            ) : (
              <>
                {(campaignKnowledgeExpanded
                  ? campaignKnowledge
                  : campaignKnowledge.slice(0, CAMPAIGN_KNOWLEDGE_RECENT_LIMIT)
                ).map((option) => (
                  <BrainScopeRow
                    key={option.id}
                    option={option}
                    pathname={pathname}
                    currentScope={currentScope}
                    onNavigate={onNavigate}
                    icon={<Brain className="h-4 w-4 shrink-0" />}
                    menuOpen={isMenuOpenFor(option.id)}
                    onOpenMenu={openMenu}
                  />
                ))}
                {campaignKnowledge.length > CAMPAIGN_KNOWLEDGE_RECENT_LIMIT ? (
                  <button
                    type="button"
                    onClick={() => setCampaignKnowledgeExpanded((v) => !v)}
                    className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  >
                    <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
                    <span className="body-3">
                      {campaignKnowledgeExpanded
                        ? 'See less'
                        : `See more (${campaignKnowledge.length - CAMPAIGN_KNOWLEDGE_RECENT_LIMIT})`}
                    </span>
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      {menuState && menuCtx ? (
        <BrainScopeContextMenu position={menuState.position} ctx={menuCtx} onClose={closeMenu} />
      ) : null}

      {shareModalProps ? (
        <ShareModal
          open={shareModalProps.open}
          onClose={shareModalProps.onClose}
          resourceType="brain"
          resourceId={shareModalProps.resourceId}
          resourceName={shareModalProps.resourceName}
        />
      ) : null}
    </div>
  )
}

export function SidebarBrainFlyout() {
  return (
    <>
      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          Brain
        </span>
      </div>
      <div className="scrollbar-hide flex-1 overflow-y-auto px-2 pb-2">
        <SidebarBrainNavLinks />
      </div>
    </>
  )
}
