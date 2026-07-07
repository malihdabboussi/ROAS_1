'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConversationChannelIcon } from '@/components/chat/ConversationChannelIcon'
import { ConversationShareModal } from '@/components/conversations'
import { ShareModal } from '@/components/org'
import { TransferDialog } from '@/components/transfer'
import { LucideIcon } from '@/components/ui/IconPicker'
import { Tooltip } from '@/components/ui/tooltip'
import { cachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import { createSpace } from '@/features/spaces/services/spaces.service'
import { CampaignTeamManageModal } from '@/features/team/components/CampaignTeamManageModal'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { Conversation } from '@/lib/conversations'
import { orgService, useOrgStore, type TeamRosterEntry } from '@/lib/org'
import { AgentsFlyoutPortal } from './AgentsFlyoutPortal'
import { CampaignsFlyoutPortal } from './CampaignsFlyoutPortal'
import { STUDIO_SIDEBAR_ORG_CONTEXT_LABEL } from './sidebar-studio-labels'
import type { SidebarCampaignRow } from './sidebar-types'
import { SidebarCampaignMenuPortal } from './SidebarCampaignMenuPortal'
import { SidebarConversationMenuPortal } from './SidebarConversationMenuPortal'
import type { SidebarControllerReturn } from './useSidebarController'

export function SidebarStudioSection({ c }: { c: SidebarControllerReturn }) {
  const [shareCampaignModal, setShareCampaignModal] = useState<SidebarCampaignRow | null>(null)
  const [transferCampaign, setTransferCampaign] = useState<SidebarCampaignRow | null>(null)
  const [manageTeamCampaign, setManageTeamCampaign] = useState<SidebarCampaignRow | null>(null)
  const [shareConversation, setShareConversation] = useState<Conversation | null>(null)
  const [conversationShareRoster, setConversationShareRoster] = useState<TeamRosterEntry[]>([])
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const conversationShareOrgName = useOrgStore(
    (s) => s.getActiveOrg()?.organizations.name ?? 'Workspace',
  )
  const isOrgContext = activeOrgId !== null

  // Fetched lazily on first share-modal open (not on every studio-sidebar
  // mount — the modal may never be opened) and cached for 60s across opens.
  useEffect(() => {
    if (!isOrgContext) {
      setConversationShareRoster([])
      return
    }
    if (shareConversation === null) return
    let cancelled = false
    cachedFetch('team-roster:human', () => orgService.listRoster({ kind: 'human' }), {
      ttlMs: 60_000,
    })
      .then((rows) => {
        if (!cancelled) setConversationShareRoster(rows)
      })
      .catch(() => {
        if (!cancelled) setConversationShareRoster([])
      })
    return () => {
      cancelled = true
    }
  }, [isOrgContext, shareConversation])

  return (
    <>
      <div
        className={`pt-spacing-6 pb-spacing-6 flex flex-col items-start gap-1 ${c.collapsed ? 'px-3' : 'px-spacing-3'}`}
      >
        <button
          type="button"
          onClick={c.handleNewChat}
          className={`body-2-medium nav-glass-emerald flex items-center justify-start gap-2 rounded-lg text-left ${
            c.collapsed ? 'p-2' : 'w-full px-2 py-2'
          }`}
        >
          <Plus className="icon-md shrink-0" />
          {!c.collapsed && <span>New Task</span>}
        </button>
        {c.collapsed ? (
          <Tooltip label={STUDIO_SIDEBAR_ORG_CONTEXT_LABEL} side="right">
            <Link
              href="/home"
              className="rounded-lg p-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
            >
              <Building2 className="icon-md shrink-0" />
            </Link>
          </Tooltip>
        ) : (
          <Link
            href="/home"
            className="body-2-medium flex w-full items-center justify-start gap-2 rounded-lg px-2 py-2 text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
          >
            <Building2 className="icon-md shrink-0" />
            <span>{STUDIO_SIDEBAR_ORG_CONTEXT_LABEL}</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => c.setStudioSearchOpen(true)}
          className={`body-2-medium flex items-center justify-start gap-2 rounded-lg text-left transition-colors hover:bg-[var(--color-secondary)] ${
            c.collapsed ? 'p-2' : 'w-full px-2 py-2'
          }`}
        >
          <Search className="icon-md shrink-0" />
          {!c.collapsed && <span>Search</span>}
        </button>
      </div>

      {c.campaignMenuId &&
        (() => {
          const campaign = c.sortedCampaigns.find(
            (x: SidebarCampaignRow) => x.id === c.campaignMenuId,
          )
          if (!campaign || !c.campaignMenuAnchorRect) return null
          return (
            <SidebarCampaignMenuPortal
              campaign={campaign}
              anchorRect={c.campaignMenuAnchorRect}
              onClose={() => c.setCampaignMenuId(null)}
              onToggleFavorite={() => void c.toggleFavoriteCampaign(campaign.id)}
              onEdit={() => {
                c.setEditingCampaign({
                  id: campaign.id,
                  name: campaign.name,
                  icon: campaign.icon,
                  config: campaign.config,
                })
                c.setShowNewCampaignModal(true)
                c.setCampaignMenuId(null)
              }}
              onCreateSpaceInCampaign={() => {
                void createSpace({ title: 'Untitled space', campaign_id: campaign.id })
                  .then((sp) => {
                    toast.success(`Created space in "${campaign.name}"`)
                    cachedSpaces.mutate((prev) => [sp, ...(prev ?? [])])
                  })
                  .catch(() => toast.error('Failed to create space'))
              }}
              onPatchCampaignConfig={c.patchCampaignConfig}
              onHide={() => void c.toggleHiddenCampaign(campaign.id)}
              onArchive={() => void c.archiveCampaignById(campaign.id)}
              onDeleteRequest={() => {
                c.setDeletingCampaign({ id: campaign.id, name: campaign.name })
                c.setCampaignMenuId(null)
              }}
              onRequestShare={() => {
                setShareCampaignModal(campaign)
                c.setCampaignMenuId(null)
              }}
              onRequestTransfer={() => {
                setTransferCampaign(campaign)
                c.setCampaignMenuId(null)
              }}
              onManageTeam={() => {
                setManageTeamCampaign(campaign)
                c.setCampaignMenuId(null)
              }}
            />
          )
        })()}

      {shareCampaignModal && (
        <ShareModal
          open
          onClose={() => setShareCampaignModal(null)}
          resourceType="campaign"
          resourceId={shareCampaignModal.id}
          resourceName={shareCampaignModal.name}
        />
      )}

      {transferCampaign && (
        <TransferDialog
          open
          onClose={() => setTransferCampaign(null)}
          entityType="campaign"
          entityId={transferCampaign.id}
          entityName={transferCampaign.name}
          onTransferComplete={() => window.location.reload()}
        />
      )}

      {c.menuOpenId &&
        (() => {
          const conv = c.conversations.find((x) => x.id === c.menuOpenId)
          if (!conv) return null
          return (
            <SidebarConversationMenuPortal
              conv={conv}
              position={c.convMenuPosition}
              campaigns={c.campaigns}
              moveSubmenuOpenId={c.moveSubmenuOpenId}
              showShare={isOrgContext}
              onClose={() => {
                c.setMenuOpenId(null)
                c.setMoveSubmenuOpenId(null)
              }}
              onStartRename={() => c.handleStartRename(conv.id, conv.title ?? '')}
              onToggleFavorite={() => c.handleToggleFavorite(conv.id)}
              onToggleMoveSubmenu={() =>
                c.setMoveSubmenuOpenId(c.moveSubmenuOpenId === conv.id ? null : conv.id)
              }
              onRequestNewCampaign={() => {
                void c.requestCreateCampaign()
                c.setMenuOpenId(null)
                c.setMoveSubmenuOpenId(null)
              }}
              onMoveToCampaign={(campaignId) => c.handleMoveToCampaign(conv.id, campaignId)}
              onDeleteConversation={() => c.handleDeleteConversation(conv.id)}
              onShareConversation={() => {
                setShareConversation(conv)
                c.setMenuOpenId(null)
                c.setMoveSubmenuOpenId(null)
              }}
            />
          )
        })()}

      {isOrgContext ? (
        <ConversationShareModal
          activeOrgId={activeOrgId}
          open={shareConversation !== null}
          conversation={shareConversation}
          orgName={conversationShareOrgName}
          roster={conversationShareRoster}
          onClose={() => setShareConversation(null)}
        />
      ) : null}

      {c.collapsed && (
        <div className="relative flex justify-start px-3 py-2" ref={c.campaignsFlyoutRef}>
          <button
            onClick={() => c.setCampaignsFlyout(!c.campaignsFlyout)}
            className={`rounded-lg p-2 transition-colors ${
              c.campaignsFlyout
                ? 'bg-[var(--color-secondary)] text-[var(--color-foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]'
            }`}
            title="Campaigns"
          >
            <FolderKanban className="icon-md shrink-0" />
          </button>
          {c.campaignsFlyout &&
            typeof document !== 'undefined' &&
            createPortal(
              <CampaignsFlyoutPortal
                anchorRef={c.campaignsFlyoutRef}
                campaigns={c.sortedCampaigns}
                activeCampaignId={c.activeCampaignId}
                onSelect={c.handleSelectCampaign}
                onCreateNew={() => {
                  void c.requestCreateCampaign()
                  c.setCampaignsFlyout(false)
                }}
                onClose={() => c.setCampaignsFlyout(false)}
              />,
              document.body,
            )}
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {!c.collapsed && (
          <nav className="scrollbar-hide flex-1 overflow-y-auto overflow-x-hidden px-3 py-1">
            {!c.mounted || !c.storeHydrated ? (
              <div className="py-4 text-center">
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-[var(--color-muted-foreground)]" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Campaigns
                  </span>
                  <button
                    onClick={() => void c.requestCreateCampaign()}
                    className="rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                    title="New Campaign"
                  >
                    <Plus className="icon-md shrink-0" />
                  </button>
                </div>

                {c.campaignsLoading ? (
                  <div className="py-2 text-center">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin text-[var(--color-muted-foreground)]" />
                  </div>
                ) : c.sortedCampaigns.length === 0 ? (
                  <p className="px-3 py-3 text-center text-[11px] text-[var(--color-muted-foreground)]">
                    No campaigns yet
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {c.sortedCampaigns.map((campaign: SidebarCampaignRow) => {
                      const isAccordionOpen = c.expandedCampaignIds.has(campaign.id)
                      const isCampaignActive =
                        c.activeCampaignId === campaign.id && !c.activeConversationId
                      const campaignConvs = c.conversations.filter((conv) => {
                        if (!conv.title || (conv.agent_id && conv.agent_id !== 'vibey'))
                          return false
                        const belongsToCampaign =
                          conv.campaign_id === campaign.id ||
                          (campaign.isSystemGeneral && conv.campaign_id == null)
                        if (!belongsToCampaign) return false
                        return true
                      })
                      campaignConvs.sort(
                        (a, b) =>
                          (Number.isNaN(Date.parse(b.updated_at)) ? 0 : Date.parse(b.updated_at)) -
                          (Number.isNaN(Date.parse(a.updated_at)) ? 0 : Date.parse(a.updated_at)),
                      )
                      const hasUnread = campaignConvs.some((conv) =>
                        c.unreadConversationIds.includes(conv.id),
                      )

                      return (
                        <div key={campaign.id} className="group/folder">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              const wasOpen = c.expandedCampaignIds.has(campaign.id)
                              if (wasOpen) {
                                c.setExpandedCampaignIds((prev) => {
                                  const next = new Set(prev)
                                  next.delete(campaign.id)
                                  return next
                                })
                              } else {
                                c.setExpandedCampaignIds(new Set([campaign.id]))
                                if (!c.mobileDrawerOpen) c.handleSelectCampaign(campaign)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const wasOpen = c.expandedCampaignIds.has(campaign.id)
                                if (wasOpen) {
                                  c.setExpandedCampaignIds((prev) => {
                                    const next = new Set(prev)
                                    next.delete(campaign.id)
                                    return next
                                  })
                                } else {
                                  c.setExpandedCampaignIds(new Set([campaign.id]))
                                  if (!c.mobileDrawerOpen) c.handleSelectCampaign(campaign)
                                }
                              }
                            }}
                            className={`nav-glass-hover-purple flex w-full cursor-pointer items-center gap-2 rounded-lg border border-transparent px-3 py-1.5 text-left transition-all ${
                              isCampaignActive || isAccordionOpen
                                ? 'nav-glass-selected-purple nav-glass-text-purple'
                                : 'text-[var(--color-muted-foreground)]'
                            }`}
                          >
                            {isAccordionOpen ? (
                              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                            )}
                            <LucideIcon name={campaign.icon} className="icon-md flex-shrink-0" />
                            <span className="body-2 flex-1 truncate">{campaign.name}</span>
                            {hasUnread && !isAccordionOpen && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                            )}

                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                const next = c.campaignMenuId === campaign.id ? null : campaign.id
                                if (next)
                                  c.campaignMenuTriggerRef.current = e.currentTarget as HTMLElement
                                c.setCampaignMenuId(next)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.stopPropagation()
                                  const next = c.campaignMenuId === campaign.id ? null : campaign.id
                                  if (next)
                                    c.campaignMenuTriggerRef.current =
                                      e.currentTarget as HTMLElement
                                  c.setCampaignMenuId(next)
                                }
                              }}
                              className={`relative flex h-4 w-4 flex-shrink-0 items-center justify-center rounded p-0.5 transition-all ${
                                campaign.isPinned
                                  ? 'text-[var(--color-muted-foreground)]'
                                  : 'text-[var(--color-muted-foreground)] opacity-0 group-hover/folder:opacity-100'
                              } hover:text-[var(--color-foreground)]`}
                            >
                              {campaign.isPinned && (
                                <Pin className="absolute h-3.5 w-3.5 transition-opacity group-hover/folder:opacity-0" />
                              )}
                              <MoreHorizontal
                                className={`absolute h-4 w-4 transition-opacity ${
                                  campaign.isPinned
                                    ? 'opacity-0 group-hover/folder:opacity-100'
                                    : 'opacity-100'
                                }`}
                              />
                            </span>
                          </div>

                          <div
                            className={`transition-all duration-300 ease-in-out ${
                              isAccordionOpen ? 'opacity-100' : 'max-h-0 overflow-hidden opacity-0'
                            }`}
                          >
                            <div className="space-y-0.5 py-0.5 pl-4">
                              {c.mobileDrawerOpen && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    c.handleSelectCampaign(campaign)
                                  }}
                                  className="nav-glass-hover-purple flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-1 text-left text-[var(--color-muted-foreground)] transition-all"
                                >
                                  <Plus className="icon-md shrink-0" />
                                  <span className="body-2 text-xs">New Task</span>
                                </button>
                              )}
                              {campaignConvs.map((conv) => {
                                const isConvActive = c.activeConversationId === conv.id
                                const isRenaming = c.renamingId === conv.id
                                const isFavorite = !!(conv.metadata as Record<string, unknown>)
                                  ?.isFavorite
                                const isUnread = c.unreadConversationIds.includes(conv.id)

                                if (isRenaming) {
                                  return (
                                    <div key={conv.id} className="flex items-center gap-2 px-2">
                                      <ConversationChannelIcon
                                        metadata={conv.metadata as Record<string, unknown>}
                                      />
                                      <input
                                        type="text"
                                        value={c.renameValue}
                                        onChange={(e) => c.setRenameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') void c.handleSubmitRename(conv.id)
                                          if (e.key === 'Escape') {
                                            c.setRenamingId(null)
                                            c.setRenameValue('')
                                          }
                                        }}
                                        onBlur={() => void c.handleSubmitRename(conv.id)}
                                        autoFocus
                                        className="input-glass body-2 flex-1 rounded px-2 py-1"
                                      />
                                    </div>
                                  )
                                }

                                return (
                                  <div key={conv.id} className="group/conv relative">
                                    <button
                                      onClick={() => void c.handleSelectConversation(conv.id)}
                                      className={`nav-glass-hover-purple flex w-full items-center gap-2 rounded-lg border border-transparent px-3 py-1 text-left transition-all ${
                                        isConvActive
                                          ? 'nav-glass-selected-purple nav-glass-text-purple'
                                          : 'text-[var(--color-muted-foreground)]'
                                      }`}
                                    >
                                      <ConversationChannelIcon
                                        metadata={conv.metadata as Record<string, unknown>}
                                      />
                                      <span
                                        className={`body-2 flex-1 truncate text-xs ${isUnread && !isConvActive ? 'text-foreground font-semibold' : ''}`}
                                      >
                                        {conv.title ?? 'New Task'}
                                      </span>
                                      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                                        {isUnread && !isConvActive ? (
                                          <span className="absolute h-2 w-2 rounded-full bg-blue-500 transition-opacity group-hover/conv:opacity-0" />
                                        ) : isFavorite ? (
                                          <Star className="absolute h-3 w-3 fill-current text-emerald-400 transition-opacity group-hover/conv:opacity-0" />
                                        ) : null}
                                        <span
                                          role="button"
                                          tabIndex={0}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            const next = c.menuOpenId === conv.id ? null : conv.id
                                            if (next)
                                              c.convMenuTriggerRef.current =
                                                e.currentTarget as HTMLElement
                                            c.setMenuOpenId(next)
                                            c.setMoveSubmenuOpenId(null)
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.stopPropagation()
                                              const next = c.menuOpenId === conv.id ? null : conv.id
                                              if (next)
                                                c.convMenuTriggerRef.current =
                                                  e.currentTarget as HTMLElement
                                              c.setMenuOpenId(next)
                                            }
                                          }}
                                          className="absolute rounded p-0.5 text-[var(--color-muted-foreground)] opacity-0 transition-opacity hover:text-[var(--color-foreground)] group-hover/conv:opacity-100"
                                        >
                                          <MoreHorizontal className="h-3.5 w-3.5" />
                                        </span>
                                      </span>
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </nav>
        )}

        {c.collapsed && (
          <div className="relative flex justify-start px-3 py-2" ref={c.agentsFlyoutRef}>
            <button
              onClick={() => c.setAgentsFlyout(!c.agentsFlyout)}
              className={`rounded-lg p-2 transition-colors ${
                c.agentsFlyout
                  ? 'bg-[var(--color-secondary)] text-[var(--color-foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]'
              }`}
              title="All Tasks"
            >
              <MessageSquare className="icon-md shrink-0" />
            </button>
            {c.agentsFlyout &&
              typeof document !== 'undefined' &&
              createPortal(
                <AgentsFlyoutPortal
                  anchorRef={c.agentsFlyoutRef}
                  conversations={c.filteredConversations}
                  activeConversationId={c.activeConversationId}
                  onSelectConversation={(id) => void c.handleSelectConversation(id)}
                  onClose={() => c.setAgentsFlyout(false)}
                />,
                document.body,
              )}
          </div>
        )}
      </div>

      {manageTeamCampaign && (
        <CampaignTeamManageModal
          open={!!manageTeamCampaign}
          onOpenChange={(open) => {
            if (!open) setManageTeamCampaign(null)
          }}
          campaignId={manageTeamCampaign.id}
          campaignName={manageTeamCampaign.name}
          campaignTeam={[]}
          onTeamChange={() => {}}
          context={{ purpose: '', result: '', strategy: '' }}
          createdSummary=""
        />
      )}
    </>
  )
}
