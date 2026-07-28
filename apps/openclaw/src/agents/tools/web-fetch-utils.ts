export type ExtractMode = "markdown" | "text";

const READABILITY_MAX_HTML_CHARS = 1_000_000;
const READABILITY_MAX_ESTIMATED_NESTING_DEPTH = 3_000;
/** Inline data-URI media bloats GHL/funnel HTML past fetch limits and then disappears on tag strip. */
const EMBEDDED_DATA_URI_RE =
  /data:(image|video|audio)\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+/gi;
/** GoHighLevel / builder placeholder labels that sit next to real headshots in the DOM. */
const MEDIA_PLACEHOLDER_LABEL_RE = /\bPHOTO\s*(?:→|->)\s*IG\b/gi;

let readabilityDepsPromise:
  | Promise<{
      Readability: typeof import("@mozilla/readability").Readability;
      parseHTML: typeof import("linkedom").parseHTML;
    }>
  | undefined;

async function loadReadabilityDeps(): Promise<{
  Readability: typeof import("@mozilla/readability").Readability;
  parseHTML: typeof import("linkedom").parseHTML;
}> {
  if (!readabilityDepsPromise) {
    readabilityDepsPromise = Promise.all([import("@mozilla/readability"), import("linkedom")]).then(
      ([readability, linkedom]) => ({
        Readability: readability.Readability,
        parseHTML: linkedom.parseHTML,
      }),
    );
  }
  try {
    return await readabilityDepsPromise;
  } catch (error) {
    readabilityDepsPromise = undefined;
    throw error;
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/gi, (_, dec) => String.fromCharCode(Number.parseInt(dec, 10)));
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ""));
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Replace huge inline data-URIs with short tokens so funnel HTML stays under
 * fetch/Readability size caps without deleting the fact that media existed.
 */
export function shrinkEmbeddedMedia(html: string): string {
  return html.replace(EMBEDDED_DATA_URI_RE, "data:$1/placeholder;base64,SHORT");
}

function attrValue(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  if (!match) return undefined;
  return match[1] ?? match[2] ?? match[3];
}

function imageMarkdownFromTag(tag: string): string {
  const alt = normalizeWhitespace(decodeEntities(attrValue(tag, "alt") ?? ""));
  const src = decodeEntities(attrValue(tag, "src") ?? "").trim();
  if (!src) {
    return alt ? `![${alt}]` : "![image]";
  }
  if (/^data:/i.test(src)) {
    return alt ? `![${alt}](embedded-image)` : "![image](embedded-image)";
  }
  return alt ? `![${alt}](${src})` : `![image](${src})`;
}

export function htmlToMarkdown(html: string): { text: string; title?: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? normalizeWhitespace(stripTags(titleMatch[1])) : undefined;
  let text = shrinkEmbeddedMedia(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  // Preserve image presence before stripTags — otherwise GHL pages look like
  // broken PHOTO→IG placeholders with no proof the headshots exist.
  text = text.replace(/<img\b[^>]*>/gi, (tag) => `\n${imageMarkdownFromTag(tag)}\n`);
  text = text.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, body) => {
    const label = normalizeWhitespace(stripTags(body));
    if (!label) {
      return href;
    }
    return `[${label}](${href})`;
  });
  text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, body) => {
    const prefix = "#".repeat(Math.max(1, Math.min(6, Number.parseInt(level, 10))));
    const label = normalizeWhitespace(stripTags(body));
    return `\n${prefix} ${label}\n`;
  });
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, body) => {
    const label = normalizeWhitespace(stripTags(body));
    return label ? `\n- ${label}` : "";
  });
  text = text
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|header|footer|table|tr|ul|ol)>/gi, "\n");
  text = stripTags(text);
  text = text.replace(MEDIA_PLACEHOLDER_LABEL_RE, "");
  text = normalizeWhitespace(text);
  return { text, title };
}

export function markdownToText(markdown: string): string {
  let text = markdown;
  // Keep a human-readable image marker; deleting images caused false "broken photo" reports.
  text = text.replace(/!\[([^\]]*)]\(([^)]*)\)/g, (_, alt: string) => {
    const label = normalizeWhitespace(alt) || "image";
    return `[image: ${label}]`;
  });
  text = text.replace(/!\[([^\]]*)]/g, (_, alt: string) => {
    const label = normalizeWhitespace(alt) || "image";
    return `[image: ${label}]`;
  });
  text = text.replace(/\[([^\]]+)]\([^)]+\)/g, "$1");
  text = text.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/```[^\n]*\n?/g, "").replace(/```/g, ""),
  );
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  text = text.replace(MEDIA_PLACEHOLDER_LABEL_RE, "");
  return normalizeWhitespace(text);
}

export function truncateText(
  value: string,
  maxChars: number,
): { text: string; truncated: boolean } {
  if (value.length <= maxChars) {
    return { text: value, truncated: false };
  }
  return { text: value.slice(0, maxChars), truncated: true };
}

function exceedsEstimatedHtmlNestingDepth(html: string, maxDepth: number): boolean {
  // Cheap heuristic to skip Readability+DOM parsing on pathological HTML (deep nesting => stack/memory blowups).
  // Not an HTML parser; tuned to catch attacker-controlled "<div><div>..." cases.
  const voidTags = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);

  let depth = 0;
  const len = html.length;
  for (let i = 0; i < len; i++) {
    if (html.charCodeAt(i) !== 60) {
      continue; // '<'
    }
    const next = html.charCodeAt(i + 1);
    if (next === 33 || next === 63) {
      continue; // <! ...> or <? ...>
    }

    let j = i + 1;
    let closing = false;
    if (html.charCodeAt(j) === 47) {
      closing = true;
      j += 1;
    }

    while (j < len && html.charCodeAt(j) <= 32) {
      j += 1;
    }

    const nameStart = j;
    while (j < len) {
      const c = html.charCodeAt(j);
      const isNameChar =
        (c >= 65 && c <= 90) || // A-Z
        (c >= 97 && c <= 122) || // a-z
        (c >= 48 && c <= 57) || // 0-9
        c === 58 || // :
        c === 45; // -
      if (!isNameChar) {
        break;
      }
      j += 1;
    }

    const tagName = html.slice(nameStart, j).toLowerCase();
    if (!tagName) {
      continue;
    }

    if (closing) {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (voidTags.has(tagName)) {
      continue;
    }

    // Best-effort self-closing detection: scan a short window for "/>".
    let selfClosing = false;
    for (let k = j; k < len && k < j + 200; k++) {
      const c = html.charCodeAt(k);
      if (c === 62) {
        if (html.charCodeAt(k - 1) === 47) {
          selfClosing = true;
        }
        break;
      }
    }
    if (selfClosing) {
      continue;
    }

    depth += 1;
    if (depth > maxDepth) {
      return true;
    }
  }
  return false;
}

export async function extractReadableContent(params: {
  html: string;
  url: string;
  extractMode: ExtractMode;
}): Promise<{ text: string; title?: string } | null> {
  // Shrink before size/nesting checks so data-URI funnels stay parseable.
  const html = shrinkEmbeddedMedia(params.html);
  const fallback = (): { text: string; title?: string } => {
    const rendered = htmlToMarkdown(html);
    if (params.extractMode === "text") {
      const text = markdownToText(rendered.text) || normalizeWhitespace(stripTags(html));
      return { text, title: rendered.title };
    }
    return rendered;
  };
  if (
    html.length > READABILITY_MAX_HTML_CHARS ||
    exceedsEstimatedHtmlNestingDepth(html, READABILITY_MAX_ESTIMATED_NESTING_DEPTH)
  ) {
    return fallback();
  }
  try {
    const { Readability, parseHTML } = await loadReadabilityDeps();
    const { document } = parseHTML(html);
    try {
      (document as { baseURI?: string }).baseURI = params.url;
    } catch {
      // Best-effort base URI for relative links.
    }
    const reader = new Readability(document, { charThreshold: 0 });
    const parsed = reader.parse();
    if (!parsed?.content) {
      return fallback();
    }
    const title = parsed.title || undefined;
    if (params.extractMode === "text") {
      // Prefer markdown path so embedded images survive as [image: …] markers.
      const rendered = htmlToMarkdown(parsed.content);
      const text = markdownToText(rendered.text);
      return text ? { text, title: title ?? rendered.title } : fallback();
    }
    const rendered = htmlToMarkdown(parsed.content);
    return { text: rendered.text, title: title ?? rendered.title };
  } catch {
    return fallback();
  }
}
