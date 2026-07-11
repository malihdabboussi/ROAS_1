"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessDocumentTextQuality = assessDocumentTextQuality;
exports.isDocumentTextUsable = isDocumentTextUsable;
exports.buildDocumentIntelligenceMetadata = buildDocumentIntelligenceMetadata;
const BOILERPLATE_PATTERNS = [
    /made\s+with\s+vibey/gi,
    /powered\s+by\s+vibey/gi,
    /created\s+with\s+vibey/gi,
    /generated\s+with\s+vibey/gi,
];
function normalizeWhitespace(value) {
    return value.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').trim();
}
function tokenize(value) {
    const matches = value.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu);
    return matches ?? [];
}
function calculateRepeatedLineRatio(text) {
    const lines = text
        .split('\n')
        .map((line) => normalizeWhitespace(line).toLowerCase())
        .filter((line) => line.length > 0);
    if (lines.length < 3)
        return 0;
    const counts = new Map();
    for (const line of lines) {
        counts.set(line, (counts.get(line) ?? 0) + 1);
    }
    let repeated = 0;
    for (const count of counts.values()) {
        if (count > 1)
            repeated += count;
    }
    return repeated / lines.length;
}
function calculateBoilerplateRatio(text) {
    const normalized = normalizeWhitespace(text);
    if (!normalized)
        return 0;
    let matchedChars = 0;
    for (const pattern of BOILERPLATE_PATTERNS) {
        for (const match of normalized.matchAll(pattern)) {
            matchedChars += match[0]?.length ?? 0;
        }
    }
    return matchedChars / normalized.length;
}
function removeBoilerplate(text) {
    let cleaned = text;
    for (const pattern of BOILERPLATE_PATTERNS) {
        cleaned = cleaned.replace(pattern, ' ');
    }
    return normalizeWhitespace(cleaned);
}
function isDocumentMimeLike(value) {
    if (!value)
        return false;
    const normalized = value.toLowerCase();
    return (normalized === 'application/pdf' ||
        normalized.includes('document') ||
        normalized.includes('presentation') ||
        normalized.includes('spreadsheet') ||
        normalized.startsWith('text/') ||
        normalized.includes('csv') ||
        normalized.includes('json') ||
        normalized.includes('xml') ||
        normalized.includes('yaml'));
}
function assessDocumentTextQuality(input) {
    const text = normalizeWhitespace(input.text ?? '');
    const charCount = text.length;
    const pageCount = typeof input.pageCount === 'number' && Number.isFinite(input.pageCount)
        ? Math.max(0, Math.floor(input.pageCount))
        : null;
    if (charCount === 0) {
        return {
            quality: 'empty',
            reason: 'empty_text',
            confidence: 1,
            charCount,
            pageCount,
            uniqueTokenCount: 0,
            repeatedLineRatio: 0,
            boilerplateRatio: 0,
        };
    }
    const tokens = tokenize(text);
    const uniqueTokenCount = new Set(tokens).size;
    const repeatedLineRatio = calculateRepeatedLineRatio(text);
    const boilerplateRatio = calculateBoilerplateRatio(text);
    const textWithoutBoilerplate = removeBoilerplate(text);
    const documentLike = isDocumentMimeLike(input.mimeType) ||
        /\.(pdf|docx?|pptx?|xlsx?|xlsm|csv|tsv|json|xml|ya?ml|txt|md)$/i.test(input.filename ?? '');
    if (boilerplateRatio >= 0.35 || (textWithoutBoilerplate.length < 80 && boilerplateRatio > 0)) {
        return {
            quality: 'low_signal',
            reason: 'boilerplate_or_watermark_dominates',
            confidence: 0.96,
            charCount,
            pageCount,
            uniqueTokenCount,
            repeatedLineRatio,
            boilerplateRatio,
        };
    }
    if (repeatedLineRatio >= 0.65 && uniqueTokenCount <= 12 && charCount < 2000) {
        return {
            quality: 'low_signal',
            reason: 'mostly_repeated_lines',
            confidence: 0.9,
            charCount,
            pageCount,
            uniqueTokenCount,
            repeatedLineRatio,
            boilerplateRatio,
        };
    }
    const multiPage = pageCount != null && pageCount > 1;
    if (documentLike && multiPage && uniqueTokenCount < Math.max(12, pageCount * 3)) {
        return {
            quality: 'low_signal',
            reason: 'very_low_unique_tokens_for_page_count',
            confidence: 0.86,
            charCount,
            pageCount,
            uniqueTokenCount,
            repeatedLineRatio,
            boilerplateRatio,
        };
    }
    if (documentLike && multiPage && charCount < pageCount * 40) {
        return {
            quality: 'low_signal',
            reason: 'too_few_characters_for_page_count',
            confidence: 0.82,
            charCount,
            pageCount,
            uniqueTokenCount,
            repeatedLineRatio,
            boilerplateRatio,
        };
    }
    if (uniqueTokenCount <= 3 && charCount < 120) {
        return {
            quality: 'low_signal',
            reason: 'too_few_unique_tokens',
            confidence: 0.78,
            charCount,
            pageCount,
            uniqueTokenCount,
            repeatedLineRatio,
            boilerplateRatio,
        };
    }
    return {
        quality: 'usable',
        reason: 'usable_text',
        confidence: 0.9,
        charCount,
        pageCount,
        uniqueTokenCount,
        repeatedLineRatio,
        boilerplateRatio,
    };
}
function isDocumentTextUsable(input) {
    return assessDocumentTextQuality(input).quality === 'usable';
}
function buildDocumentIntelligenceMetadata(input) {
    return {
        status: input.status,
        strategy: input.strategy,
        text_quality: input.assessment.quality,
        reason: input.error ?? input.assessment.reason,
        confidence: input.assessment.confidence,
        chars: input.assessment.charCount,
        ...(typeof input.nativeChars === 'number' ? { native_chars: input.nativeChars } : {}),
        ...(typeof input.ocrChars === 'number' ? { ocr_chars: input.ocrChars } : {}),
        page_count: input.assessment.pageCount,
        unique_tokens: input.assessment.uniqueTokenCount,
        repeated_line_ratio: Number(input.assessment.repeatedLineRatio.toFixed(3)),
        boilerplate_ratio: Number(input.assessment.boilerplateRatio.toFixed(3)),
        processed_at: input.processedAt ?? new Date().toISOString(),
        ...(input.error ? { error: input.error } : {}),
    };
}
//# sourceMappingURL=document-intelligence-policy.js.map