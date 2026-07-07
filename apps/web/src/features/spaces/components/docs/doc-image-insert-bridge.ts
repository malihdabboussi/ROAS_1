import type { DocSlashInsertRange } from './doc-slash-insert-text'

export interface DocImageInsertRequest {
  slashRange: DocSlashInsertRange
  getAnchorRect: () => DOMRect | null
}

type DocImageInsertHandler = (request: DocImageInsertRequest) => void

let handler: DocImageInsertHandler | null = null

export function registerDocImageInsertHandler(next: DocImageInsertHandler | null): void {
  handler = next
}

export function requestDocImageInsert(request: DocImageInsertRequest): void {
  handler?.(request)
}
