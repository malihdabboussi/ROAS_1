'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  Bot,
  Brain,
  Building2,
  GraduationCap,
  LayoutGrid,
  Plus,
  Share2,
  User,
  UserRound,
  Users,
} from 'lucide-react'
import { ShareModal } from '@/components/org'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { BrainScopeContextMenu } from '@/features/brain/components/BrainScopeContextMenu'
import { useBrainScopeMenuActions } from '@/features/brain/hooks/use-brain-scope-menu-actions'
import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'
import { useBrainScopeNavOptions } from '@/features/brain/hooks/use-brain-scope-nav-options'
import { dispatchBrainAddAgentModal } from '@/features/brain/lib/brain-agent-modal.events'
import { brainHomeHref } from '@/features/brain/lib/brain-scope-nav'
import { dispatchBrainTrainModal } from '@/features/brain/lib/brain-training-modal.events'
import {
  BrainScopeRow,
  CAMPAIGN_KNOWLEDGE_RECENT_LIMIT,
  EnableBrainRow,
  scopeRowIcon,
  sectionHeader,
  USER_BRAIN_RECENT_LIMIT,
} from './SidebarBrainFlyoutRows'

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
  const [userBrainsExpanded, setUserBrainsExpanded] = useState(false)

  const {
    userBrain,
    personBrains,
    sharedBrains,
    companyBrain,
    customerBrain,
    agentBrains,
    campaignKnowledge,
  } = useMemo(() => {
    const user =
      scopeOptions.find((o) => o.scopeType === 'user') ??
      scopeOptions.find((o) => o.id === 'user') ??
      null
    const customer = scopeOptions.find((o) => o.scopeType === 'customer') ?? null
    const company = scopeOptions.find((o) => o.scopeType === 'company') ?? null
    const cmp = (a: BrainScopeNavOption, b: BrainScopeNavOption) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
    const sharedBrains = scopeOptions.filter((o) => o.scopeType === 'shared').sort(cmp)
    const personBrains = scopeOptions.filter((o) => o.scopeType === 'person').sort(cmp)
    const agentBrains = scopeOptions.filter((o) => o.scopeType === 'agent').sort(cmp)
    const campaignKnowledge = scopeOptions
      .filter((o) => o.scopeType === 'campaign_knowledge')
      .sort(cmp)
    return {
      userBrain: user,
      personBrains,
      sharedBrains,
      companyBrain: company,
      customerBrain: customer,
      agentBrains,
      campaignKnowledge,
    }
  }, [scopeOptions])

  const peopleAndShared = useMemo(
    () => [...personBrains, ...sharedBrains],
    [personBrains, sharedBrains],
  )

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
        <div className="px-3 py-1">
          <ListSkeleton rows={3} label="Loading…" />
        </div>
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
                icon={scopeRowIcon(userBrain, User)}
                menuOpen={isMenuOpenFor(userBrain.id)}
                onOpenMenu={openMenu}
              />
            ) : (
              <EnableBrainRow onNavigate={onNavigate} />
            )}
            {(userBrainsExpanded ? peopleAndShared : peopleAndShared.slice(0, USER_BRAIN_RECENT_LIMIT)).map(
              (option) => (
                <BrainScopeRow
                  key={option.id}
                  option={option}
                  pathname={pathname}
                  currentScope={currentScope}
                  onNavigate={onNavigate}
                  icon={scopeRowIcon(
                    option,
                    option.scopeType === 'shared' ? Share2 : UserRound,
                  )}
                  menuOpen={isMenuOpenFor(option.id)}
                  onOpenMenu={openMenu}
                />
              ),
            )}
            {peopleAndShared.length > USER_BRAIN_RECENT_LIMIT ? (
              <button
                type="button"
                onClick={() => setUserBrainsExpanded((v) => !v)}
                className="hover:bg-hover-subtle flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                <span className="inline-block h-5 w-5 shrink-0" aria-hidden />
                <span className="body-3">
                  {userBrainsExpanded
                    ? 'Show less'
                    : `Show more (${peopleAndShared.length - USER_BRAIN_RECENT_LIMIT})`}
                </span>
              </button>
            ) : null}
          </div>

          {companyBrain ? (
            <>
              <div className="hub-dock-flyout-divider" role="separator" />
              <div className="space-y-0.5">
                {sectionHeader('Company brains')}
                <BrainScopeRow
                  option={companyBrain}
                  pathname={pathname}
                  currentScope={currentScope}
                  onNavigate={onNavigate}
                  icon={scopeRowIcon(companyBrain, Building2)}
                  menuOpen={isMenuOpenFor(companyBrain.id)}
                  onOpenMenu={openMenu}
                />
              </div>
            </>
          ) : null}

          <div className="hub-dock-flyout-divider" role="separator" />
          <div className="space-y-0.5">
            {sectionHeader('Customer brains')}
            {customerBrain ? (
              <BrainScopeRow
                option={customerBrain}
                pathname={pathname}
                currentScope={currentScope}
                onNavigate={onNavigate}
                icon={scopeRowIcon(customerBrain, Users)}
                menuOpen={isMenuOpenFor(customerBrain.id)}
                onOpenMenu={openMenu}
              />
            ) : (
              <EnableBrainRow onNavigate={onNavigate} />
            )}
          </div>

          <div className="hub-dock-flyout-divider" role="separator" />
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
                  icon={scopeRowIcon(option, Bot)}
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

          <div className="hub-dock-flyout-divider" role="separator" />
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
                    icon={scopeRowIcon(option, Brain)}
                    menuOpen={isMenuOpenFor(option.id)}
                    onOpenMenu={openMenu}
                  />
                ))}
                {campaignKnowledge.length > CAMPAIGN_KNOWLEDGE_RECENT_LIMIT ? (
                  <button
                    type="button"
                    onClick={() => setCampaignKnowledgeExpanded((v) => !v)}
                    className="hover:bg-hover-subtle flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  >
                    <span className="inline-block h-5 w-5 shrink-0" aria-hidden />
                    <span className="body-3">
                      {campaignKnowledgeExpanded
                        ? 'Show less'
                        : `Show more (${campaignKnowledge.length - CAMPAIGN_KNOWLEDGE_RECENT_LIMIT})`}
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
