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

const CAMPAIGN_KNOWLEDGE_RECENT_LIMIT = 5

function scopeRowIcon(option: BrainScopeNavOption, fallback: ReactNode): ReactNode {
  const imageUrl = option.imageUrl?.trim()
  if (imageUrl) {
    return <img src={imageUrl} alt="" className="hub-dock-flyout-avatar" />
  }
  return fallback
}

function sectionHeader(label: string) {
  return <p className="hub-dock-flyout-caption">{label}</p>
}

function EnableBrainRow({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href={brainHomeHref()}
      data-hub-dock-navigate
      onClick={() => onNavigate?.()}
      className="hub-dock-flyout-row hub-dock-flyout-row-muted"
    >
      <span className="min-w-0 flex-1 truncate">Enable in Manage Brains</span>
    </Link>
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
        data-hub-dock-navigate
        onClick={() => onNavigate?.()}
        className={`hub-dock-flyout-row pr-8 ${isActive ? 'hub-dock-flyout-row-active' : ''}`}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
          {icon}
        </span>
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

export function SidebarBrainNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentScope = searchParams.get('scope') ?? null
  const { scopeOptions, agentsWithoutBrain, loading } = useBrainScopeNavOptions()
  const { getMenuContext, shareModalProps } = useBrainScopeMenuActions()
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

  const openMenu = (option: BrainScopeNavOption, clientX: number, clientY: number) => {
    setMenuState({ option, position: { x: clientX, y: clientY } })
  }

  const closeMenu = () => setMenuState(null)

  const menuCtx = menuState ? getMenuContext(menuState.option) : null
  const isMenuOpenFor = (optionId: string) => menuState?.option.id === optionId

  const isManageBrainsActive = pathname === '/brain' && !currentScope

  return (
    <div>
      <div className="mb-2 space-y-0.5">
        <Link
          href={brainHomeHref()}
          data-hub-dock-navigate
          onClick={() => onNavigate?.()}
          className={`hub-dock-flyout-row ${isManageBrainsActive ? 'hub-dock-flyout-row-active' : ''}`}
        >
          <LayoutGrid />
          <span className="min-w-0 flex-1 truncate">Manage Brains</span>
        </Link>
        <button
          type="button"
          data-hub-dock-navigate
          onClick={() => {
            onNavigate?.()
            dispatchBrainTrainModal()
          }}
          className="hub-dock-flyout-row"
        >
          <GraduationCap />
          <span className="min-w-0 flex-1 truncate text-left">Train Brain</span>
        </button>
      </div>
      {loading ? (
        <p className="px-3 py-1 text-[11px] text-[var(--color-muted-foreground)]">Loading…</p>
      ) : (
        <div className="gap-spacing-1 flex flex-col">
          <div className="space-y-0.5">
            {sectionHeader('User brains')}
            {userBrain?.brainId ? (
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
              <EnableBrainRow onNavigate={onNavigate} />
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
            ) : (
              <EnableBrainRow onNavigate={onNavigate} />
            )}
          </div>

          <div className="space-y-0.5">
            {sectionHeader('Agent brains')}
            {agentBrains.length === 0 && agentsWithoutBrain.length === 0 ? (
              <EnableBrainRow onNavigate={onNavigate} />
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
                data-hub-dock-navigate
                onClick={() => {
                  onNavigate?.()
                  dispatchBrainAddAgentModal()
                }}
                className="hub-dock-flyout-row"
              >
                <Plus />
                <span className="min-w-0 flex-1 truncate text-left">Add Agent Brain</span>
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
  return <SidebarBrainNavLinks />
}
