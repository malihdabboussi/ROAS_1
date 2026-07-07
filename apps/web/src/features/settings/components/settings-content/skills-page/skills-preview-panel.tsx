'use client'

import {
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
} from 'react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { formatSkillName } from '@/lib/agents/agent-display'
import type { MissionAgentSkill, MissionAgentSkillResource } from '@/lib/agents/agent-skill-types'
import { cn } from '@/lib/utils/cn'
import { SkillDetailExportDropdown } from './dialogs/skill-detail-export-dropdown'
import { OfficialSkillPreviewMockup } from './official-skill-preview-mockup'
import { SkillResourceBody } from './skill-resource-body'
import { SkillsPreviewEmptyState } from './skills-empty-illustrations'
import { isOfficialSkill } from './skills-page.utils'

export function SkillsPreviewPanel({
  detailSkillResolved,
  detailResource,
  detailResourceId,
  skillDetailMarkdownExportRef,
  detailExportMenuOpen,
  setDetailExportMenuOpen,
  detailExportingPdf,
  handleSkillDetailPdf,
  handleSkillDetailMarkdown,
  handleSkillDetailJson,
  hideDetailHeader = false,
  canViewOfficialSkillContent = false,
}: {
  detailSkillResolved: MissionAgentSkill | null
  detailResource: MissionAgentSkillResource | null
  detailResourceId: string | null
  skillDetailMarkdownExportRef: RefObject<HTMLDivElement | null>
  detailExportMenuOpen: boolean
  setDetailExportMenuOpen: Dispatch<SetStateAction<boolean>>
  detailExportingPdf: boolean
  handleSkillDetailPdf: () => void | Promise<void>
  handleSkillDetailMarkdown: () => void
  handleSkillDetailJson: () => void
  hideDetailHeader?: boolean
  canViewOfficialSkillContent?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({
    canScroll: false,
    atTop: true,
    atBottom: true,
  })

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const canScroll = el.scrollHeight > el.clientHeight + 1
    const atTop = el.scrollTop <= 1
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 1
    setScrollState({ canScroll, atTop, atBottom })
  }, [])

  useEffect(() => {
    updateScrollState()
  }, [detailSkillResolved?.id, detailResourceId, updateScrollState])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateScrollState])

  if (!detailSkillResolved) {
    return <SkillsPreviewEmptyState />
  }

  const official = isOfficialSkill(detailSkillResolved)
  const canReadSkillContent = !official || canViewOfficialSkillContent
  const showHeaderScrollEdge = scrollState.canScroll && !scrollState.atTop
  const showBottomFade = scrollState.canScroll && !scrollState.atBottom

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {hideDetailHeader ? (
        <div className="relative z-20 shrink-0">
          <div
            className={cn(
              'gap-spacing-2 px-spacing-4 py-spacing-3',
              showHeaderScrollEdge && 'modal-scroll-header-edge',
            )}
          >
            <p className="body-4 text-muted-foreground font-mono">
              {detailSkillResolved.skill_key}
            </p>
            {detailResource ? (
              <p className="body-4 text-muted-foreground mt-spacing-1 truncate font-mono">
                {detailResource.file_path}
              </p>
            ) : (
              <p className="body-3 text-muted-foreground mt-spacing-1 line-clamp-2">
                {detailSkillResolved.description}
              </p>
            )}
          </div>
          {showHeaderScrollEdge ? (
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 translate-y-full bg-gradient-to-b from-card to-transparent"
              aria-hidden
            />
          ) : null}
        </div>
      ) : (
        <div className="relative z-20 shrink-0">
          <div className="border-border modal-scroll-header-edge gap-spacing-3 px-spacing-4 py-spacing-3 bg-background relative z-20 flex shrink-0 items-start justify-between overflow-visible border-b">
            <div className="min-w-0">
              <p className="body-4 text-muted-foreground font-mono">
                {detailSkillResolved.skill_key}
              </p>
              <p className="title-h6 mt-spacing-1 truncate">
                {formatSkillName(detailSkillResolved.name)}
              </p>
              {detailResource ? (
                <p className="body-4 text-muted-foreground mt-spacing-1 truncate font-mono">
                  {detailResource.file_path}
                </p>
              ) : (
                <p className="body-3 text-muted-foreground mt-spacing-1 line-clamp-2">
                  {detailSkillResolved.description}
                </p>
              )}
            </div>
            {canReadSkillContent ? (
              <SkillDetailExportDropdown
                detailExportMenuOpen={detailExportMenuOpen}
                setDetailExportMenuOpen={setDetailExportMenuOpen}
                detailResourceId={detailResourceId}
                detailExportingPdf={detailExportingPdf}
                handleSkillDetailPdf={handleSkillDetailPdf}
                handleSkillDetailMarkdown={handleSkillDetailMarkdown}
                handleSkillDetailJson={handleSkillDetailJson}
              />
            ) : null}
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 translate-y-full bg-gradient-to-b from-background to-transparent" />
        </div>
      )}

      <div className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="px-spacing-4 py-spacing-4 relative z-0 min-h-0 w-full min-w-0 flex-1 overflow-y-auto"
        >
          {official && !canViewOfficialSkillContent ? (
            <div className="flex h-full min-h-0 items-center justify-center">
              <OfficialSkillPreviewMockup />
            </div>
          ) : (
            <>
              <p className="body-4 text-muted-foreground mb-spacing-2 uppercase tracking-wide">
                {detailResource ? 'Reference' : 'Instructions'}
              </p>
              {detailResource ? (
                <div className="w-full min-w-0">
                  <SkillResourceBody resource={detailResource} />
                </div>
              ) : detailSkillResolved.markdown_content === undefined ? (
                // Summary list row — full body is being hydrated on demand.
                <div className="py-spacing-6 flex w-full min-w-0 items-center justify-center">
                  <VibeyLoadingOrb state="processing" size="sm" />
                </div>
              ) : (
                <div ref={skillDetailMarkdownExportRef} className="w-full min-w-0">
                  {detailSkillResolved.markdown_content?.trim() ? (
                    <MarkdownRenderer className="body-3 w-full max-w-none">
                      {detailSkillResolved.markdown_content}
                    </MarkdownRenderer>
                  ) : (
                    <p className="body-3 text-muted-foreground italic">
                      No markdown body for this skill.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {showBottomFade ? (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-8 bg-gradient-to-t from-card to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  )
}
