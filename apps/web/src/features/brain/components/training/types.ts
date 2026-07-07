import type { MediaAsset } from '@/lib/services/media-api'
import type { SkDomain, SkSourceType } from '../../services/sk.service'
import type { FathomMeeting, FirefliesTranscript } from '../../services/user-brain-import.service'
import type { BrainUploadKind } from '../../utils/upload-validation'

export type SourceKey =
  | 'add'
  | 'paste'
  | 'files'
  | 'drive'
  | 'dropbox'
  | 'media-library'
  | 'fathom'
  | 'fireflies'

export type LinkPlatform =
  | 'YouTube'
  | 'Instagram'
  | 'TikTok'
  | 'LinkedIn'
  | 'Facebook'
  | 'X/Twitter'
  | 'Web'

export interface LinkDetection {
  supported: boolean
  platform?: LinkPlatform
  sourceType: SkSourceType
}

export type StagedPayload =
  | { kind: 'text'; title: string; body: string }
  | { kind: 'link'; url: string; detection?: LinkDetection }
  | {
      kind: 'file'
      file: File
      mediaKind: BrainUploadKind
      /** dataURL preview for images (lazy populated). */
      previewUrl?: string
    }
  | { kind: 'media-asset'; asset: MediaAsset }
  | { kind: 'fathom'; meeting: FathomMeeting }
  | { kind: 'fireflies'; transcript: FirefliesTranscript }

export interface StagedItem {
  id: string
  source: SourceKey
  payload: StagedPayload
  preview: { title: string; subtitle?: string }
  metadata: {
    sourceType: SkSourceType
    domain: SkDomain
    titleOverride?: string
  }
  /** Hash used to detect duplicates within the batch or against the brain. */
  signature: string
  /** Brain target ids snapshotted at staging time. Empty array → falls back to legacy single brainId. */
  targetBrainIds: string[]
  warnings: {
    duplicateInBatch?: boolean
    alreadyInBrain?: boolean
  }
}

export type StagedDraft = Omit<
  StagedItem,
  'id' | 'warnings' | 'metadata' | 'signature' | 'targetBrainIds'
> & {
  metadata?: Partial<StagedItem['metadata']>
}

export interface BrainQueueDispatchResult {
  id: string
  ok: boolean
  deduped?: boolean
  error?: string
}
