"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairBrokenMarkdownLinks = repairBrokenMarkdownLinks;
exports.unwrapFathomProseLinks = unwrapFathomProseLinks;
exports.stripAtxHeaders = stripAtxHeaders;
exports.stripMarkdownEmphasis = stripMarkdownEmphasis;
exports.sanitizeFathomSummaryMarkdown = sanitizeFathomSummaryMarkdown;
exports.looksLikeFathomSummaryMarkdown = looksLikeFathomSummaryMarkdown;
const FATHOM_HOST = /(?:^|\.)fathom\.video$/i;
function repairBrokenMarkdownLinks(markdown) {
    if (!markdown.includes(']('))
        return markdown;
    return markdown.replace(/\[([^\]]*)\]\(([\s\S]*?)\)/g, (_full, label, urlBody) => {
        const url = urlBody.replace(/\s+/g, '');
        return `[${label}](${url})`;
    });
}
function isFathomUrl(url) {
    try {
        const host = new URL(url).hostname;
        return FATHOM_HOST.test(host);
    }
    catch {
        return /fathom\.video/i.test(url);
    }
}
function unwrapFathomProseLinks(markdown) {
    return markdown.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (full, label, url) => {
        if (!isFathomUrl(url))
            return full;
        const trimmed = label.trim();
        const looksLikeTimestampChip = /^\[?\d{1,2}:\d{2}(?::\d{2})?\]?$/.test(trimmed);
        if (looksLikeTimestampChip)
            return full;
        if (trimmed.length >= 24 || /\s/.test(trimmed))
            return trimmed;
        return full;
    });
}
function stripAtxHeaders(markdown) {
    return markdown.replace(/^#{1,6}\s+(.+)$/gm, '$1');
}
function stripMarkdownEmphasis(markdown) {
    let next = markdown;
    next = next.replace(/\*\*([^*\n]+)\*\*/g, '$1');
    next = next.replace(/__([^_\n]+)__/g, '$1');
    next = next.replace(/(^|[^*\n])\*([^*\n]+)\*(?!\*)/gm, '$1$2');
    next = next.replace(/(^|[^_\n])_([^_\n]+)_(?!_)/gm, '$1$2');
    next = next.replace(/\*\*/g, '');
    next = next.replace(/__/g, '');
    return next;
}
function sanitizeFathomSummaryMarkdown(raw) {
    const input = String(raw ?? '').trim();
    if (!input)
        return '';
    let next = repairBrokenMarkdownLinks(input);
    next = unwrapFathomProseLinks(next);
    next = stripAtxHeaders(next);
    next = stripMarkdownEmphasis(next);
    next = next.replace(/\n{3,}/g, '\n\n').trim();
    return next;
}
function looksLikeFathomSummaryMarkdown(raw) {
    const text = String(raw ?? '');
    if (!text)
        return false;
    if (/fathom\.video/i.test(text) && (text.includes('](') || /^#{1,6}\s/m.test(text)))
        return true;
    if (/^#{1,6}\s/m.test(text))
        return true;
    if (/\*\*[^*\n]+\*\*/.test(text))
        return true;
    if (/__[^_\n]+__/.test(text))
        return true;
    return false;
}
//# sourceMappingURL=sanitize-fathom-summary-markdown.js.map