import { Extension, Mark, mergeAttributes, Node } from '@tiptap/core'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import {
  decodeDocBackgroundAttr,
  docBlockBackgroundCss,
  docHighlightColorCss,
  encodeDocBackgroundAttr,
} from '@/components/ui/forms/doc-background-value'
import { isDocSurfaceKey } from '@/components/ui/forms/rich-text-palettes'

export type { DocSurfaceKey } from '@/components/ui/forms/rich-text-palettes'
export {
  DOC_SURFACE_PRESETS,
  DOC_TEXT_COLORS,
  DOC_SURFACE_KEYS,
} from '@/components/ui/forms/rich-text-palettes'

export const DocTextStyleClipFill = Extension.create({
  name: 'docTextStyleClipFill',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          clipTextFill: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              const a = element.getAttribute('data-clip-text')
              if (a) return decodeDocBackgroundAttr(a)
              return null
            },
            renderHTML: (attributes: Record<string, unknown>) => {
              const v = attributes.clipTextFill as string | null
              if (!v || !v.startsWith('linear-gradient')) return {}
              return {
                'data-clip-text': encodeDocBackgroundAttr(v),
                style:
                  'background-image: ' +
                  v +
                  '; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;',
              }
            },
          },
        },
      },
    ]
  },
})

export const DocHighlight = Highlight.extend({
  addOptions() {
    return { ...this.parent?.(), multicolor: true, HTMLAttributes: {} }
  },
  addAttributes() {
    if (!this.options.multicolor) {
      return {}
    }
    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const a = element.getAttribute('data-color')
          if (a) {
            try {
              return decodeURIComponent(a)
            } catch {
              return a
            }
          }
          return element.style.background || element.style.backgroundColor || null
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const c = attributes.color as string | null
          if (!c) return {}
          const css = docHighlightColorCss(c)
          return {
            'data-color': encodeDocBackgroundAttr(c),
            style: `background: ${css}; color: inherit`,
          }
        },
      },
    }
  },
})

export const DocBanner = Node.create({
  name: 'docBanner',
  content: 'block+',
  group: 'block',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      docBackground: {
        default: 'blue',
        parseHTML: (element: HTMLElement) => {
          const d = element.getAttribute('data-doc-bg')
          if (d) return decodeDocBackgroundAttr(d)
          const s = element.getAttribute('data-surface')
          if (s) return s
          return 'blue'
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-doc-banner]',
        getAttrs: (element: HTMLElement) => {
          const d = element.getAttribute('data-doc-bg')
          if (d) {
            return { docBackground: decodeDocBackgroundAttr(d) }
          }
          const s = element.getAttribute('data-surface')
          if (s) return { docBackground: s }
          return { docBackground: 'blue' }
        },
      },
    ]
  },

  renderHTML({
    HTMLAttributes,
    node,
  }: {
    HTMLAttributes: Record<string, unknown>
    node: { attrs: { docBackground?: string } }
  }) {
    const bg = (node.attrs.docBackground ?? 'blue') as string
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-doc-banner': '',
        'data-doc-bg': encodeDocBackgroundAttr(bg),
        style: `background: ${docBlockBackgroundCss(bg)}`,
      }),
      0,
    ]
  },
})

export const DocPullQuote = Node.create({
  name: 'docPullQuote',
  content: 'block+',
  group: 'block',
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-doc-pull-quote]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-doc-pull-quote': '' }), 0]
  },
})

export const DocBadge = Mark.create({
  name: 'docBadge',

  inclusive: false,

  addAttributes() {
    return {
      docBackground: {
        default: 'blue',
        parseHTML: (element: HTMLElement) => {
          const d = element.getAttribute('data-doc-bg')
          if (d) return decodeDocBackgroundAttr(d)
          const s = element.getAttribute('data-surface')
          if (s) return s
          return 'blue'
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-doc-badge]',
        getAttrs: (element: HTMLElement) => {
          const d = element.getAttribute('data-doc-bg')
          if (d) {
            return { docBackground: decodeDocBackgroundAttr(d) }
          }
          const s = element.getAttribute('data-surface')
          if (s) return { docBackground: s }
          return { docBackground: 'blue' }
        },
      },
    ]
  },

  renderHTML({
    mark,
    HTMLAttributes,
  }: {
    mark: { attrs: { docBackground?: string } }
    HTMLAttributes: Record<string, unknown>
  }) {
    const bg = (mark.attrs.docBackground ?? 'blue') as string
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-doc-badge': '',
        'data-doc-bg': encodeDocBackgroundAttr(bg),
        style: `background: ${docBlockBackgroundCss(bg)}`,
      }),
      0,
    ]
  },
})

const INDENT_STEP_PX = 24
const MAX_INDENT = 8

export const DocIndent = Extension.create({
  name: 'docIndent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element: HTMLElement) =>
              parseInt(element.getAttribute('data-indent') || '0', 10),
            renderHTML: (attributes: Record<string, unknown>) => {
              const level = attributes.indent as number
              if (!level) return {}
              return {
                'data-indent': String(level),
                style: `margin-left: ${level * INDENT_STEP_PX}px`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      increaseIndent:
        () =>
        ({ tr, state, dispatch }: { tr: any; state: any; dispatch: any }) => {
          const { from, to } = state.selection
          let changed = false
          state.doc.nodesBetween(from, to, (node: any, pos: number) => {
            if (node.type.name === 'paragraph' || node.type.name === 'heading') {
              const cur = (node.attrs.indent as number) || 0
              if (cur < MAX_INDENT) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: cur + 1 })
                changed = true
              }
            }
          })
          if (dispatch && changed) dispatch(tr)
          return changed
        },
      decreaseIndent:
        () =>
        ({ tr, state, dispatch }: { tr: any; state: any; dispatch: any }) => {
          const { from, to } = state.selection
          let changed = false
          state.doc.nodesBetween(from, to, (node: any, pos: number) => {
            if (node.type.name === 'paragraph' || node.type.name === 'heading') {
              const cur = (node.attrs.indent as number) || 0
              if (cur > 0) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: cur - 1 })
                changed = true
              }
            }
          })
          if (dispatch && changed) dispatch(tr)
          return changed
        },
    } as any
  },
})

export const docEditorColorAndSurfaces = [
  Color,
  DocTextStyleClipFill,
  DocHighlight,
  DocBanner,
  DocPullQuote,
  DocBadge,
  DocIndent,
] as const

export { isDocSurfaceKey }
