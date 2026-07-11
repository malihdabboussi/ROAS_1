export type DocumentTextQuality = 'empty' | 'low_signal' | 'usable';
export type DocumentExtractionStrategy = 'native_text' | 'ocr' | 'native_file' | 'metadata_only';
export type DocumentIntelligenceStatus = 'processing' | 'ready' | 'failed';
export interface DocumentTextQualityAssessment {
    quality: DocumentTextQuality;
    reason: string;
    confidence: number;
    charCount: number;
    pageCount: number | null;
    uniqueTokenCount: number;
    repeatedLineRatio: number;
    boilerplateRatio: number;
}
export interface DocumentIntelligenceMetadata {
    status: DocumentIntelligenceStatus;
    strategy: DocumentExtractionStrategy;
    text_quality: DocumentTextQuality;
    reason: string;
    confidence: number;
    chars: number;
    native_chars?: number;
    ocr_chars?: number;
    page_count: number | null;
    unique_tokens?: number;
    repeated_line_ratio?: number;
    boilerplate_ratio?: number;
    processed_at: string;
    error?: string;
}
export interface AssessDocumentTextQualityInput {
    text?: string | null;
    pageCount?: number | null;
    mimeType?: string | null;
    filename?: string | null;
}
export declare function assessDocumentTextQuality(input: AssessDocumentTextQualityInput): DocumentTextQualityAssessment;
export declare function isDocumentTextUsable(input: AssessDocumentTextQualityInput): boolean;
export declare function buildDocumentIntelligenceMetadata(input: {
    status: DocumentIntelligenceStatus;
    strategy: DocumentExtractionStrategy;
    assessment: DocumentTextQualityAssessment;
    nativeChars?: number;
    ocrChars?: number;
    processedAt?: string;
    error?: string;
}): DocumentIntelligenceMetadata;
