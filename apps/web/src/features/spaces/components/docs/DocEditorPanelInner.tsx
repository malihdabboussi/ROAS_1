'use client'

import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  Download,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { SaveIndicator } from '@/components/ui/feedback/SaveIndicator'
import { RichTextToolbar } from '@/components/ui/forms/rich-text-toolbar'
import { HtmlMiniIframe } from '@/components/ui/HtmlMiniIframe'
import { Tooltip } from '@/components/ui/tooltip'
import { visualizeSpaceDoc } from '@/features/spaces/services/spaces.service'
import type { GoogleDriveFile } from '@/lib/services/google-drive-api'
import { googleDocMetadataPatch } from '@/lib/spaces/space-doc-export'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cn } from '@/lib/utils/cn'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import type { SpaceItem } from '../../types'
import { ShareModal } from '../ShareModal'
import { CoverDropdown } from './cover/CoverDropdown'
import { DocCoverGenerateModal } from './DocCoverPickerModal'
import { DriveDocTitleChromeActions } from './DocEditorPanelInnerChrome'
import { DriveDocViewer, driveFallbackOpenHref } from './DriveDocViewer'
import { DocBodyImageInsertMenu } from './editor/DocBodyImageInsertMenu'
import { DocEditorCover } from './editor/DocEditorCover'
import { DocEditorDropIndicator } from './editor/DocEditorDropIndicator'
import { DocEditorExportDropdown } from './editor/DocEditorExportDropdown'
import { DocEditorFloatingToolbarPortal } from './editor/DocEditorFloatingToolbarPortal'
import { DocEditorHeaderActions } from './editor/DocEditorHeaderActions'
import { DocEditorInlineRail } from './editor/DocEditorInlineRail'
import { DocEditorProseStyles } from './editor/DocEditorProseStyles'
import { DocEditorTitleHeaderLayout } from './editor/DocEditorTitleHeaderLayout'
import { DocPageSettingsSlideContent } from './editor/DocPageSettingsSlideContent'
import { DocTableControls } from './editor/DocTableControls'
import { slugifyVisualDocFilename } from './lib/slugify-visual-doc-filename'
import { DocSubpagesEmbedded } from './subpages/DocSubpagesEmbedded'
import type {
  DocFontSize,
  DocFontStyle,
  DocSubpagesDisplayMode,
  DocViewMode,
  DocVisualStatus,
  SaveStatus,
} from './types/doc-editor.types'
import { VisualDocView } from './visual/VisualDocView'

export type DocEditorPanelInnerProps = {
  inline: boolean
  embedded: boolean
  googleActionTarget: HTMLElement | null
  expanded: boolean
  onToggleExpanded: () => void
  item: SpaceItem
  roster?: TeamRosterEntry[]
  campaignId?: string | null

  layoutWidthStyle: { paddingLeft: 48; paddingRight: 48 } | { maxWidth: 720 }

  docCoverUrl: string | null
  docShowCover: boolean
  coverContainerRef: RefObject<HTMLDivElement | null>
  coverRepositioning: boolean
  setCoverRepositioning: (v: boolean) => void
  coverFocalY: number
  handleCoverDragStart: (e: React.PointerEvent) => void
  handleCoverDragMove: (e: React.PointerEvent) => void
  handleCoverDragEnd: () => void
  coverDropdownOpen: boolean
  setCoverDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void
  coverDropdownRef: RefObject<HTMLDivElement | null>
  coverBtnRef: RefObject<HTMLButtonElement | null>
  fieldsCoverBtnRef: RefObject<HTMLButtonElement | null>
  coverHeroChangeBtnRef: RefObject<HTMLButtonElement | null>
  coverFileInputRef: RefObject<HTMLInputElement | null>
  setCoverMediaPickerOpen: (v: boolean) => void
  setCoverGenerateOpen: (v: boolean) => void
  handleUpdateField: (patch: Partial<SpaceItem>) => void | Promise<void>
  flushDocBody: () => Promise<void>
  handleCoverFileUpload: (file: File | undefined) => void | Promise<void>

  titleRef: RefObject<HTMLInputElement | null>
  title: string
  setTitle: (v: string | ((s: string) => string)) => void
  handleTitleBlur: () => void
  editorFontFamily: string
  docFontSize: DocFontSize
  docLocked: boolean
  isDriveDoc: boolean
  requestClosePanel: () => void

  hasDocProperties: boolean
  docFieldsSectionOpen: boolean
  setDocFieldsSectionOpen: (v: boolean | ((p: boolean) => boolean)) => void
  renderPropertiesInner: (singleColumn: boolean) => React.ReactNode

  editor: Editor | null

  embedSubpagesMode: Exclude<DocSubpagesDisplayMode, 'off'> | null
  hasDocSubpagesChildren: boolean
  onSelectChildDoc?: (itemId: string) => void

  driveFileId: string | null
  driveMimeType: string | null
  driveModifiedTime: string | null
  driveWebViewLink: string | null

  floatingToolbarPos: { top: number; left: number } | null

  fieldsSlideOpen: boolean
  pageSettingsOpen: boolean
  setFieldsSlideOpen: (v: boolean | ((p: boolean) => boolean)) => void
  setPageSettingsOpen: (v: boolean | ((p: boolean) => boolean)) => void
  shareOpen: boolean
  setShareOpen: (v: boolean) => void
  canShareItem: boolean
  wordCount: number
  charCount: number
  saveStatus: SaveStatus

  docFontStyle: DocFontStyle
  docFullWidth: boolean
  docShowOutline: boolean
  docSubpagesDisplay: DocSubpagesDisplayMode
  updateDocSetting: (key: string, value: unknown) => void

  editorFontSizePx: string

  coverMediaPickerOpen: boolean
  coverGenerateOpen: boolean
  setCoverUrl: (url: string) => void

  bodyImageInsertOpen: boolean
  bodyImageAnchorRect: DOMRect | null
  setBodyImageInsertOpen: (v: boolean) => void
  bodyImageFileInputRef: RefObject<HTMLInputElement | null>
  bodyImageMediaPickerOpen: boolean
  setBodyImageMediaPickerOpen: (v: boolean) => void
  bodyImageGenerateOpen: boolean
  setBodyImageGenerateOpen: (v: boolean) => void
  handleBodyImageFileUpload: (file: File | undefined) => void | Promise<void>
  insertBodyImage: (url: string) => void
  clearPendingSlashText: () => void
  discardPendingSlashRange: () => void
  bodyImageSpaceId: string | null

  docVisualHtml: string | null
  docVisualStatus: DocVisualStatus
  docVisualUpdatedAt: string | null
  docVisualSourceHash: string | null
  docVisualDefaultMode: DocViewMode
  docVisualLastError: string | null
  docVisualPresentationId: string | null
  hasCurrentDocBody: boolean
  currentDocBodyHash: string | null
}

export function DocEditorPanelInner(p: DocEditorPanelInnerProps) {
  const roster = p.roster ?? []
  const [docViewMode, setDocViewMode] = useState<DocViewMode>(p.docVisualDefaultMode)
  const [visualizeBusy, setVisualizeBusy] = useState(false)
  const [visualDocFullModeOpen, setVisualDocFullModeOpen] = useState(false)

  const driveOpenInHref = useMemo(
    () =>
      p.isDriveDoc && p.driveFileId
        ? driveFallbackOpenHref(p.driveFileId, p.driveWebViewLink, p.driveMimeType)
        : '',
    [p.driveFileId, p.driveMimeType, p.driveWebViewLink, p.isDriveDoc],
  )

  useEffect(() => {
    setDocViewMode(p.docVisualDefaultMode)
  }, [p.item.id, p.docVisualDefaultMode])

  useEffect(() => {
    if (docViewMode !== 'visual') setVisualDocFullModeOpen(false)
  }, [docViewMode])

  useEffect(() => {
    if (!visualDocFullModeOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setVisualDocFullModeOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [visualDocFullModeOpen])

  const isVisualizing = visualizeBusy || p.docVisualStatus === 'generating'

  const runVisualize = useCallback(
    async (opts?: { prompt?: string }) => {
      setVisualizeBusy(true)
      try {
        await p.flushDocBody()
        const input: { force: true; prompt?: string } = { force: true }
        if (opts?.prompt?.trim()) input.prompt = opts.prompt.trim()
        const result = await visualizeSpaceDoc(p.item.space_id, p.item.id, input)
        await p.handleUpdateField({ custom_data: result.custom_data })
        toast.success('Visual doc is ready.')
      } catch (error) {
        toast.error(sanitizeUserError(error, "I couldn't visualize this doc."))
      } finally {
        setVisualizeBusy(false)
      }
    },
    [p.flushDocBody, p.handleUpdateField, p.item.id, p.item.space_id],
  )

  const downloadVisualHtmlFile = useCallback(() => {
    const raw = p.docVisualHtml?.trim()
    if (!raw) return
    const name = `${slugifyVisualDocFilename(p.title || p.item.title || 'visual-doc')}.html`
    const blob = new Blob([raw], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }, [p.docVisualHtml, p.item.title, p.title])

  const openVisualFullMode = useCallback(() => {
    const presentationId = p.docVisualPresentationId?.trim()
    if (presentationId) {
      p.requestClosePanel()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('vibey-open-artifact', {
            detail: {
              artifactType: 'presentation',
              artifactId: presentationId,
              spaceId: p.item.space_id,
              name: p.title || p.item.title || 'Visual presentation',
            },
          }),
        )
      }
      return
    }
    setVisualDocFullModeOpen(true)
  }, [p.docVisualPresentationId, p.item.space_id, p.item.title, p.requestClosePanel, p.title])

  const getDocBodyForExport = useCallback(
    () => p.editor?.getHTML() ?? p.item.doc_body ?? '',
    [p.editor, p.item.doc_body],
  )

  const saveGoogleDocLink = useCallback(
    async (file: GoogleDriveFile) => {
      await p.handleUpdateField({ custom_data: googleDocMetadataPatch(file) })
    },
    [p.handleUpdateField],
  )

  const visualChromeIconBtnClass =
    'inline-flex shrink-0 items-center rounded-md border border-[var(--color-border)] p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]'

  const renderDocModeChrome = (opts?: { compactX?: boolean }) => {
    if (p.isDriveDoc) return null
    const pad = opts?.compactX ? 'px-2' : 'px-4'
    const hasChromeVisualTarget = !!p.docVisualHtml?.trim() || p.hasCurrentDocBody
    return (
      <div className={cn('flex w-full min-w-0 shrink-0 items-center gap-2', pad)}>
        <div role="tablist" className="flex min-w-0 flex-1 items-center gap-1">
          {(['doc', 'visual'] as const).map((mode) => {
            const selected = docViewMode === mode
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setDocViewMode(mode)}
                className={cn(
                  'relative flex min-w-0 shrink-0 items-center rounded-md px-2 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-hover-subtle)]',
                  selected
                    ? 'text-[var(--foreground)]'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
                )}
              >
                {mode === 'doc' ? 'Doc' : 'Visual'}
                {selected ? (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--foreground)]" />
                ) : null}
              </button>
            )
          })}
        </div>
        <AnimatePresence initial={false}>
          {docViewMode === 'visual' ? (
            <motion.div
              key="doc-visualize-cta"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative z-[10000] flex shrink-0 items-center gap-1"
            >
              {!!p.docVisualHtml?.trim() ? (
                <>
                  <Tooltip
                    label={p.docVisualPresentationId ? 'Open Design' : 'Full mode'}
                    side="bottom"
                  >
                    <span className="inline-flex">
                      <button
                        type="button"
                        className={visualChromeIconBtnClass}
                        onClick={openVisualFullMode}
                        aria-label={
                          p.docVisualPresentationId
                            ? 'Open linked presentation Design mode'
                            : 'Open visual doc full mode'
                        }
                      >
                        <Maximize2 className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    </span>
                  </Tooltip>
                  <Tooltip label="Download HTML" side="bottom">
                    <span className="inline-flex">
                      <button
                        type="button"
                        className={visualChromeIconBtnClass}
                        onClick={downloadVisualHtmlFile}
                        aria-label="Download visual doc as HTML"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    </span>
                  </Tooltip>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => void runVisualize()}
                disabled={isVisualizing || !hasChromeVisualTarget}
                className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1 px-3 py-2 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isVisualizing ? <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" /> : null}
                {p.docVisualHtml?.trim() ? 'Re-visualize' : 'Visualize'}
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div
      className={cn('flex h-full min-h-0 flex-1 flex-col overflow-hidden', p.inline && 'relative')}
    >
      <div
        className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', p.inline && 'px-2 pb-3 pt-2')}
      >
        <div className="relative grid min-h-0 flex-1 grid-cols-1 overflow-hidden">
          <div className="col-start-1 row-start-1 flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 flex-col">
              {!p.isDriveDoc && (
                <DocEditorCover
                  docCoverUrl={p.docCoverUrl}
                  docShowCover={p.docShowCover}
                  inline={p.inline}
                  coverContainerRef={p.coverContainerRef}
                  coverRepositioning={p.coverRepositioning}
                  setCoverRepositioning={p.setCoverRepositioning}
                  coverFocalY={p.coverFocalY}
                  handleCoverDragStart={p.handleCoverDragStart}
                  handleCoverDragMove={p.handleCoverDragMove}
                  handleCoverDragEnd={p.handleCoverDragEnd}
                  coverDropdownOpen={p.coverDropdownOpen}
                  setCoverDropdownOpen={p.setCoverDropdownOpen}
                  coverDropdownRef={p.coverDropdownRef}
                  coverHeroChangeBtnRef={p.coverHeroChangeBtnRef}
                  onCoverUploadClick={() => p.coverFileInputRef.current?.click()}
                  onCoverLibraryOpen={() => p.setCoverMediaPickerOpen(true)}
                  onCoverGenerateOpen={() => p.setCoverGenerateOpen(true)}
                  handleUpdateField={p.handleUpdateField}
                  item={p.item}
                />
              )}

              {!p.inline && !p.embedded && (
                <div className="mx-auto w-full" style={p.layoutWidthStyle}>
                  <DocEditorTitleHeaderLayout
                    actions={
                      <>
                        {p.isDriveDoc && driveOpenInHref ? (
                          <DriveDocTitleChromeActions openInDriveHref={driveOpenInHref} />
                        ) : null}
                        {!p.isDriveDoc ? (
                          <DocEditorHeaderActions
                            title={p.title || p.item.title || 'Untitled'}
                            getDocBody={getDocBodyForExport}
                            visualHtml={p.docVisualHtml}
                            campaignId={p.campaignId}
                            customData={p.item.custom_data}
                            onGoogleDocCreated={saveGoogleDocLink}
                            onShare={p.canShareItem ? () => p.setShareOpen(true) : undefined}
                          />
                        ) : null}
                        {!p.inline ? (
                          <>
                            <Tooltip label={p.expanded ? 'Collapse' : 'Expand'} side="bottom">
                              <button
                                type="button"
                                onClick={p.onToggleExpanded}
                                className="btn-icon-bare"
                                aria-label={p.expanded ? 'Collapse document' : 'Expand document'}
                              >
                                {p.expanded ? (
                                  <Minimize2 className="icon-sm" />
                                ) : (
                                  <Maximize2 className="icon-sm" />
                                )}
                              </button>
                            </Tooltip>
                            <Tooltip label="Close" side="bottom">
                              <button
                                type="button"
                                onClick={p.requestClosePanel}
                                className="btn-icon-bare"
                                aria-label="Close document"
                              >
                                <X className="icon-sm" />
                              </button>
                            </Tooltip>
                          </>
                        ) : null}
                      </>
                    }
                    title={
                      <input
                        ref={p.titleRef}
                        value={p.title}
                        onChange={(e) => p.setTitle(e.target.value)}
                        onBlur={p.handleTitleBlur}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        }}
                        className={cn(
                          'placeholder:text-muted-foreground text-foreground w-full bg-transparent font-bold leading-tight outline-none',
                          p.docFontSize === 'small'
                            ? 'title-h4'
                            : p.docFontSize === 'large'
                              ? 'title-h2'
                              : 'title-h3',
                        )}
                        style={{ fontFamily: p.editorFontFamily }}
                        placeholder="Untitled"
                        readOnly={p.docLocked || p.isDriveDoc}
                      />
                    }
                  />
                </div>
              )}

              {p.embedded && p.googleActionTarget && !p.isDriveDoc ? (
                <DocEditorExportDropdown
                  title={p.title || p.item.title || 'Untitled'}
                  getDocBody={getDocBodyForExport}
                  visualHtml={p.docVisualHtml}
                  campaignId={p.campaignId}
                  customData={p.item.custom_data}
                  onGoogleDocCreated={saveGoogleDocLink}
                  googleActionTarget={p.googleActionTarget}
                  googleActionOnly
                />
              ) : null}

              {!p.inline && p.hasDocProperties && (
                <div className="mx-auto w-full" style={p.layoutWidthStyle}>
                  <div>
                    <button
                      type="button"
                      onClick={() => p.setDocFieldsSectionOpen((o) => !o)}
                      className="rounded-spacing-3 flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
                      aria-expanded={p.docFieldsSectionOpen}
                    >
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-150',
                          p.docFieldsSectionOpen && 'rotate-90',
                        )}
                        aria-hidden
                      />
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]">
                        Fields
                      </span>
                    </button>
                    {p.docFieldsSectionOpen && (
                      <div className="px-4 py-2">{p.renderPropertiesInner(false)}</div>
                    )}
                    {!p.isDriveDoc ? renderDocModeChrome() : null}
                  </div>
                </div>
              )}

              {!p.inline && !p.isDriveDoc && !p.hasDocProperties && (
                <div className="mx-auto w-full" style={p.layoutWidthStyle}>
                  {renderDocModeChrome()}
                </div>
              )}

              {p.embedded && !p.isDriveDoc ? (
                <div className="mx-auto w-full" style={p.layoutWidthStyle}>
                  {renderDocModeChrome()}
                </div>
              ) : null}

              {(!p.inline || p.embedded) && !p.isDriveDoc && docViewMode === 'doc' && (
                <div className="mx-auto w-full" style={p.layoutWidthStyle}>
                  <div className="px-4">
                    <RichTextToolbar
                      editor={p.editor}
                      docTextStyleMenu
                      showTextStyles
                      showFormatting
                      showLists
                      showAlignment
                      showLink
                      showImage
                      includeCodeBlock
                      showTextColor
                      showDocSurfaces
                      showQuoteCodeBlocks
                      className="border-border border-t"
                    />
                  </div>
                </div>
              )}

              <div className="mx-auto w-full" style={p.layoutWidthStyle}>
                {p.inline && !p.embedded && (
                  <div className="group/title-section rounded-lg px-0 pb-1 pt-1 outline-none transition-colors">
                    {p.isDriveDoc ? (
                      <div className="h-spacing-10 flex shrink-0 items-center">
                        <div
                          className={cn(
                            'flex w-full flex-wrap items-center gap-3 pb-0.5 pt-1 transition-opacity duration-150',
                            'pointer-events-none opacity-0',
                            'group-hover/title-section:pointer-events-auto group-hover/title-section:opacity-100',
                            'group-focus-within/title-section:pointer-events-auto group-focus-within/title-section:opacity-100',
                          )}
                        >
                          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                            Drive
                          </span>
                          {driveOpenInHref ? (
                            <DriveDocTitleChromeActions openInDriveHref={driveOpenInHref} />
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="h-spacing-10 flex shrink-0 items-center">
                        <div className="flex w-full flex-wrap items-center gap-3 pb-0.5 pt-1">
                          {!p.docCoverUrl && (
                            <div className="relative z-[280]">
                              <button
                                ref={p.coverBtnRef}
                                type="button"
                                onClick={() => p.setCoverDropdownOpen((o) => !o)}
                                className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                              >
                                <ImageIcon className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                                Add cover
                              </button>
                              {p.coverDropdownOpen && (
                                <CoverDropdown
                                  ref={p.coverDropdownRef}
                                  onUpload={() => {
                                    p.setCoverDropdownOpen(false)
                                    p.coverFileInputRef.current?.click()
                                  }}
                                  onLibrary={() => {
                                    p.setCoverDropdownOpen(false)
                                    p.setCoverMediaPickerOpen(true)
                                  }}
                                  onGenerate={() => {
                                    p.setCoverDropdownOpen(false)
                                    p.setCoverGenerateOpen(true)
                                  }}
                                />
                              )}
                            </div>
                          )}

                          <DocEditorHeaderActions
                            title={p.title || p.item.title || 'Untitled'}
                            getDocBody={getDocBodyForExport}
                            visualHtml={p.docVisualHtml}
                            campaignId={p.campaignId}
                            customData={p.item.custom_data}
                            onGoogleDocCreated={saveGoogleDocLink}
                            onShare={p.canShareItem ? () => p.setShareOpen(true) : undefined}
                          />

                          <button
                            type="button"
                            onClick={() => {
                              p.setPageSettingsOpen((o) => !o)
                              p.setFieldsSlideOpen(false)
                            }}
                            className="flex items-center gap-1 text-[11px] text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                          >
                            <Settings2 className="h-3.5 w-3.5 shrink-0" />
                            Settings
                          </button>

                          <div className="min-w-[1rem] flex-1" />

                          <span className="text-[9px] tabular-nums text-[var(--color-muted-foreground)]">
                            {p.wordCount.toLocaleString()} Words &middot;{' '}
                            {p.charCount.toLocaleString()} Characters
                          </span>

                          <SaveIndicator status={p.saveStatus} />
                        </div>
                      </div>
                    )}

                    <div className="py-2">
                      <input
                        ref={p.titleRef}
                        value={p.title}
                        onChange={(e) => p.setTitle(e.target.value)}
                        onBlur={p.handleTitleBlur}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        }}
                        className={cn(
                          'placeholder:text-[var(--color-muted-foreground)]/40 w-full bg-transparent font-bold text-[var(--foreground)] outline-none',
                          p.docFontSize === 'small'
                            ? 'text-2xl'
                            : p.docFontSize === 'large'
                              ? 'text-4xl'
                              : 'text-3xl',
                        )}
                        style={{ fontFamily: p.editorFontFamily }}
                        placeholder="Untitled"
                        readOnly={p.docLocked || p.isDriveDoc}
                      />
                    </div>
                    {!p.isDriveDoc && !p.fieldsSlideOpen && renderDocModeChrome({ compactX: true })}
                  </div>
                )}

                {p.embedSubpagesMode != null && p.hasDocSubpagesChildren && (
                  <DocSubpagesEmbedded
                    parentItemId={p.item.id}
                    mode={p.embedSubpagesMode}
                    roster={roster}
                    docLocked={p.docLocked}
                    onOpenChild={p.onSelectChildDoc}
                  />
                )}
              </div>
            </div>

            <div
              className={cn(
                'min-h-0 flex-1',
                p.isDriveDoc || docViewMode === 'visual'
                  ? 'flex flex-col overflow-hidden'
                  : 'pb-spacing-10 overflow-y-auto',
              )}
            >
              {p.isDriveDoc ? (
                <div className="pb-spacing-6 pt-spacing-2 flex min-h-0 w-full flex-1 flex-col px-4">
                  {p.driveFileId ? (
                    <DriveDocViewer
                      key={`${p.item.id}:${p.driveFileId}`}
                      driveFileId={p.driveFileId}
                      modifiedTime={p.driveModifiedTime}
                      webViewLink={p.driveWebViewLink}
                    />
                  ) : (
                    <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-[var(--border)]">
                      <p className="text-sm text-red-400">
                        Missing Drive file id on this document.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      'mt-spacing-3 mx-auto min-h-0 w-full flex-1 flex-col',
                      docViewMode === 'visual' ? 'flex' : 'hidden',
                    )}
                    style={p.layoutWidthStyle}
                  >
                    <VisualDocView
                      html={p.docVisualHtml}
                      status={p.docVisualStatus}
                      sourceHash={p.docVisualSourceHash}
                      currentDocBodyHash={p.currentDocBodyHash}
                      hasDocBody={p.hasCurrentDocBody}
                      lastError={p.docVisualLastError}
                      onVisualize={runVisualize}
                      isVisualizing={isVisualizing}
                    />
                  </div>
                  <EditorContent
                    editor={p.editor}
                    className={cn('doc-editor-surface', docViewMode !== 'doc' && 'hidden')}
                  />
                  {!p.isDriveDoc && docViewMode === 'doc' && <DocTableControls editor={p.editor} />}
                  {!p.isDriveDoc && docViewMode === 'doc' && (
                    <DocEditorDropIndicator editor={p.editor} />
                  )}
                </>
              )}
            </div>

            {p.inline &&
              !p.isDriveDoc &&
              docViewMode === 'doc' &&
              p.editor &&
              p.floatingToolbarPos && (
                <DocEditorFloatingToolbarPortal
                  editor={p.editor}
                  floatingToolbarPos={p.floatingToolbarPos}
                />
              )}
          </div>

          {p.inline && (
            <DocEditorInlineRail
              hasDocProperties={p.hasDocProperties}
              showPageSettings={!p.isDriveDoc}
              showExport={!p.isDriveDoc}
              exportTitle={p.title || p.item.title || 'Untitled'}
              getDocBody={getDocBodyForExport}
              exportVisualHtml={p.docVisualHtml}
              exportCampaignId={p.campaignId}
              exportCustomData={p.item.custom_data}
              onGoogleDocCreated={saveGoogleDocLink}
              fieldsSlideOpen={p.fieldsSlideOpen}
              pageSettingsOpen={p.pageSettingsOpen}
              setFieldsSlideOpen={p.setFieldsSlideOpen}
              setPageSettingsOpen={p.setPageSettingsOpen}
            />
          )}
        </div>
      </div>

      {p.inline && (
        <>
          <AnimatePresence>
            {p.fieldsSlideOpen && p.hasDocProperties && (
              <motion.div
                key="doc-fields-slide"
                className="absolute inset-y-0 right-0 z-[40] flex w-[320px] flex-col overflow-hidden rounded-l-2xl border border-r-0 border-[var(--border)] bg-[var(--background)] shadow-xl"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              >
                <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
                  <span className="min-w-0 text-sm font-semibold text-[var(--foreground)]">
                    Fields
                  </span>
                  <button
                    type="button"
                    onClick={() => p.setFieldsSlideOpen(false)}
                    className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                    aria-label="Close fields"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2">
                  {p.renderPropertiesInner(true)}
                </div>
                {!p.isDriveDoc ? renderDocModeChrome() : null}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {p.pageSettingsOpen && !p.isDriveDoc && (
              <motion.div
                key="doc-page-settings-slide"
                className="absolute inset-y-0 right-0 z-[40] flex w-[300px] flex-col overflow-hidden rounded-l-2xl border border-r-0 border-[var(--border)] bg-[var(--background)] shadow-xl"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    PAGE SETTINGS
                  </span>
                  <button
                    type="button"
                    onClick={() => p.setPageSettingsOpen(false)}
                    className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                    aria-label="Close page settings"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <DocPageSettingsSlideContent
                  docFontStyle={p.docFontStyle}
                  docFontSize={p.docFontSize}
                  docFullWidth={p.docFullWidth}
                  docSubpagesDisplay={p.docSubpagesDisplay}
                  docShowCover={p.docShowCover}
                  docShowOutline={p.docShowOutline}
                  docLocked={p.docLocked}
                  updateDocSetting={p.updateDocSetting}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <DocEditorProseStyles
        editorFontSizePx={p.editorFontSizePx}
        editorFontFamily={p.editorFontFamily}
        docFullWidth={p.docFullWidth}
      />

      <input
        ref={p.coverFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void p.handleCoverFileUpload(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <input
        ref={p.bodyImageFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void p.handleBodyImageFileUpload(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <DocBodyImageInsertMenu
        open={p.bodyImageInsertOpen}
        anchorRect={p.bodyImageAnchorRect}
        onClose={() => {
          p.setBodyImageInsertOpen(false)
          p.discardPendingSlashRange()
        }}
        onUpload={() => {
          p.setBodyImageInsertOpen(false)
          p.clearPendingSlashText()
          p.bodyImageFileInputRef.current?.click()
        }}
        onLibrary={() => {
          p.setBodyImageInsertOpen(false)
          p.clearPendingSlashText()
          p.setBodyImageMediaPickerOpen(true)
        }}
        onGenerate={() => {
          p.setBodyImageInsertOpen(false)
          p.clearPendingSlashText()
          p.setBodyImageGenerateOpen(true)
        }}
      />

      <MediaPickerModal
        open={p.coverMediaPickerOpen}
        onClose={() => p.setCoverMediaPickerOpen(false)}
        onSelect={(url) => {
          p.setCoverUrl(url)
          p.setCoverMediaPickerOpen(false)
        }}
        campaignId={p.campaignId ?? undefined}
      />

      <MediaPickerModal
        open={p.bodyImageMediaPickerOpen}
        onClose={() => p.setBodyImageMediaPickerOpen(false)}
        onSelect={(url) => {
          p.insertBodyImage(url)
          p.setBodyImageMediaPickerOpen(false)
        }}
        campaignId={p.campaignId ?? undefined}
      />

      <DocCoverGenerateModal
        open={p.coverGenerateOpen}
        onClose={() => p.setCoverGenerateOpen(false)}
        campaignId={p.campaignId}
        extraTags={['doc-cover']}
        onSelect={(url) => {
          p.setCoverUrl(url)
          p.setCoverGenerateOpen(false)
        }}
      />

      <DocCoverGenerateModal
        open={p.bodyImageGenerateOpen}
        onClose={() => p.setBodyImageGenerateOpen(false)}
        campaignId={p.campaignId}
        spaceId={p.bodyImageSpaceId}
        title="Generate image"
        extraTags={['doc-body-image']}
        onSelect={(url) => {
          p.insertBodyImage(url)
          p.setBodyImageGenerateOpen(false)
        }}
      />

      {p.canShareItem && (
        <ShareModal
          open={p.shareOpen}
          onClose={() => p.setShareOpen(false)}
          entityType="item"
          spaceId={p.item.space_id}
          entityId={p.item.id}
          entityName={p.item.title}
          docMode
          item={p.item}
          roster={roster}
          onItemPatch={async (patch) => {
            await p.handleUpdateField(patch)
          }}
        />
      )}

      {typeof document !== 'undefined' &&
        visualDocFullModeOpen &&
        !!p.docVisualHtml?.trim() &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex flex-col bg-[var(--background)]"
            role="dialog"
            aria-modal="true"
            aria-label="Visual doc full mode"
          >
            <div className="px-spacing-4 py-spacing-2 flex shrink-0 items-center justify-end">
              <Tooltip label="Close" side="bottom">
                <span className="inline-flex">
                  <button
                    type="button"
                    className={visualChromeIconBtnClass}
                    onClick={() => setVisualDocFullModeOpen(false)}
                    aria-label="Close full mode"
                  >
                    <X className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </span>
              </Tooltip>
            </div>
            <div className="p-spacing-4 min-h-0 flex-1">
              <div className="surface-card rounded-spacing-4 border-border flex h-full min-h-0 flex-1 flex-col overflow-hidden border">
                <HtmlMiniIframe
                  html={p.docVisualHtml}
                  title="Visual doc full screen"
                  interactive
                  className="bg-background"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
