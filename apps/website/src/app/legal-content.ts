import { readFileSync } from 'node:fs'
import path from 'node:path'

const LEGAL_DOCS_BASE_PATH = path.join(process.cwd(), 'src/app/legal')

export type LegalDocName =
  | 'terms-of-service.md'
  | 'privacy-policy.md'
  | 'refund-policy.md'
  | 'disclaimer.md'

export function getLegalContent(fileName: LegalDocName): string {
  return readFileSync(path.join(LEGAL_DOCS_BASE_PATH, fileName), 'utf-8')
}
