import sanitizeHtml from 'sanitize-html'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'span',
  'div',
]

const ALLOWED_ATTRS: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'target', 'rel'],
  span: [
    'class',
    'style',
    'title',
    'role',
    'data-id',
    'data-label',
    'data-type',
    'data-entity-kind',
    'data-entity-id',
    'data-entity-label',
    'data-status',
    'data-status-color',
    'data-status-label',
    'data-tooltip',
  ],
  div: ['class'],
  p: ['class'],
}

/**
 * Whitelist for inline `style` values. Tight regex on a small set of CSS color
 * value shapes — rgb/rgba (with optional alpha-slash), short/long hex, and
 * `linear-gradient(...)` — so the entity-chip status dot can carry its
 * `--dot-color` / `--dot-ring` colors through `sanitizeHtml` without opening
 * the door to arbitrary CSS injection.
 */
const COLOR_VALUE_RE = /^(?:rgba?\([\d\s,./]+\)|#[0-9a-fA-F]{3,8}|linear-gradient\([^;{}]*\))$/

const ALLOWED_STYLES: sanitizeHtml.IOptions['allowedStyles'] = {
  span: {
    '--dot-color': [COLOR_VALUE_RE],
    '--dot-ring': [COLOR_VALUE_RE],
    background: [COLOR_VALUE_RE],
  },
}

export function sanitizeCommentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedStyles: ALLOWED_STYLES,
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }, true),
    },
  })
}
