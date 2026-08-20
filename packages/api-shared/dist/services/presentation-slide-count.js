"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countPresentationSlides = countPresentationSlides;
const SECTION_OPEN_TAG = /<section\b[^>]*>/gi;
const CLASS_ATTRIBUTE = /\bclass\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))/i;
function countPresentationSlides(html) {
    if (!html.trim())
        return 0;
    return [...html.matchAll(SECTION_OPEN_TAG)].reduce((count, match) => {
        const classMatch = (match[0] ?? '').match(CLASS_ATTRIBUTE);
        const classNames = (classMatch?.[2] ?? classMatch?.[3] ?? '').split(/\s+/);
        return classNames.includes('slide') ? count + 1 : count;
    }, 0);
}
//# sourceMappingURL=presentation-slide-count.js.map