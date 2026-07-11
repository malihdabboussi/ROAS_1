"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const document_intelligence_policy_1 = require("./document-intelligence-policy");
(0, vitest_1.describe)('document intelligence policy', () => {
    (0, vitest_1.it)('marks repeated Vibey watermark PDF text as low signal', () => {
        const text = Array.from({ length: 10 }, () => 'Made with Vibey').join('\n');
        const result = (0, document_intelligence_policy_1.assessDocumentTextQuality)({
            text,
            pageCount: 10,
            mimeType: 'application/pdf',
            filename: 'inbar-upload.pdf',
        });
        (0, vitest_1.expect)(result.quality).toBe('low_signal');
        (0, vitest_1.expect)(result.reason).toBe('boilerplate_or_watermark_dominates');
    });
    (0, vitest_1.it)('marks real multi-sentence document text as usable', () => {
        const result = (0, document_intelligence_policy_1.assessDocumentTextQuality)({
            text: [
                'Customer research shows strong demand for a faster onboarding flow.',
                'The PDF includes market analysis, pricing notes, competitor positioning, and launch risks.',
                'Recommended next steps include validating the conversion funnel and support handoff.',
            ].join('\n'),
            pageCount: 3,
            mimeType: 'application/pdf',
            filename: 'research.pdf',
        });
        (0, vitest_1.expect)(result.quality).toBe('usable');
    });
});
//# sourceMappingURL=document-intelligence-policy.test.js.map