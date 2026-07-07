'use client'

export const SPACE_PRESENTATION_SOURCE_IMPORT_EVENT = 'space-vibey:presentation-source-import'
export const SPACE_COMPOSER_IMPORT_FILES_EVENT = 'space-vibey:composer-import-files'

export type SpacePresentationSourceImportDetail = {
  files: File[]
  prompt: string
}

export function buildPresentationSourceImportPrompt(file: File): string {
  const sourceLabel = file.name.trim() || 'the attached PPTX/PDF'
  return `Take the attached PPTX/PDF (${sourceLabel}) and turn it into an editable Vibey HTML presentation.

Use read_document with the attached asset_id if the extracted text is partial, empty, scanned, or visually complex. Recreate the deck as an HTML bundle by calling create_presentation with files and index.html as the entry_file. Wrap every slide in a <section> element. Preserve slide order, headings, hierarchy, colors, tables, charts, images, and speaker notes as closely as possible. Use semantic HTML and clear class names so the presentation editor and markup tools can edit it.`
}

export function dispatchPresentationSourceImport(file: File) {
  window.dispatchEvent(
    new CustomEvent<SpacePresentationSourceImportDetail>(SPACE_PRESENTATION_SOURCE_IMPORT_EVENT, {
      detail: {
        files: [file],
        prompt: buildPresentationSourceImportPrompt(file),
      },
    }),
  )
}
