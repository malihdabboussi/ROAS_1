import { mergeAttributes, Node } from '@tiptap/core'

export type EntityChipKind =
  | 'task'
  | 'doc'
  | 'channel'
  | 'space'
  | 'mission'
  | 'person'
  | 'agent'
  | 'user'
  | 'conversation'

export interface EntityChipAttrs {
  kind: EntityChipKind | string
  entityId: string
  label: string
  /** For tasks: status option id (e.g. 'todo', 'in_progress', 'in_review', 'done'). */
  status?: string | null
  /** For tasks: status option color from the space schema (e.g. 'cyan', '#ff0', or gradient). */
  statusColor?: string | null
  /** For tasks: status option label from the schema (e.g. 'In Progress'). */
  statusLabel?: string | null
}

/**
 * Tailwind palette → rgb triplet for status dot inline styles. Mirrors `DOT_BG_BY_COLOR`
 * and `DOT_OUTLINE_BY_COLOR` in `OptionDot` so the entity-chip dot matches the list dot 1:1.
 */
const STATUS_DOT_RGB: Record<string, [number, number, number]> = {
  cyan: [34, 211, 238],
  amber: [251, 191, 36],
  violet: [167, 139, 250],
  emerald: [52, 211, 153],
  slate: [148, 163, 184],
  blue: [96, 165, 250],
  orange: [251, 146, 60],
  red: [248, 113, 113],
  pink: [244, 114, 182],
  rose: [251, 113, 133],
  fuchsia: [232, 121, 249],
  purple: [192, 132, 252],
  indigo: [129, 140, 248],
  sky: [56, 189, 248],
  teal: [45, 212, 191],
  green: [74, 222, 128],
  lime: [163, 230, 53],
  yellow: [250, 204, 21],
}

/**
 * Returns the inner-fill color and outer-ring color (0.6 alpha), matching `OptionDot`.
 * Uses legacy comma rgb()/rgba() syntax so the inline `style` survives `sanitizeHtml`
 * (server-side comment sanitizer's style parser is strictest about commas).
 */
function resolveStatusDotColors(
  color: string | null | undefined,
): { inner: string; ring: string } | null {
  if (!color) return null
  const trimmed = color.trim()
  if (!trimmed) return null
  const palette = STATUS_DOT_RGB[trimmed]
  if (palette) {
    const rgb = palette.join(', ')
    return { inner: `rgb(${rgb})`, ring: `rgba(${rgb}, 0.6)` }
  }
  if (trimmed.startsWith('#')) {
    return { inner: trimmed, ring: `${trimmed}99` }
  }
  if (trimmed.startsWith('linear-gradient')) {
    const fallbackHex = trimmed.match(/#[0-9A-Fa-f]{6}/)?.[0] ?? '#888888'
    return { inner: trimmed, ring: `${fallbackHex}99` }
  }
  return null
}

const MAX_DISPLAY_LABEL = 12
const MAX_DISPLAY_LABEL_TASK = 32

function shortLabel(label: string, max: number = MAX_DISPLAY_LABEL): string {
  const trimmed = label.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trimEnd()}...`
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    entityChip: {
      insertEntityChip: (attrs: EntityChipAttrs) => ReturnType
    }
  }
}

export const EntityChipNode = Node.create({
  name: 'entityChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      kind: {
        default: 'task',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-entity-kind'),
        renderHTML: (attrs: Record<string, unknown>) => ({
          'data-entity-kind': String(attrs.kind ?? ''),
        }),
      },
      entityId: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-entity-id'),
        renderHTML: (attrs: Record<string, unknown>) => ({
          'data-entity-id': String(attrs.entityId ?? ''),
        }),
      },
      label: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-entity-label') ?? '',
        renderHTML: (attrs: Record<string, unknown>) => ({
          'data-entity-label': String(attrs.label ?? ''),
        }),
      },
      status: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-status'),
        renderHTML: (attrs: Record<string, unknown>) => {
          const v = attrs.status
          if (!v) return {}
          return { 'data-status': String(v) }
        },
      },
      statusColor: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-status-color'),
        renderHTML: (attrs: Record<string, unknown>) => {
          const v = attrs.statusColor
          if (!v) return {}
          return { 'data-status-color': String(v) }
        },
      },
      statusLabel: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-status-label'),
        renderHTML: (attrs: Record<string, unknown>) => {
          const v = attrs.statusLabel
          if (!v) return {}
          return { 'data-status-label': String(v) }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span.entity-chip',
        getAttrs: (node) => {
          const el = node as HTMLElement
          const id = el.getAttribute('data-entity-id')
          if (!id) return false
          return null
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as Record<string, unknown>
    const label = String(attrs.label ?? '')
    const kind = String(attrs.kind ?? '')
    const statusColor = attrs.statusColor ? String(attrs.statusColor) : null
    if (kind === 'task') {
      const colors = resolveStatusDotColors(statusColor)
      const dotAttrs: Record<string, string> = { class: 'entity-chip-status-dot' }
      if (colors) {
        dotAttrs.style = `--dot-color:${colors.inner};--dot-ring:${colors.ring}`
      }
      // Note: `title` intentionally omitted so the slow native browser tooltip
      // doesn't compete with our CSS `::after` tooltip ("Open task" — applied
      // via globals.css for all task chips, regardless of saved `data-tooltip`).
      return [
        'span',
        mergeAttributes(HTMLAttributes, {
          class: 'entity-chip',
          'data-tooltip': 'Open task',
          'aria-label': 'Open task',
          role: 'button',
        }),
        ['span', dotAttrs, ['span', { class: 'entity-chip-status-dot-inner' }]],
        shortLabel(label, MAX_DISPLAY_LABEL_TASK),
      ]
    }
    if (kind === 'conversation') {
      return [
        'span',
        mergeAttributes(HTMLAttributes, {
          class: 'entity-chip',
          'data-tooltip': 'Open conversation',
          'aria-label': 'Open conversation',
          role: 'button',
        }),
        shortLabel(label),
      ]
    }
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'entity-chip',
        title: label,
        'data-tooltip': label,
      }),
      shortLabel(label),
    ]
  },

  renderText({ node }) {
    const attrs = node.attrs as Record<string, unknown>
    const label = String(attrs.label ?? '')
    const kind = String(attrs.kind ?? '')
    return shortLabel(label, kind === 'task' ? MAX_DISPLAY_LABEL_TASK : MAX_DISPLAY_LABEL)
  },

  addCommands() {
    return {
      insertEntityChip:
        (attrs: EntityChipAttrs) =>
        ({ chain }) =>
          chain()
            .insertContent([
              { type: this.name, attrs },
              { type: 'text', text: ' ' },
            ])
            .run(),
    }
  },
})
