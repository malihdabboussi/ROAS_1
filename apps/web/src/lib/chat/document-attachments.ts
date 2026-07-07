export interface DocumentAttachment {
  filename: string
  type: 'text' | 'image' | 'video' | 'audio'
  text?: string
  dataUrl?: string
  fileUrl?: string
  mediaAssetId?: string
  /** Client / upload MIME hint for preview routing (e.g. application/pdf) */
  mimeType?: string
  sizeBytes?: number
  pageCount?: number
  preview?: string
  documentIntelligence?: DocumentIntelligenceMetadata | null
}

export type DocumentTextQuality = 'empty' | 'low_signal' | 'usable'
export type DocumentExtractionStrategy = 'native_text' | 'ocr' | 'native_file' | 'metadata_only'
export type DocumentIntelligenceStatus = 'processing' | 'ready' | 'failed'

export interface DocumentIntelligenceMetadata {
  status: DocumentIntelligenceStatus
  strategy?: DocumentExtractionStrategy
  text_quality?: DocumentTextQuality
  reason?: string
  confidence?: number
  chars?: number
  native_chars?: number
  ocr_chars?: number
  page_count?: number | null
  processed_at?: string
  error?: string
}
