'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import { ArrowLeft, FolderTree } from 'lucide-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { formatSkillName } from '@/lib/agents/agent-display'
import type { MissionAgentSkill, MissionAgentSkillResource } from '@/lib/agents/agent-skill-types'
import { OfficialSkillPreviewMockup } from '../official-skill-preview-mockup'
import { SkillDetailTreePanel } from '../skill-detail-tree-panel'
import { SkillResourceBody } from '../skill-resource-body'
import type { ResourceTreeNode } from '../skills-page.types'
import { isOfficialSkill } from '../skills-page.utils'
import { SkillDetailExportDropdown } from './skill-detail-export-dropdown'

export function SkillDetailMobileFullscreen({
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
  treeOpen,
  onOpenTree,
  onCloseTree,
  onClose,
  canViewOfficialSkillContent = false,
  addResourceMenuOpen,
  setAddResourceMenuOpen,
  addingResourcePath,
  setAddingResourcePath,
  resourceBusy,
  resourceUploadInputRef,
  addResourcePathInputRef,
  writeLocked,
  startAddResourceManually,
  commitAddResourceManually,
  handleUploadResourceFile,
  moveSkillResource,
  renameSkillResource,
  deleteSkillResource,
  startAddResourceInFolder,
  uploadResourceFileToFolder,
  folderUploadInputRef,
  folderUploadPathRef,
  downloadSkillResourceFile,
  downloadSkillMd,
}: {
  detailSkillResolved: MissionAgentSkill
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
  treeOpen: boolean
  onOpenTree: () => void
  onCloseTree: () => void
  onClose: () => void
  canViewOfficialSkillContent?: boolean
  addResourceMenuOpen: boolean
  setAddResourceMenuOpen: (open: boolean) => void
  addingResourcePath: string | null
  setAddingResourcePath: Dispatch<SetStateAction<string | null>>
  resourceBusy: boolean
  resourceUploadInputRef: RefObject<HTMLInputElement | null>
  addResourcePathInputRef: RefObject<HTMLInputElement | null>
  writeLocked: boolean
  startAddResourceManually: () => void
  commitAddResourceManually: () => void | Promise<void>
  handleUploadResourceFile: (files: FileList | File[], folderPath?: string) => void | Promise<void>
  saveResourceContent: (
    resource: MissionAgentSkillResource,
    content: string,
  ) => void | Promise<void>
  moveSkillResource: (resourceId: string, newFilePath: string) => void | Promise<void>
  renameSkillResource: (resourceId: string, currentPath: string) => void | Promise<void>
  deleteSkillResource: (resourceId: string) => void | Promise<void>
  startAddResourceInFolder: (folderPath: string) => void
  uploadResourceFileToFolder: (folderPath: string) => void
  folderUploadInputRef: RefObject<HTMLInputElement | null>
  folderUploadPathRef: RefObject<string | null>
  downloadSkillResourceFile: (resourceId: string) => void
  downloadSkillMd: () => void
}) {
  const title = formatSkillName(detailSkillResolved.name)
  const official = isOfficialSkill(detailSkillResolved)
  const canReadSkillContent = !official || canViewOfficialSkillContent
  const effectiveWriteLocked = writeLocked || official
  const exportTriggerClassName =
    'chip-glass-neutral h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center rounded-lg'

  return (
    <div className="bg-background fixed inset-0 z-[100] flex flex-col">
      {treeOpen ? (
        <>
          <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex shrink-0 items-center border-b">
            <button
              type="button"
              onClick={onCloseTree}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center rounded-lg"
              aria-label="Back to skill"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="body-2 text-foreground min-w-0 flex-1 truncate text-center font-medium">
              References
            </span>
            <SkillDetailExportDropdown
              detailExportMenuOpen={detailExportMenuOpen}
              setDetailExportMenuOpen={setDetailExportMenuOpen}
              detailResourceId={detailResourceId}
              detailExportingPdf={detailExportingPdf}
              handleSkillDetailPdf={handleSkillDetailPdf}
              handleSkillDetailMarkdown={handleSkillDetailMarkdown}
              handleSkillDetailJson={handleSkillDetailJson}
              menuZOverlayClass="z-[110]"
              menuZDropdownClass="z-[120]"
              exportTriggerClassName={exportTriggerClassName}
              exportIconClassName="h-4 w-4"
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SkillDetailTreePanel
              resourceTree={resourceTree}
              expandedFolders={expandedFolders}
              setExpandedFolders={setExpandedFolders}
              detailResourceId={detailResourceId}
              setDetailResourceId={setDetailResourceId}
              resetKey={detailSkillResolved.id}
              onSelectResourceId={() => onCloseTree()}
              addResourceMenuOpen={addResourceMenuOpen}
              setAddResourceMenuOpen={setAddResourceMenuOpen}
              addingResourcePath={addingResourcePath}
              setAddingResourcePath={setAddingResourcePath}
              resourceBusy={resourceBusy}
              resourceUploadInputRef={resourceUploadInputRef}
              addResourcePathInputRef={addResourcePathInputRef}
              writeLocked={effectiveWriteLocked}
              startAddResourceManually={startAddResourceManually}
              commitAddResourceManually={commitAddResourceManually}
              onUploadResourceFile={handleUploadResourceFile}
              resources={detailSkillResolved.resources ?? []}
              onMoveSkillResource={moveSkillResource}
              detailExportingPdf={detailExportingPdf}
              handleSkillDetailPdf={handleSkillDetailPdf}
              downloadSkillMd={downloadSkillMd}
              handleSkillDetailJson={handleSkillDetailJson}
              downloadSkillResourceFile={downloadSkillResourceFile}
              renameSkillResource={renameSkillResource}
              deleteSkillResource={deleteSkillResource}
              startAddResourceInFolder={startAddResourceInFolder}
              uploadResourceFileToFolder={uploadResourceFileToFolder}
              folderUploadInputRef={folderUploadInputRef}
              folderUploadPathRef={folderUploadPathRef}
            />
          </div>
        </>
      ) : (
        <>
          <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex shrink-0 items-center border-b">
            <button
              type="button"
              onClick={onClose}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center rounded-lg"
              aria-label="Back to skills"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="gap-spacing-1 flex min-w-0 flex-1 items-baseline justify-center overflow-hidden">
              <span className="body-2 text-foreground min-w-0 truncate font-medium">
                {title}
              </span>
              <span className="body-4 text-muted-foreground shrink-0 font-mono">
                /{detailSkillResolved.skill_key}
              </span>
            </div>
            {canReadSkillContent ? (
              <>
                <button
                  type="button"
                  onClick={onOpenTree}
                  className="chip-glass-neutral h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center rounded-lg"
                  aria-label="Files and references"
                >
                  <FolderTree className="h-4 w-4" />
                </button>
                <SkillDetailExportDropdown
                  detailExportMenuOpen={detailExportMenuOpen}
                  setDetailExportMenuOpen={setDetailExportMenuOpen}
                  detailResourceId={detailResourceId}
                  detailExportingPdf={detailExportingPdf}
                  handleSkillDetailPdf={handleSkillDetailPdf}
                  handleSkillDetailMarkdown={handleSkillDetailMarkdown}
                  handleSkillDetailJson={handleSkillDetailJson}
                  menuZOverlayClass="z-[110]"
                  menuZDropdownClass="z-[120]"
                  exportTriggerClassName={exportTriggerClassName}
                  exportIconClassName="h-4 w-4"
                />
              </>
            ) : (
              <span className="h-spacing-8 w-spacing-8 shrink-0" aria-hidden />
            )}
          </div>
          <div className="border-border gap-spacing-2 px-spacing-4 py-spacing-3 shrink-0 border-b">
            <p className="body-4 text-muted-foreground font-mono">
              {detailSkillResolved.skill_key}
            </p>
            <p className="body-3 text-muted-foreground skill-detail-header-description-mobile mt-spacing-1">
              {detailSkillResolved.description}
            </p>
            {canReadSkillContent && detailResource ? (
              <p className="body-4 text-muted-foreground mt-spacing-1 break-all font-mono">
                {detailResource.file_path}
              </p>
            ) : null}
          </div>
          <div className="px-spacing-4 py-spacing-4 min-h-0 min-w-0 flex-1 overflow-y-auto">
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
        </>
      )}
    </div>
  )
}
