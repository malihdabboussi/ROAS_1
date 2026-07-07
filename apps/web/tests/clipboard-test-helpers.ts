/**
 * JSDOM does not implement a constructible DataTransfer. Tests that fire paste events
 * can pass these minimal clipboardData shapes; production uses real browser DataTransfer.
 */
function makeItemList(
  entries: Array<{ kind: 'file'; type: string; getAsFile: () => File }>,
): DataTransferItemList {
  const list = { length: entries.length } as Record<number | 'length', unknown>
  for (let i = 0; i < entries.length; i++) {
    list[i] = entries[i]
  }
  return list as unknown as DataTransferItemList
}

export function fakeClipboardWithImageFiles(files: File[]): DataTransfer {
  const entries = files.map((file) => ({
    kind: 'file' as const,
    type: file.type || 'image/png',
    getAsFile: () => file,
  }))
  return { items: makeItemList(entries) } as unknown as DataTransfer
}

export function fakeClipboardTextOnly(): DataTransfer {
  return {
    items: makeItemList([]),
    getData: (type: string) => (type === 'text/plain' ? 'hello' : ''),
  } as unknown as DataTransfer
}
