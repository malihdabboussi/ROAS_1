'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Trash2 } from 'lucide-react'
import { ALL_ARTIFACTS_GROUP_BY_OPTIONS, getAllArtifactsConfig } from '../lib/all-artifacts'
import { getAllSocialResearchConfig } from '../lib/all-social-research'
import { CONTACTS_GROUP_BY_OPTIONS } from '../lib/contacts-group-by-options'
import {
  ALL_SOCIAL_RESEARCH_GROUP_BY_OPTIONS,
  IG_RESEARCH_GROUP_BY_OPTIONS,
} from '../lib/ig-research-group-by'
import { MEDIA_GROUP_BY_OPTIONS, normalizeMediaGroupBy } from '../lib/media-group-by-options'
import { MISSION_GROUP_BY_OPTIONS } from '../lib/mission-group-by-options'
import {
  DEFAULT_MEDIA_VIEW_CONFIG,
  DEFAULT_SOCIAL_RESEARCH_CONFIG,
  socialResearchConfigKeyForPlatform,
  type ContactsConfig,
  type FieldDef,
  type MissionsConfig,
  type SocialPlatform,
  type SocialResearchConfig,
  type ViewDef,
} from '../types/space-schema'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'

export type GroupByToolbarPopoverVariant =
  | 'space'
  | 'missions'
  | 'ig'
  | 'contacts'
  | 'media'
  | 'all_artifacts'

type SocialResearchConfigKey =
  | 'ig_research_config'
  | 'tiktok_research_config'
  | 'youtube_research_config'
  | 'twitter_research_config'

function getIgConfig(view: ViewDef, platform: SocialPlatform): SocialResearchConfig {
  if (view.type === 'all_social_research') {
    return getAllSocialResearchConfig(view)
  }
  const key: SocialResearchConfigKey = socialResearchConfigKeyForPlatform(platform)
  return { ...DEFAULT_SOCIAL_RESEARCH_CONFIG, ...view[key] }
}

function getMissionsConfig(view: ViewDef): MissionsConfig {
  return view.missions_config ?? {}
}

function getContactsConfig(view: ViewDef): ContactsConfig {
  return view.contacts_config ?? {}
}

function getMediaToolbarConfig(view: ViewDef) {
  return { ...DEFAULT_MEDIA_VIEW_CONFIG, ...(view.media_config ?? {}) }
}

export interface GroupByToolbarPopoverProps {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  onViewPatch: (patch: Partial<ViewDef>) => void | Promise<void>
  activeView: ViewDef
  variant: GroupByToolbarPopoverVariant
  groupableFields: FieldDef[]
  /** When `variant === 'ig'`, defaults to 'instagram'. Used to pick the right config field. */
  socialPlatform?: SocialPlatform
}

export function GroupByToolbarPopover({
  open,
  onClose,
  anchorRef,
  onViewPatch,
  activeView,
  variant,
  groupableFields,
  socialPlatform = 'instagram',
}: GroupByToolbarPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const fieldClusterRef = useRef<HTMLDivElement>(null)
  const sortClusterRef = useRef<HTMLDivElement>(null)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)
  const [fieldDropOpen, setFieldDropOpen] = useState(false)
  const [sortDropOpen, setSortDropOpen] = useState(false)

  const igConfigKey: SocialResearchConfigKey | 'all_social_research_config' =
    activeView.type === 'all_social_research'
      ? 'all_social_research_config'
      : socialResearchConfigKeyForPlatform(socialPlatform)
  const igConfig = getIgConfig(activeView, socialPlatform)
  const igGroupByOptions =
    activeView.type === 'all_social_research'
      ? ALL_SOCIAL_RESEARCH_GROUP_BY_OPTIONS
      : IG_RESEARCH_GROUP_BY_OPTIONS
  const allArtifactsConfig = getAllArtifactsConfig(activeView)
  const allArtifactsGroupByLabel = allArtifactsConfig.group_by
    ? (ALL_ARTIFACTS_GROUP_BY_OPTIONS.find((o) => o.id === allArtifactsConfig.group_by)?.label ??
      allArtifactsConfig.group_by)
    : null
  const missionsMc = getMissionsConfig(activeView)
  const contactsCc = getContactsConfig(activeView)
  const mediaMc = getMediaToolbarConfig(activeView)
  const mediaGbNorm = normalizeMediaGroupBy(mediaMc.group_by)
  const groupByField = activeView.group_by
    ? groupableFields.find((f) => f.id === activeView.group_by)
    : undefined

  const igGroupByLabel = igConfig.group_by
    ? (igGroupByOptions.find((o) => o.id === igConfig.group_by)?.label ?? igConfig.group_by)
    : null
  const missionsGroupByLabel = missionsMc.group_by
    ? (MISSION_GROUP_BY_OPTIONS.find((o) => o.id === missionsMc.group_by)?.label ??
      missionsMc.group_by)
    : null
  const contactsGroupLabel = contactsCc.group_by
    ? (CONTACTS_GROUP_BY_OPTIONS.find((o) => o.id === contactsCc.group_by)?.label ??
      contactsCc.group_by)
    : null

  const mediaGroupByLabel =
    mediaGbNorm !== 'none'
      ? (MEDIA_GROUP_BY_OPTIONS.find((o) => o.id === mediaGbNorm)?.label ?? mediaGbNorm)
      : null

  const fieldButtonLabel =
    variant === 'ig'
      ? (igGroupByLabel ?? 'None')
      : variant === 'all_artifacts'
        ? (allArtifactsGroupByLabel ?? 'None')
        : variant === 'missions'
          ? (missionsGroupByLabel ?? 'None')
          : variant === 'contacts'
            ? (contactsGroupLabel ?? 'None')
            : variant === 'media'
              ? (mediaGroupByLabel ?? 'None')
              : (groupByField?.name ?? 'None')

  const hasGroup =
    variant === 'ig'
      ? !!igConfig.group_by
      : variant === 'all_artifacts'
        ? !!allArtifactsConfig.group_by
        : variant === 'missions'
          ? !!missionsMc.group_by
          : variant === 'contacts'
            ? !!contactsCc.group_by
            : variant === 'media'
              ? mediaGbNorm !== 'none'
              : !!groupByField

  const currentSort =
    variant === 'ig'
      ? (igConfig.group_sort ?? 'asc')
      : variant === 'all_artifacts'
        ? (allArtifactsConfig.group_sort ?? 'asc')
        : variant === 'missions'
          ? (missionsMc.group_sort ?? 'asc')
          : variant === 'contacts'
            ? (contactsCc.group_sort ?? 'asc')
            : variant === 'media'
              ? (mediaMc.group_sort ?? 'desc')
              : (activeView.group_sort ?? 'asc')

  const reposition = useCallback(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const gap = 6
    const panelW = 288
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    let left = rect.right + gap
    if (left + panelW > vw - gap) {
      left = Math.max(gap, rect.left - panelW - gap)
    }
    setPanelPos({ top: rect.top, left })
  }, [open, anchorRef])

  useLayoutEffect(() => {
    if (!open) return
    reposition()
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, reposition])

  useEffect(() => {
    if (!open) {
      setFieldDropOpen(false)
      setSortDropOpen(false)
      return
    }
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !anchorRef.current?.contains(t)) {
        onClose()
        setFieldDropOpen(false)
        setSortDropOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        setFieldDropOpen(false)
        setSortDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose, anchorRef])

  useEffect(() => {
    if (!fieldDropOpen && !sortDropOpen) return
    const handle = (e: MouseEvent) => {
      const t = e.target as Node
      if (fieldDropOpen && !fieldClusterRef.current?.contains(t)) setFieldDropOpen(false)
      if (sortDropOpen && !sortClusterRef.current?.contains(t)) setSortDropOpen(false)
    }
    document.addEventListener('mousedown', handle, true)
    return () => document.removeEventListener('mousedown', handle, true)
  }, [fieldDropOpen, sortDropOpen])

  if (!open || !panelPos || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={panelRef}
      {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
      className="dropdown-menu-solid fixed z-[99999] min-w-[18rem] rounded-xl p-3"
      style={{ top: panelPos.top, left: panelPos.left }}
    >
      <p className="mb-2 text-xs font-medium text-[var(--color-muted-foreground)]">Group by</p>
      <div className="flex items-center gap-2">
        <div ref={fieldClusterRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setFieldDropOpen((o) => !o)
              setSortDropOpen(false)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:border-[var(--border)]"
          >
            {fieldButtonLabel}
            <ChevronDown
              className={`h-3 w-3 text-[var(--color-muted-foreground)] transition-transform ${fieldDropOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {fieldDropOpen && (
            <div className="dropdown-menu-solid absolute left-0 top-full z-10 mt-1 w-48 rounded-xl py-1">
              {variant === 'ig' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void onViewPatch({
                        [igConfigKey]: {
                          ...igConfig,
                          group_by: undefined,
                          group_sort: undefined,
                        },
                      })
                      setFieldDropOpen(false)
                      onClose()
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)] ${
                      !igConfig.group_by
                        ? 'font-medium text-[var(--foreground)]'
                        : 'text-[var(--color-muted-foreground)]'
                    }`}
                  >
                    <span>None</span>
                    {!igConfig.group_by && (
                      <Check className="h-3 w-3 text-[var(--color-primary)]" />
                    )}
                  </button>
                  {igGroupByOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        void onViewPatch({
                          [igConfigKey]: {
                            ...igConfig,
                            group_by: opt.id,
                            group_sort: igConfig.group_sort ?? 'asc',
                          },
                        })
                        setFieldDropOpen(false)
                        onClose()
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <span>{opt.label}</span>
                      {igConfig.group_by === opt.id && (
                        <Check className="h-3 w-3 text-[var(--color-primary)]" />
                      )}
                    </button>
                  ))}
                </>
              ) : variant === 'all_artifacts' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void onViewPatch({
                        all_artifacts_config: {
                          ...allArtifactsConfig,
                          group_by: undefined,
                          group_sort: undefined,
                        },
                      })
                      setFieldDropOpen(false)
                      onClose()
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)] ${
                      !allArtifactsConfig.group_by
                        ? 'font-medium text-[var(--foreground)]'
                        : 'text-[var(--color-muted-foreground)]'
                    }`}
                  >
                    <span>None</span>
                    {!allArtifactsConfig.group_by && (
                      <Check className="h-3 w-3 text-[var(--color-primary)]" />
                    )}
                  </button>
                  {ALL_ARTIFACTS_GROUP_BY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        void onViewPatch({
                          all_artifacts_config: {
                            ...allArtifactsConfig,
                            group_by: opt.id,
                            group_sort: allArtifactsConfig.group_sort ?? 'asc',
                          },
                        })
                        setFieldDropOpen(false)
                        onClose()
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <span>{opt.label}</span>
                      {allArtifactsConfig.group_by === opt.id && (
                        <Check className="h-3 w-3 text-[var(--color-primary)]" />
                      )}
                    </button>
                  ))}
                </>
              ) : variant === 'missions' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void onViewPatch({
                        missions_config: {
                          ...missionsMc,
                          group_by: undefined,
                          group_sort: undefined,
                        },
                      })
                      setFieldDropOpen(false)
                      onClose()
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)] ${
                      !missionsMc.group_by
                        ? 'font-medium text-[var(--foreground)]'
                        : 'text-[var(--color-muted-foreground)]'
                    }`}
                  >
                    <span>None</span>
                    {!missionsMc.group_by && (
                      <Check className="h-3 w-3 text-[var(--color-primary)]" />
                    )}
                  </button>
                  {MISSION_GROUP_BY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        void onViewPatch({
                          missions_config: {
                            ...missionsMc,
                            group_by: opt.id,
                            group_sort: missionsMc.group_sort ?? 'asc',
                          },
                        })
                        setFieldDropOpen(false)
                        onClose()
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <span>{opt.label}</span>
                      {missionsMc.group_by === opt.id && (
                        <Check className="h-3 w-3 text-[var(--color-primary)]" />
                      )}
                    </button>
                  ))}
                </>
              ) : variant === 'contacts' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void onViewPatch({
                        contacts_config: {
                          ...contactsCc,
                          group_by: undefined,
                          group_sort: undefined,
                        },
                      })
                      setFieldDropOpen(false)
                      onClose()
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)] ${
                      !contactsCc.group_by
                        ? 'font-medium text-[var(--foreground)]'
                        : 'text-[var(--color-muted-foreground)]'
                    }`}
                  >
                    <span>None</span>
                    {!contactsCc.group_by && (
                      <Check className="h-3 w-3 text-[var(--color-primary)]" />
                    )}
                  </button>
                  {CONTACTS_GROUP_BY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        void onViewPatch({
                          contacts_config: {
                            ...contactsCc,
                            group_by: opt.id,
                            group_sort: contactsCc.group_sort ?? 'asc',
                          },
                        })
                        setFieldDropOpen(false)
                        onClose()
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <span>{opt.label}</span>
                      {contactsCc.group_by === opt.id && (
                        <Check className="h-3 w-3 text-[var(--color-primary)]" />
                      )}
                    </button>
                  ))}
                </>
              ) : variant === 'media' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      void onViewPatch({
                        media_config: {
                          ...mediaMc,
                          group_by: 'none',
                          group_sort: undefined,
                        },
                      })
                      setFieldDropOpen(false)
                      onClose()
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)] ${
                      mediaGbNorm === 'none'
                        ? 'font-medium text-[var(--foreground)]'
                        : 'text-[var(--color-muted-foreground)]'
                    }`}
                  >
                    <span>None</span>
                    {mediaGbNorm === 'none' && (
                      <Check className="h-3 w-3 text-[var(--color-primary)]" />
                    )}
                  </button>
                  {MEDIA_GROUP_BY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        void onViewPatch({
                          media_config: {
                            ...mediaMc,
                            group_by: opt.id,
                            group_sort: mediaMc.group_sort ?? 'desc',
                          },
                        })
                        setFieldDropOpen(false)
                        onClose()
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <span>{opt.label}</span>
                      {mediaGbNorm === opt.id && (
                        <Check className="h-3 w-3 text-[var(--color-primary)]" />
                      )}
                    </button>
                  ))}
                </>
              ) : (
                groupableFields.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      void onViewPatch({
                        group_by: f.id,
                        group_sort: activeView.group_sort ?? 'asc',
                      })
                      setFieldDropOpen(false)
                      onClose()
                    }}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                  >
                    <span>{f.name}</span>
                    {activeView.group_by === f.id && (
                      <Check className="h-3 w-3 text-[var(--color-primary)]" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {hasGroup && (
          <div ref={sortClusterRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setSortDropOpen((o) => !o)
                setFieldDropOpen(false)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:border-[var(--border)]"
            >
              {currentSort === 'asc' ? 'A-Z' : 'Z-A'}
              <ChevronDown
                className={`h-3 w-3 text-[var(--color-muted-foreground)] transition-transform ${sortDropOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {sortDropOpen && (
              <div className="dropdown-menu-solid absolute left-0 top-full z-10 mt-1 w-40 rounded-xl py-1">
                {(['asc', 'desc'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => {
                      if (variant === 'ig') {
                        void onViewPatch({
                          [igConfigKey]: { ...igConfig, group_sort: dir },
                        })
                      } else if (variant === 'all_artifacts') {
                        void onViewPatch({
                          all_artifacts_config: { ...allArtifactsConfig, group_sort: dir },
                        })
                      } else if (variant === 'missions') {
                        void onViewPatch({
                          missions_config: { ...missionsMc, group_sort: dir },
                        })
                      } else if (variant === 'contacts') {
                        void onViewPatch({
                          contacts_config: { ...contactsCc, group_sort: dir },
                        })
                      } else if (variant === 'media') {
                        void onViewPatch({
                          media_config: { ...mediaMc, group_sort: dir },
                        })
                      } else {
                        void onViewPatch({ group_sort: dir })
                      }
                      setSortDropOpen(false)
                    }}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                  >
                    <span>{dir === 'asc' ? 'Ascending' : 'Descending'}</span>
                    {currentSort === dir && (
                      <Check className="h-3 w-3 text-[var(--color-primary)]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {hasGroup && (
          <button
            type="button"
            onClick={() => {
              if (variant === 'ig') {
                void onViewPatch({
                  [igConfigKey]: { ...igConfig, group_by: undefined, group_sort: undefined },
                })
              } else if (variant === 'all_artifacts') {
                void onViewPatch({
                  all_artifacts_config: {
                    ...allArtifactsConfig,
                    group_by: undefined,
                    group_sort: undefined,
                  },
                })
              } else if (variant === 'missions') {
                void onViewPatch({
                  missions_config: { ...missionsMc, group_by: undefined, group_sort: undefined },
                })
              } else if (variant === 'contacts') {
                void onViewPatch({
                  contacts_config: { ...contactsCc, group_by: undefined, group_sort: undefined },
                })
              } else if (variant === 'media') {
                void onViewPatch({
                  media_config: {
                    ...mediaMc,
                    group_by: 'none',
                    group_sort: undefined,
                  },
                })
              } else {
                void onViewPatch({ group_by: undefined, group_sort: undefined })
              }
              onClose()
            }}
            className="rounded-lg p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
            title="Remove grouping"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
