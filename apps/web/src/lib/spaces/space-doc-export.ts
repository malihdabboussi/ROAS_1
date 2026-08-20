import { googleFileId, googleNativeOpenHref, safeGoogleOpenHref } from './google-open-href'

export function googleDocHref(customData?: Record<string, unknown> | null): string | null {
  const savedLink = safeGoogleOpenHref(
    typeof customData?._google_doc_web_view_link === 'string'
      ? customData._google_doc_web_view_link
      : null,
  )
  if (savedLink) return savedLink
  const fileId = googleFileId(customData?._google_doc_file_id)
  return fileId ? googleNativeOpenHref(fileId, 'application/vnd.google-apps.document') : null
}

export function googleDocMetadataPatch(
  file: { id: string; webViewLink?: string },
  exportedAt = new Date().toISOString(),
): Record<string, unknown> {
  const fileId = googleFileId(file.id) ?? file.id
  return {
    _google_doc_file_id: fileId,
    _google_doc_web_view_link:
      safeGoogleOpenHref(file.webViewLink) ??
      googleNativeOpenHref(fileId, 'application/vnd.google-apps.document') ??
      `https://docs.google.com/document/d/${fileId}/edit`,
    _google_doc_exported_at: exportedAt,
  }
}

export function buildSpaceDocExportHtml(title: string, docBody: string): string {
  const heading = title.trim() || 'Untitled'
  const escapedTitle = heading
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapedTitle}</title>
</head>
<body>
<h1>${escapedTitle}</h1>
${docBody}
</body>
</html>`
}
