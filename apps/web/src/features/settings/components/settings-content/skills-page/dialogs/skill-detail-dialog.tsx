'use client'

import { RefObject, SetStateAction, useRef, useState, type Dispatch } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { X } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import type { MissionAgentSkill, MissionAgentSkillResource } from '@/features/mission-control/types'
import { formatSkillName } from '@/features/team/constants/team.constants'
import { SkillDetailTreePanel } from '../skill-detail-tree-panel'
import { SkillResourceBody } from '../skill-resource-body'
import type { ResourceTreeNode } from '../skills-page.types'
import { SkillDetailExportDropdown } from './skill-detail-export-dropdown'

export function SkillDetailDialog({
  dialogOpen,
  detailSkill: _detailSkill,
  setDetailSkill,
  detailSkillResolved,
  detailResource,
  detailResourceId,
  setDetailResourceId,
  expandedFolders,
  setExpandedFolders,
  resourceTree,
  skillDetailMarkdownExportRef,
  detailExportMenuOpen,
  setDetailExportMenuOpen,
  detailExportingPdf,
  handleSkillDetailPdf,
  handleSkillDetailMarkdown,
  handleSkillDetailJson,
}: {
  dialogOpen: boolean
  detailSkill: MissionAgentSkill | null
  setDetailSkill: (s: MissionAgentSkill | null) => void
  detailSkillResolved: MissionAgentSkill | null
  detailResource: MissionAgentSkillResource | null
  detailResourceId: string | null
  setDetailResourceId: Dispatch<SetStateAction<string | null>>
  expandedFolders: Set<string>
  setExpandedFolders: Dispatch<SetStateAction<Set<string>>>
  resourceTree: ResourceTreeNode[]
  skillDetailMarkdownExportRef: RefObject<HTMLDivElement | null>
  detailExportMenuOpen: boolean
  setDetailExportMenuOpen: Dispatch<SetStateAction<boolean>>
  detailExportingPdf: boolean
  handleSkillDetailPdf: () => void | Promise<void>
  handleSkillDetailMarkdown: () => void
  handleSkillDetailJson: () => void
}) {
  const [addResourceMenuOpen, setAddResourceMenuOpen] = useState(false)
  const [addingResourcePath, setAddingResourcePath] = useState<string | null>(null)
  const resourceUploadInputRef = useRef<HTMLInputElement>(null)
  const folderUploadInputRef = useRef<HTMLInputElement>(null)
  const folderUploadPathRef = useRef<string | null>(null)
  const addResourcePathInputRef = useRef<HTMLInputElement>(null)

  return (
    <DialogPrimitive.Root
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          setDetailSkill(null)
          setDetailResourceId(null)
          setDetailExportMenuOpen(false)
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDetailSkill(null)
              setDetailResourceId(null)
              setDetailExportMenuOpen(false)
            }
          }}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Skill detail</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          {detailSkillResolved ? (
            <div
              className="surface-card wizard-container-border rounded-spacing-4 flex max-h-[90vh] w-full max-w-5xl flex-col border bg-[var(--color-background)] shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-border modal-scroll-header-edge gap-spacing-3 px-spacing-4 py-spacing-3 flex shrink-0 items-start justify-between border-b">
                <div className="min-w-0">
                  <p className="body-4 text-muted-foreground font-mono">
                    {detailSkillResolved.skill_key}
                  </p>
                  <p className="title-h6 mt-spacing-1">
                    {formatSkillName(detailSkillResolved.name)}
                  </p>
                  <p className="body-3 text-muted-foreground skill-detail-header-description-mobile mt-spacing-1">
                    {detailSkillResolved.description}
                  </p>
                  {detailResource ? (
                    <p className="body-4 text-muted-foreground mt-spacing-1 font-mono">
                      {detailResource.file_path}
                    </p>
                  ) : null}
                </div>
                <div className="gap-spacing-1 flex shrink-0 items-center">
                  <SkillDetailExportDropdown
                    detailExportMenuOpen={detailExportMenuOpen}
                    setDetailExportMenuOpen={setDetailExportMenuOpen}
                    detailResourceId={detailResourceId}
                    detailExportingPdf={detailExportingPdf}
                    handleSkillDetailPdf={handleSkillDetailPdf}
                    handleSkillDetailMarkdown={handleSkillDetailMarkdown}
                    handleSkillDetailJson={handleSkillDetailJson}
                  />
                  <DialogPrimitive.Close asChild>
                    <button type="button" className="btn-icon-bare shrink-0" aria-label="Close">
                      <X className="icon-sm" />
                    </button>
                  </DialogPrimitive.Close>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
                <div className="border-border flex max-h-[40vh] shrink-0 flex-col overflow-hidden border-b md:max-h-none md:w-52 md:border-b-0 md:border-r">
                  {detailSkillResolved ? (
                    <SkillDetailTreePanel
                      resourceTree={resourceTree}
                      expandedFolders={expandedFolders}
                      setExpandedFolders={setExpandedFolders}
                      detailResourceId={detailResourceId}
                      setDetailResourceId={setDetailResourceId}
                      resetKey={detailSkillResolved.id}
                      addResourceMenuOpen={addResourceMenuOpen}
                      setAddResourceMenuOpen={setAddResourceMenuOpen}
                      addingResourcePath={addingResourcePath}
                      setAddingResourcePath={setAddingResourcePath}
                      resourceBusy={false}
                      resourceUploadInputRef={resourceUploadInputRef}
                      addResourcePathInputRef={addResourcePathInputRef}
                      writeLocked
                      startAddResourceManually={() => {}}
                      commitAddResourceManually={() => {}}
                      onUploadResourceFile={() => {}}
                      resources={detailSkillResolved.resources ?? []}
                      onMoveSkillResource={async () => {}}
                      detailExportingPdf={detailExportingPdf}
                      handleSkillDetailPdf={handleSkillDetailPdf}
                      downloadSkillMd={handleSkillDetailMarkdown}
                      handleSkillDetailJson={handleSkillDetailJson}
                      downloadSkillResourceFile={() => handleSkillDetailMarkdown()}
                      renameSkillResource={async () => {}}
                      deleteSkillResource={async () => {}}
                      startAddResourceInFolder={() => {}}
                      uploadResourceFileToFolder={() => {}}
                      folderUploadInputRef={folderUploadInputRef}
                      folderUploadPathRef={folderUploadPathRef}
                    />
                  ) : null}
                </div>
                <div className="px-spacing-4 py-spacing-4 min-h-0 min-w-0 flex-1 overflow-y-auto">
                  <p className="body-4 text-muted-foreground mb-spacing-2 uppercase tracking-wide">
                    {detailResource ? 'Reference' : 'Instructions'}
                  </p>
                  {detailResource ? (
                    <div className="w-full min-w-0">
                      <SkillResourceBody resource={detailResource} />
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
                </div>
              </div>
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
