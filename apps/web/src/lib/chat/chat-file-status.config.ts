import type { DocumentIntelligenceStatus } from './document-attachments'

export const CHAT_FILE_STATUS_LABELS: Record<
  DocumentIntelligenceStatus | 'uploaded',
  { label: string; className: string }
> = {
  processing: {
    label: 'Reading',
    className: 'text-muted-foreground',
  },
  ready: {
    label: 'Ready',
    className: 'text-foreground',
  },
  failed: {
    label: 'Failed',
    className: 'text-destructive',
  },
  uploaded: {
    label: 'Uploaded',
    className: 'text-muted-foreground',
  },
}
