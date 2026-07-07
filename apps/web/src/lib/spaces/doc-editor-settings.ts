import type {
  DocFontSize,
  DocFontStyle,
  DocSubpagesDisplayMode,
  DocViewMode,
  DocVisualStatus,
} from './doc-editor-types'

export function getDocCustomDataRecord(
  customData: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return (customData ?? {}) as Record<string, unknown>
}

export function getDocCoverUrl(docCustomData: Record<string, unknown>): string | null {
  const raw = docCustomData._doc_cover_url
  return typeof raw === 'string' && raw.trim() ? raw : null
}

export function parseDocEditorUiFromCustomData(docCustomData: Record<string, unknown>) {
  const docFontStyle = (docCustomData._doc_font_style as DocFontStyle | undefined) ?? 'system'
  const docFontSize = (docCustomData._doc_font_size as DocFontSize | undefined) ?? 'default'
  const docFullWidth = (docCustomData._doc_full_width as boolean | undefined) ?? false
  const docShowCover = (docCustomData._doc_show_cover as boolean | undefined) ?? true
  const docShowOutline = (docCustomData._doc_show_outline as boolean | undefined) ?? false
  const docLocked = (docCustomData._doc_locked as boolean | undefined) ?? false
  const isDriveDoc = (docCustomData._doc_source as string | undefined) === 'drive'
  const driveFileId =
    typeof docCustomData._drive_file_id === 'string' && docCustomData._drive_file_id.trim()
      ? docCustomData._drive_file_id
      : null
  const driveMimeType =
    typeof docCustomData._drive_mime_type === 'string' ? docCustomData._drive_mime_type : null
  const driveModifiedTime =
    typeof docCustomData._drive_modified_time === 'string'
      ? docCustomData._drive_modified_time
      : null
  const driveWebViewLink =
    typeof docCustomData._drive_web_view_link === 'string'
      ? docCustomData._drive_web_view_link
      : null
  const docSubpagesDisplay =
    (docCustomData._doc_subpages_display as DocSubpagesDisplayMode | undefined) ?? 'table'
  const rawVisualHtml = docCustomData._doc_visual_html
  const docVisualHtml =
    typeof rawVisualHtml === 'string' && rawVisualHtml.trim() ? rawVisualHtml : null
  const rawVisualStatus = docCustomData._doc_visual_status
  const docVisualStatus: DocVisualStatus =
    rawVisualStatus === 'generating' || rawVisualStatus === 'ready' || rawVisualStatus === 'error'
      ? rawVisualStatus
      : 'none'
  const rawVisualUpdatedAt = docCustomData._doc_visual_updated_at
  const docVisualUpdatedAt =
    typeof rawVisualUpdatedAt === 'string' && rawVisualUpdatedAt.trim() ? rawVisualUpdatedAt : null
  const rawVisualSourceHash = docCustomData._doc_visual_source_hash
  const docVisualSourceHash =
    typeof rawVisualSourceHash === 'string' && rawVisualSourceHash.trim()
      ? rawVisualSourceHash
      : null
  const docVisualDefaultMode: DocViewMode =
    docCustomData._doc_visual_default_mode === 'visual' ? 'visual' : 'doc'
  const rawVisualLastError = docCustomData._doc_visual_last_error
  const docVisualLastError =
    typeof rawVisualLastError === 'string' && rawVisualLastError.trim() ? rawVisualLastError : null

  return {
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
  }
}

export function editorFontFamilyForStyle(docFontStyle: DocFontStyle): string {
  if (docFontStyle === 'serif') return 'Georgia, "Times New Roman", serif'
  if (docFontStyle === 'mono') return '"SF Mono", "Fira Code", "Cascadia Code", monospace'
  return 'inherit'
}

export function editorFontSizePxForSize(docFontSize: DocFontSize): string {
  if (docFontSize === 'small') return '13px'
  if (docFontSize === 'large') return '16px'
  return '14px'
}
