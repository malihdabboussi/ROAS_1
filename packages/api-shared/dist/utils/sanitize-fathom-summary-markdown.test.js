"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sanitize_fathom_summary_markdown_1 = require("./sanitize-fathom-summary-markdown");
(0, vitest_1.describe)('sanitize-fathom-summary-markdown', () => {
    (0, vitest_1.it)('repairs newlines inserted mid-URL in markdown links', () => {
        const broken = `[Dylan is manually managing ops](https://fathom.video/share/abc?
tab=summary&timestamp=800.0)`;
        (0, vitest_1.expect)((0, sanitize_fathom_summary_markdown_1.repairBrokenMarkdownLinks)(broken)).toBe('[Dylan is manually managing ops](https://fathom.video/share/abc?tab=summary&timestamp=800.0)');
    });
    (0, vitest_1.it)('unwraps Fathom prose takeaway links to plain text', () => {
        const md = '- [Dylan is manually managing the entire ops side](https://fathom.video/share/abc?tab=summary&timestamp=800.0)';
        (0, vitest_1.expect)((0, sanitize_fathom_summary_markdown_1.unwrapFathomProseLinks)(md)).toBe('- Dylan is manually managing the entire ops side');
    });
    (0, vitest_1.it)('keeps short timestamp chips intact', () => {
        const md = 'Quote [3:20](https://fathom.video/calls/123?timestamp=200)';
        (0, vitest_1.expect)((0, sanitize_fathom_summary_markdown_1.unwrapFathomProseLinks)(md)).toBe(md);
    });
    (0, vitest_1.it)('strips bold stars used as emphasis', () => {
        (0, vitest_1.expect)((0, sanitize_fathom_summary_markdown_1.stripMarkdownEmphasis)('- **Professional Wins:** Haroon resolved')).toBe('- Professional Wins: Haroon resolved');
        (0, vitest_1.expect)((0, sanitize_fathom_summary_markdown_1.stripMarkdownEmphasis)('- **Haroon:** Resolved a critical domain')).toBe('- Haroon: Resolved a critical domain');
    });
    (0, vitest_1.it)('sanitizes a full Fathom summary into readable plain text', () => {
        const raw = `## Key Takeaways

### Scaling Challenges & Operational Overhaul
- [Dylan is manually managing the entire ops side of the business — onboarding, billing, support, and fulfillment](https://fathom.video/share/xyz?
tab=summary&timestamp=800.0)
- **Nate's Framework:** Nate introduced a growth model

## Action Items
- Ship the onboarding checklist`;
        (0, vitest_1.expect)((0, sanitize_fathom_summary_markdown_1.sanitizeFathomSummaryMarkdown)(raw)).toBe(`Key Takeaways

Scaling Challenges & Operational Overhaul
- Dylan is manually managing the entire ops side of the business — onboarding, billing, support, and fulfillment
- Nate's Framework: Nate introduced a growth model

Action Items
- Ship the onboarding checklist`);
    });
    (0, vitest_1.it)('detects unsanitized Fathom summaries and leftover bold markdown', () => {
        (0, vitest_1.expect)((0, sanitize_fathom_summary_markdown_1.looksLikeFathomSummaryMarkdown)('- [Takeaway](https://fathom.video/share/x?timestamp=1)')).toBe(true);
        (0, vitest_1.expect)((0, sanitize_fathom_summary_markdown_1.looksLikeFathomSummaryMarkdown)('- **Professional Wins:** text')).toBe(true);
        (0, vitest_1.expect)((0, sanitize_fathom_summary_markdown_1.looksLikeFathomSummaryMarkdown)('Normal task notes')).toBe(false);
    });
    (0, vitest_1.it)('returns empty for blank input', () => {
        (0, vitest_1.expect)((0, sanitize_fathom_summary_markdown_1.sanitizeFathomSummaryMarkdown)(null)).toBe('');
        (0, vitest_1.expect)((0, sanitize_fathom_summary_markdown_1.sanitizeFathomSummaryMarkdown)('   ')).toBe('');
    });
});
//# sourceMappingURL=sanitize-fathom-summary-markdown.test.js.map