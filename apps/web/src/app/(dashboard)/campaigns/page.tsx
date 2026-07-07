'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Copy,
  ExternalLink,
  FolderInput,
  FolderKanban,
  MoreHorizontal,
  Share2,
  Trash2,
} from 'lucide-react'
import {
  MoveCopySubmenu,
  MoveCopySubmenuExclusiveGroup,
  moveCopyTriggerStudioMenu,
} from '@/components/menus/MoveCopySubmenu'
import { ShareModal } from '@/components/org'
import { LucideIcon } from '@/components/ui/IconPicker'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useCampaignMode } from '@/features/studio/contexts/CampaignModeContext'
import { fetchCampaigns } from '@/features/studio/services/campaign.service'
import type { Campaign } from '@/features/studio/types'
import { useOrgStore } from '@/lib/org'

export default function CampaignsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [shareCampaign, setShareCampaign] = useState<{ id: string; name: string } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { setActiveCampaign } = useCampaignMode()
  const { activeOrgId, isOrgContext, memberships } = useOrgStore()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await fetchCampaigns()
        if (cancelled) return
        setCampaigns(data)

        if (searchParams.get('view') === 'dashboard' && data.length > 0) {
          const firstCampaign = data[0]
          if (!firstCampaign) return
          const icon =
            ((firstCampaign.config as Record<string, unknown>)?.icon as string) ?? 'folder-kanban'
          setActiveCampaign(firstCampaign.id, firstCampaign.name ?? 'Campaign', icon)
          router.replace(`/campaigns/${firstCampaign.id}?tab=dashboard`)
          return
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [router, searchParams, setActiveCampaign])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading campaigns..." state="processing" size="sm" />
      </div>
    )
  }

  return (
    <div className="p-spacing-4 md:p-spacing-6">
      <div className="mb-spacing-4">
        <h1 className="title-h3 text-foreground">CAMPAIGNS</h1>
        <p className="body-3 text-muted-foreground mt-spacing-1">
          Open artifacts or jump straight to dashboard analytics.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="card-glass p-spacing-6 text-center">
          <FolderKanban className="mb-spacing-2 text-muted-foreground mx-auto h-8 w-8" />
          <p className="body-2 text-muted-foreground">No campaigns yet</p>
        </div>
      ) : (
        <div className="gap-spacing-3 grid grid-cols-1">
          {campaigns.map((campaign) => {
            const icon =
              ((campaign.config as Record<string, unknown>)?.icon as string) ?? 'folder-kanban'
            const isGeneral =
              (campaign.config as Record<string, unknown>)?.system_kind === 'general'

            return (
              <div key={campaign.id} className="card-glass p-spacing-4">
                <div className="flex items-center gap-3">
                  <div className="bg-muted flex h-9 w-9 items-center justify-center rounded-full">
                    <LucideIcon name={icon} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="body-2 text-foreground truncate font-medium">
                      {campaign.name ?? 'Untitled campaign'}
                    </p>
                    {isGeneral && <p className="body-4 text-muted-foreground">General campaign</p>}
                  </div>
                  <div className="relative" ref={menuOpen === campaign.id ? menuRef : undefined}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(menuOpen === campaign.id ? null : campaign.id)
                      }}
                      className="btn-icon-glass"
                    >
                      <MoreHorizontal className="icon-sm" />
                    </button>
                    {menuOpen === campaign.id && (
                      <>
                        <div
                          className="fixed inset-0 z-[60]"
                          onClick={() => setMenuOpen(null)}
                          aria-hidden
                        />
                        <div
                          className="fixed z-[70] w-60 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-lg"
                          style={{
                            top: menuRef.current
                              ? menuRef.current.getBoundingClientRect().bottom + 4
                              : 0,
                            left: menuRef.current
                              ? menuRef.current.getBoundingClientRect().right - 240
                              : 0,
                          }}
                        >
                          <Link
                            href={`/campaigns/${campaign.id}`}
                            onClick={() => {
                              setActiveCampaign(campaign.id, campaign.name ?? 'Campaign', icon)
                              setMenuOpen(null)
                            }}
                            className="body-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open
                          </Link>
                          {!isGeneral && (
                            <>
                              <MoveCopySubmenuExclusiveGroup>
                                <MoveCopySubmenu
                                  mode="move"
                                  label="Move to"
                                  icon={<FolderInput className="h-4 w-4" />}
                                  entityType="campaign"
                                  entityId={campaign.id}
                                  entityName={campaign.name ?? 'Campaign'}
                                  sourceOrgId={activeOrgId}
                                  memberships={memberships}
                                  onCloseMenus={() => setMenuOpen(null)}
                                  className={moveCopyTriggerStudioMenu}
                                />
                                <MoveCopySubmenu
                                  mode="copy"
                                  label="Copy to"
                                  icon={<Copy className="h-4 w-4" />}
                                  entityType="campaign"
                                  entityId={campaign.id}
                                  entityName={campaign.name ?? 'Campaign'}
                                  sourceOrgId={activeOrgId}
                                  memberships={memberships}
                                  onCloseMenus={() => setMenuOpen(null)}
                                  className={moveCopyTriggerStudioMenu}
                                />
                              </MoveCopySubmenuExclusiveGroup>
                              <button
                                type="button"
                                onClick={() => setMenuOpen(null)}
                                className="body-2 text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-md px-3 py-1.5 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </>
                          )}
                          <div className="border-border my-0.5 border-t" />
                          {isOrgContext() && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShareCampaign({
                                  id: campaign.id,
                                  name: campaign.name ?? 'Untitled campaign',
                                })
                                setMenuOpen(null)
                              }}
                              className="button-glass-blue gap-spacing-2 body-2 flex w-full items-center rounded-md px-3 py-1.5 font-medium"
                            >
                              <Share2 className="h-4 w-4" />
                              Sharing & Permissions
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-spacing-3 gap-spacing-2 grid grid-cols-2">
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="button-glass-neutral rounded-spacing-2 body-3 px-spacing-3 py-spacing-2 text-center font-medium"
                    onClick={() =>
                      setActiveCampaign(campaign.id, campaign.name ?? 'Campaign', icon)
                    }
                  >
                    Open
                  </Link>
                  <Link
                    href={`/campaigns/${campaign.id}?tab=dashboard`}
                    className="button-glass-accent rounded-spacing-2 body-3 px-spacing-3 py-spacing-2 text-center font-medium"
                    onClick={() =>
                      setActiveCampaign(campaign.id, campaign.name ?? 'Campaign', icon)
                    }
                  >
                    Dashboard
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {shareCampaign && (
        <ShareModal
          open
          onClose={() => setShareCampaign(null)}
          resourceType="campaign"
          resourceId={shareCampaign.id}
          resourceName={shareCampaign.name}
        />
      )}
    </div>
  )
}
