'use client'

import { useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { reportClientError } from '@/lib/log-client-error'
import { presignPutUploadFile } from '@/lib/media/presigned-client-upload'
import { markdownToHtml } from '../../lib/markdown-to-html'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption, ViewDef } from '../../types/space-schema'
import { isSpaceFieldVisibleInUi } from '../../types/space-schema'
import { registerDocImageInsertHandler } from './doc-image-insert-bridge'
import { clearDocSlashInsertText, type DocSlashInsertRange } from './doc-slash-insert-text'
import { DocEditorPanelInner } from './DocEditorPanelInner'
import { DocEditorPanelPortalShell } from './DocEditorPanelPortalShell'
import { useDocBodyAutosave } from './hooks/use-doc-body-autosave'
import { useDocCoverImage } from './hooks/use-doc-cover-image'
import { useDocEscapeKey } from './hooks/use-doc-escape-key'
import { useDocFloatingToolbar } from './hooks/use-doc-floating-toolbar'
import { useDocItemUpdate } from './hooks/use-doc-item-update'
import { useDocPanelResize } from './hooks/use-doc-panel-resize'
import { useDocSlidePanelExit } from './hooks/use-doc-slide-panel-exit'
import { useDocTiptapEditor } from './hooks/use-doc-tiptap-editor'
import {
  editorFontFamilyForStyle,
  editorFontSizePxForSize,
  getDocCustomDataRecord,
  parseDocEditorUiFromCustomData,
} from './lib/doc-editor-settings'
import { hashDocSource } from './lib/doc-visual-hash'
import { DocPropertiesSection } from './properties/DocPropertiesSection'
import type { DocSubpagesDisplayMode } from './types/doc-editor.types'

export type { DocSubpagesDisplayMode } from './types/doc-editor.types'

export interface DocEditorPanelProps {
  item: SpaceItem
  view?: ViewDef
  categoryField: FieldDef | null
  allFields?: FieldDef[]
  roster?: TeamRosterEntry[]
  currentUserId?: string | null
  campaignId?: string | null
  onClose: () => void
  onUpdated: () => void
  onEditCategories?: () => void
  onEditStatuses?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onCampaignDocsRefresh?: () => void
  inline?: boolean
  onSelectChildDoc?: (itemId: string) => void
}

function resolveInitialDocBody(item: SpaceItem): string {
  const raw = item.doc_body ?? item.notes ?? ''
  if (!raw) return ''
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw
  return markdownToHtml(raw) ?? raw
}

export function DocEditorPanel({
  item: initialItem,
  view,
  categoryField: _unusedCategoryField,
  allFields,
  roster,
  currentUserId,
  campaignId,
  onClose,
  onUpdated: _onUpdated,
  onEditCategories,
  onEditStatuses,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onCampaignDocsRefresh,
  inline,
  onSelectChildDoc,
}: DocEditorPanelProps) {
  const [item, setItem] = useState(initialItem)
  const [title, setTitle] = useState(initialItem.title === 'Untitled' ? '' : initialItem.title)
  const [coverDropdownOpen, setCoverDropdownOpen] = useState(false)
  const [coverMediaPickerOpen, setCoverMediaPickerOpen] = useState(false)
  const [coverGenerateOpen, setCoverGenerateOpen] = useState(false)
  const [bodyImageInsertOpen, setBodyImageInsertOpen] = useState(false)
  const [bodyImageAnchorRect, setBodyImageAnchorRect] = useState<DOMRect | null>(null)
  const [bodyImageMediaPickerOpen, setBodyImageMediaPickerOpen] = useState(false)
  const [bodyImageGenerateOpen, setBodyImageGenerateOpen] = useState(false)
  const coverDropdownRef = useRef<HTMLDivElement>(null)
  const bodyImageFileInputRef = useRef<HTMLInputElement>(null)
  const pendingSlashRangeRef = useRef<DocSlashInsertRange | null>(null)
  const coverBtnRef = useRef<HTMLButtonElement>(null)
  const fieldsCoverBtnRef = useRef<HTMLButtonElement>(null)
  const coverHeroChangeBtnRef = useRef<HTMLButtonElement>(null)
  const coverFileInputRef = useRef<HTMLInputElement>(null)
  const [, setCoverUploading] = useState(false)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [addPropOpen, setAddPropOpen] = useState(false)
  const [fieldsSlideOpen, setFieldsSlideOpen] = useState(false)
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [docFieldsSectionOpen, setDocFieldsSectionOpen] = useState(true)
  const initialDocBodyContent = resolveInitialDocBody(initialItem)
  const [currentDocBodyHtml, setCurrentDocBodyHtml] = useState(initialDocBodyContent)
  const [currentDocBodyHash, setCurrentDocBodyHash] = useState<string | null>(null)
  const [docBodyHydrationResumeNonce, setDocBodyHydrationResumeNonce] = useState(0)
  const searchParams = useSearchParams()
  /**
   * True only while the open editor has unsaved body changes or a body save in
   * flight. Same-doc remote body updates may hydrate once this clears.
   */
  const docBodyHydrationBlockedRef = useRef(false)
  const flushDocBodyRef = useRef<(() => Promise<void>) | null>(null)

  const storeUpdateItem = useSpacesStore((s) => s.updateItem)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const spaceItems = useSpacesStore((s) => s.items)

  const { panelWidth, isResizing, handleResizePointerDown } = useDocPanelResize()
  const { panelSlideExiting, requestClosePanel, onSlideAnimationComplete } = useDocSlidePanelExit({
    inline: !!inline,
    onClose,
    initialItemId: initialItem.id,
  })

  const handleUpdateField = useDocItemUpdate({
    item,
    setItem,
    storeUpdateItem,
    flushDocBodyRef,
    onCampaignDocsRefresh,
  })

  useDocEscapeKey({
    inline: !!inline,
    onClose,
    shareOpen,
    setShareOpen,
    pageSettingsOpen,
    setPageSettingsOpen,
    fieldsSlideOpen,
    setFieldsSlideOpen,
    requestClosePanel,
  })

  useEffect(() => {
    setPortalTarget(document.body)
  }, [])

  useEffect(() => {
    if (initialItem.title === 'Untitled' && titleRef.current) {
      requestAnimationFrame(() => titleRef.current?.focus())
    }
  }, [initialItem.id])

  useEffect(() => {
    setItem(initialItem)
    setTitle(initialItem.title === 'Untitled' ? '' : initialItem.title)
  }, [initialItem])

  useEffect(() => {
    setFieldsSlideOpen(false)
    setPageSettingsOpen(false)
    setDocFieldsSectionOpen(true)
  }, [initialItem.id])

  // Must run before the autosave/editor hook effects on doc switch so they see
  // a pristine editor and re-adopt the incoming baseline.
  useEffect(() => {
    docBodyHydrationBlockedRef.current = false
  }, [initialItem.id])

  const resumeDocBodyHydration = useCallback(() => {
    setDocBodyHydrationResumeNonce((nonce) => nonce + 1)
  }, [])

  const docCoverUrl = useMemo(() => {
    const raw = (item.custom_data as Record<string, unknown> | undefined)?._doc_cover_url
    return typeof raw === 'string' && raw.trim() ? raw : null
  }, [item.custom_data])

  const docCustomData = useMemo(() => getDocCustomDataRecord(item.custom_data), [item.custom_data])
  const {
    docFontStyle,
    docFontSize,
    docFullWidth,
    docShowCover,
    docShowOutline,
    docLocked,
    isDriveDoc,
    driveFileId,
    driveMimeType,
    driveModifiedTime,
    driveWebViewLink,
    docSubpagesDisplay,
    docVisualHtml,
    docVisualStatus,
    docVisualUpdatedAt,
    docVisualSourceHash,
    docVisualDefaultMode,
    docVisualLastError,
  } = useMemo(() => parseDocEditorUiFromCustomData(docCustomData), [docCustomData])

  const docHiddenFields = useMemo(
    () => new Set((docCustomData._doc_hidden_fields as string[] | undefined) ?? []),
    [docCustomData],
  )
  const docExtraFields = useMemo(
    () => (docCustomData._doc_extra_fields as string[] | undefined) ?? [],
    [docCustomData],
  )

  const {
    coverRepositioning,
    setCoverRepositioning,
    coverFocalY,
    coverContainerRef,
    handleCoverDragStart,
    handleCoverDragMove,
    handleCoverDragEnd,
  } = useDocCoverImage({
    itemCustomData: item.custom_data,
    docCoverUrl,
    handleUpdateField,
  })

  const setCoverUrl = useCallback(
    (url: string) => {
      // Send only the changed key — custom_data merges shallowly (server +
      // store), so a full spread from possibly-stale panel state would clobber
      // concurrent edits to other keys (category, settings, ...).
      void handleUpdateField({ custom_data: { _doc_cover_url: url } })
    },
    [handleUpdateField],
  )

  const handleCoverFileUpload = useCallback(
    async (file: File | undefined) => {
      if (!file?.type.startsWith('image/')) return
      setCoverUploading(true)
      try {
        const { url } = await presignPutUploadFile({
          file,
          category: 'image',
          ...(campaignId ? { campaign_id: campaignId } : {}),
        })
        setCoverUrl(url)
      } catch (err) {
        void reportClientError({
          feature: 'ui/doc_editor',
          error_code: 'doc_cover_upload_failed',
          message: err instanceof Error ? err.message : String(err),
          context: { itemId: item.id },
        })
      } finally {
        setCoverUploading(false)
      }
    },
    [campaignId, setCoverUrl],
  )

  useEffect(() => {
    if (!coverDropdownOpen) return
    const onOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        !coverDropdownRef.current?.contains(t) &&
        !coverBtnRef.current?.contains(t) &&
        !fieldsCoverBtnRef.current?.contains(t) &&
        !coverHeroChangeBtnRef.current?.contains(t)
      ) {
        setCoverDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [coverDropdownOpen])

  const embedSubpagesMode = useMemo((): Exclude<DocSubpagesDisplayMode, 'off'> | null => {
    if (item.id.startsWith('cdoc:') || item.id.startsWith('mdel:')) return null
    if (docSubpagesDisplay === 'off') return null
    return docSubpagesDisplay
  }, [item.id, docSubpagesDisplay])

  const hasDocSubpagesChildren = useMemo(() => {
    if (item.id.startsWith('cdoc:') || item.id.startsWith('mdel:')) return false
    return spaceItems.some((i) => {
      if (i.parent_item_id !== item.id) return false
      return (i.custom_data as Record<string, unknown> | undefined)?._view_type === 'doc'
    })
  }, [item.id, spaceItems])

  const updateDocSetting = useCallback(
    (key: string, value: unknown) => {
      void handleUpdateField({ custom_data: { [key]: value } })
    },
    [handleUpdateField],
  )

  const editorFontFamily = useMemo(() => editorFontFamilyForStyle(docFontStyle), [docFontStyle])
  const editorFontSizePx = useMemo(() => editorFontSizePxForSize(docFontSize), [docFontSize])

  const visibleFieldIds = useMemo(() => {
    const viewDefault = view?.visible_fields ?? (allFields ?? []).map((f) => f.id)
    const merged = [...new Set([...viewDefault, ...docExtraFields])]
    return merged.filter((id) => !docHiddenFields.has(id))
  }, [view?.visible_fields, allFields, docExtraFields, docHiddenFields])

  const propsFields = useMemo(() => {
    const byId = new Map((allFields ?? []).map((f) => [f.id, f]))
    return visibleFieldIds
      .map((id) => byId.get(id))
      .filter((f): f is FieldDef => !!f && isSpaceFieldVisibleInUi(f) && f.id !== 'title')
  }, [visibleFieldIds, allFields])

  const addableFields = useMemo(() => {
    const visibleSet = new Set(visibleFieldIds)
    return (allFields ?? []).filter(
      (f) => isSpaceFieldVisibleInUi(f) && f.id !== 'title' && !visibleSet.has(f.id),
    )
  }, [visibleFieldIds, allFields])

  const statusFieldForCell = useMemo(
    () => (allFields ?? []).find((f) => f.id === 'status'),
    [allFields],
  )

  const handleHideField = useCallback(
    (fieldId: string) => {
      const next = [
        ...new Set([...((docCustomData._doc_hidden_fields as string[]) ?? []), fieldId]),
      ]
      void handleUpdateField({ custom_data: { _doc_hidden_fields: next } })
    },
    [docCustomData, handleUpdateField],
  )

  const handleAddField = useCallback(
    (fieldId: string) => {
      const currentExtra = (docCustomData._doc_extra_fields as string[] | undefined) ?? []
      const currentHidden = (docCustomData._doc_hidden_fields as string[] | undefined) ?? []
      const nextExtra = [...new Set([...currentExtra, fieldId])]
      const nextHidden = currentHidden.filter((id) => id !== fieldId)
      void handleUpdateField({
        custom_data: {
          _doc_extra_fields: nextExtra,
          _doc_hidden_fields: nextHidden,
        },
      })
      setAddPropOpen(false)
    },
    [docCustomData, handleUpdateField],
  )

  const { saveStatus, handleDocBodyChange, flushDocBodyChange, localDocBodyRef } =
    useDocBodyAutosave({
      initialItemId: initialItem.id,
      baselineDocBodyOnIdChange: initialDocBodyContent,
      item,
      activeSpaceId,
      docBodyHydrationBlockedRef,
      storeUpdateItem,
      onCampaignDocsRefresh,
      onHydrationUnblocked: resumeDocBodyHydration,
    })

  useEffect(() => {
    // Same ownership rule as the editor hydration: unsaved local body changes
    // must not reset the tracked current body for this doc.
    if (docBodyHydrationBlockedRef.current) return
    setCurrentDocBodyHtml(initialDocBodyContent)
  }, [initialItem.id, initialDocBodyContent, docBodyHydrationResumeNonce])

  useEffect(() => {
    let cancelled = false
    hashDocSource(currentDocBodyHtml).then((hash) => {
      if (!cancelled) setCurrentDocBodyHash(hash)
    })
    return () => {
      cancelled = true
    }
  }, [currentDocBodyHtml])

  const handleEditorDocBodyChange = useCallback(
    (html: string) => {
      docBodyHydrationBlockedRef.current = true
      setCurrentDocBodyHtml(html)
      handleDocBodyChange(html)
    },
    [handleDocBodyChange],
  )

  const editor = useDocTiptapEditor({
    initialItemId: initialItem.id,
    initialDocBodyContent,
    docBodyHydrationResumeNonce,
    inline: !!inline,
    docLocked,
    isDriveDoc,
    docBodyHydrationBlockedRef,
    handleDocBodyChange: handleEditorDocBodyChange,
  })

  const discardPendingSlashRange = useCallback(() => {
    pendingSlashRangeRef.current = null
  }, [])

  const clearPendingSlashText = useCallback(() => {
    if (!editor || !pendingSlashRangeRef.current) return
    clearDocSlashInsertText(editor, pendingSlashRangeRef.current)
    pendingSlashRangeRef.current = null
  }, [editor])

  const insertBodyImage = useCallback(
    (url: string) => {
      clearPendingSlashText()
      editor?.chain().focus().setImage({ src: url }).run()
    },
    [clearPendingSlashText, editor],
  )

  const handleBodyImageFileUpload = useCallback(
    async (file: File | undefined) => {
      if (!file?.type.startsWith('image/')) return
      try {
        const { url } = await presignPutUploadFile({
          file,
          category: 'image',
          ...(campaignId ? { campaign_id: campaignId } : {}),
          ...(activeSpaceId ? { space_id: activeSpaceId } : {}),
        })
        insertBodyImage(url)
      } catch (err) {
        void reportClientError({
          feature: 'ui/doc_editor',
          error_code: 'doc_body_image_upload_failed',
          message: err instanceof Error ? err.message : String(err),
          context: { itemId: item.id },
        })
      }
    },
    [activeSpaceId, campaignId, insertBodyImage, item.id],
  )

  useEffect(() => {
    if (isDriveDoc || docLocked) {
      registerDocImageInsertHandler(null)
      return
    }
    registerDocImageInsertHandler(({ getAnchorRect, slashRange }) => {
      pendingSlashRangeRef.current = slashRange
      setBodyImageAnchorRect(getAnchorRect())
      setBodyImageInsertOpen(true)
    })
    return () => registerDocImageInsertHandler(null)
  }, [docLocked, isDriveDoc])

  const { floatingToolbarPos } = useDocFloatingToolbar(editor, !!inline, initialItem.id)

  const flushCurrentDocBody = useCallback(async () => {
    if (!editor) return
    const html = editor.getHTML()
    setCurrentDocBodyHtml(html)
    await flushDocBodyChange(html)
  }, [editor, flushDocBodyChange])
  flushDocBodyRef.current = flushCurrentDocBody

  const handleTitleBlur = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) {
      if (item.title !== 'Untitled') void handleUpdateField({ title: 'Untitled' })
      return
    }
    if (trimmed !== item.title) void handleUpdateField({ title: trimmed })
  }, [title, item.title, handleUpdateField])

  const plainText = localDocBodyRef.current
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const wordCount = plainText ? plainText.split(/\s+/).length : 0
  const charCount = plainText.length
  const currentDocBodyTrimmed = currentDocBodyHtml.trim()
  const hasCurrentDocBody = currentDocBodyTrimmed !== '' && currentDocBodyTrimmed !== '<p></p>'

  const hasDocProperties = propsFields.length > 0 || addableFields.length > 0
  const canShareItem = !item.id.startsWith('cdoc:') && !item.id.startsWith('mdel:')

  const layoutWidthStyle = docFullWidth
    ? ({ paddingLeft: 48, paddingRight: 48 } as const)
    : ({ maxWidth: 720 } as const)

  const renderPropertiesInner = useCallback(
    (singleColumn: boolean) =>
      hasDocProperties ? (
        <DocPropertiesSection
          singleColumn={singleColumn}
          propsFields={propsFields}
          addableFields={addableFields}
          item={item}
          roster={roster ?? []}
          currentUserId={currentUserId ?? null}
          onUpdateField={handleUpdateField}
          onHideField={handleHideField}
          onEditStatuses={onEditStatuses}
          onEditCategories={onEditCategories}
          onCreateOption={onCreateOption}
          onUpdateOption={onUpdateOption}
          onDeleteOption={onDeleteOption}
          onTagCustomSwatchesChange={onTagCustomSwatchesChange}
          statusFieldForCell={statusFieldForCell}
          allFields={allFields}
          addPropOpen={addPropOpen}
          setAddPropOpen={setAddPropOpen}
          onAddField={handleAddField}
        />
      ) : null,
    [
      hasDocProperties,
      propsFields,
      addableFields,
      item,
      roster,
      currentUserId,
      handleUpdateField,
      handleHideField,
      onEditStatuses,
      onEditCategories,
      onCreateOption,
      onUpdateOption,
      onDeleteOption,
      onTagCustomSwatchesChange,
      statusFieldForCell,
      allFields,
      addPropOpen,
      handleAddField,
    ],
  )

  void _unusedCategoryField

  const itemForInner =
    item.doc_body === initialDocBodyContent ? item : { ...item, doc_body: initialDocBodyContent }

  const innerContent = (
    <DocEditorPanelInner
      inline={!!inline}
      item={itemForInner}
      roster={roster}
      campaignId={campaignId}
      layoutWidthStyle={layoutWidthStyle}
      docCoverUrl={docCoverUrl}
      docShowCover={docShowCover}
      coverContainerRef={coverContainerRef}
      coverRepositioning={coverRepositioning}
      setCoverRepositioning={setCoverRepositioning}
      coverFocalY={coverFocalY}
      handleCoverDragStart={handleCoverDragStart}
      handleCoverDragMove={handleCoverDragMove}
      handleCoverDragEnd={handleCoverDragEnd}
      coverDropdownOpen={coverDropdownOpen}
      setCoverDropdownOpen={setCoverDropdownOpen}
      coverDropdownRef={coverDropdownRef}
      coverBtnRef={coverBtnRef}
      fieldsCoverBtnRef={fieldsCoverBtnRef}
      coverHeroChangeBtnRef={coverHeroChangeBtnRef}
      coverFileInputRef={coverFileInputRef}
      setCoverMediaPickerOpen={setCoverMediaPickerOpen}
      setCoverGenerateOpen={setCoverGenerateOpen}
      handleUpdateField={handleUpdateField}
      flushDocBody={flushCurrentDocBody}
      handleCoverFileUpload={handleCoverFileUpload}
      titleRef={titleRef}
      title={title}
      setTitle={setTitle}
      handleTitleBlur={handleTitleBlur}
      editorFontFamily={editorFontFamily}
      docFontSize={docFontSize}
      docLocked={docLocked}
      isDriveDoc={isDriveDoc}
      requestClosePanel={requestClosePanel}
      hasDocProperties={!isDriveDoc && hasDocProperties}
      docFieldsSectionOpen={docFieldsSectionOpen}
      setDocFieldsSectionOpen={setDocFieldsSectionOpen}
      renderPropertiesInner={renderPropertiesInner}
      editor={editor}
      embedSubpagesMode={embedSubpagesMode}
      hasDocSubpagesChildren={hasDocSubpagesChildren}
      onSelectChildDoc={onSelectChildDoc}
      driveFileId={driveFileId}
      driveMimeType={driveMimeType}
      driveModifiedTime={driveModifiedTime}
      driveWebViewLink={driveWebViewLink}
      floatingToolbarPos={floatingToolbarPos}
      fieldsSlideOpen={fieldsSlideOpen}
      pageSettingsOpen={pageSettingsOpen}
      setFieldsSlideOpen={setFieldsSlideOpen}
      setPageSettingsOpen={setPageSettingsOpen}
      shareOpen={shareOpen}
      setShareOpen={setShareOpen}
      canShareItem={!isDriveDoc && canShareItem}
      wordCount={wordCount}
      charCount={charCount}
      saveStatus={saveStatus}
      docFontStyle={docFontStyle}
      docFullWidth={docFullWidth}
      docShowOutline={docShowOutline}
      docSubpagesDisplay={docSubpagesDisplay}
      updateDocSetting={updateDocSetting}
      editorFontSizePx={editorFontSizePx}
      coverMediaPickerOpen={coverMediaPickerOpen}
      coverGenerateOpen={coverGenerateOpen}
      setCoverUrl={setCoverUrl}
      bodyImageInsertOpen={bodyImageInsertOpen}
      bodyImageAnchorRect={bodyImageAnchorRect}
      setBodyImageInsertOpen={setBodyImageInsertOpen}
      bodyImageFileInputRef={bodyImageFileInputRef}
      bodyImageMediaPickerOpen={bodyImageMediaPickerOpen}
      setBodyImageMediaPickerOpen={setBodyImageMediaPickerOpen}
      bodyImageGenerateOpen={bodyImageGenerateOpen}
      setBodyImageGenerateOpen={setBodyImageGenerateOpen}
      handleBodyImageFileUpload={handleBodyImageFileUpload}
      insertBodyImage={insertBodyImage}
      clearPendingSlashText={clearPendingSlashText}
      discardPendingSlashRange={discardPendingSlashRange}
      bodyImageSpaceId={activeSpaceId}
      docVisualHtml={docVisualHtml}
      docVisualStatus={docVisualStatus}
      docVisualUpdatedAt={docVisualUpdatedAt}
      docVisualSourceHash={docVisualSourceHash}
      docVisualDefaultMode={
        searchParams.get('item') === item.id && searchParams.get('doc_tab') === 'visual'
          ? 'visual'
          : docVisualDefaultMode
      }
      docVisualLastError={docVisualLastError}
      hasCurrentDocBody={hasCurrentDocBody}
      currentDocBodyHash={currentDocBodyHash}
    />
  )

  if (inline) {
    return <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{innerContent}</div>
  }

  return (
    <DocEditorPanelPortalShell
      portalTarget={portalTarget}
      isResizing={isResizing}
      requestClosePanel={requestClosePanel}
      panelSlideExiting={panelSlideExiting}
      panelWidth={panelWidth}
      handleResizePointerDown={handleResizePointerDown}
      onSlideAnimationComplete={onSlideAnimationComplete}
    >
      {innerContent}
    </DocEditorPanelPortalShell>
  )
}
