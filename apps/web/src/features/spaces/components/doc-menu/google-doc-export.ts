const GOOGLE_DOC_FILE_ID = /^[A-Za-z0-9_-]+$/

export function googleDocHref(customData?: Record<string, unknown> | null): string | null {
  const fileId = customData?._google_doc_file_id
  if (typeof fileId !== 'string' || !GOOGLE_DOC_FILE_ID.test(fileId)) return null
  return `https://docs.google.com/document/d/${fileId}/edit`
}

export function googleDocMetadataPatch(
  file: { id: string; webViewLink?: string },
  exportedAt = new Date().toISOString(),
): Record<string, unknown> {
  return {
    _google_doc_file_id: file.id,
    _google_doc_web_view_link:
      file.webViewLink || `https://docs.google.com/document/d/${file.id}/edit`,
    _google_doc_exported_at: exportedAt,
  }
}
