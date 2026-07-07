/**
 * Collect image files from a paste clipboard (screenshots, copied images).
 * Does not read text/html or non-file clipboard payloads.
 */
export function extractClipboardImageFilesFromItems(
  items: DataTransferItemList | null | undefined,
): File[] {
  if (!items || items.length === 0) return []
  const files: File[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!item || item.kind !== 'file') continue
    if (!item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (file) files.push(file)
  }
  return files
}

export function extractClipboardImageFiles(event: { clipboardData: DataTransfer | null }): File[] {
  return extractClipboardImageFilesFromItems(event.clipboardData?.items)
}
