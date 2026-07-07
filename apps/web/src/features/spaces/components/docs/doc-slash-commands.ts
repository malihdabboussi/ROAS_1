import type { Range } from '@tiptap/core'
import type { Editor } from '@tiptap/react'
import type { LucideIcon } from 'lucide-react'
import {
  Bold,
  ChevronsDownUp,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  PanelTop,
  Quote,
  RemoveFormatting,
  Strikethrough,
  Table as TableIcon,
  Type,
  Underline,
} from 'lucide-react'
import { applyDocTextStyle, type TextStyleId } from '@/components/ui/forms/rich-text-toolbar'
import { requestDocImageInsert } from './doc-image-insert-bridge'

export type DocSlashSection = 'text' | 'formatting'

export interface DocSlashItem {
  id: string
  label: string
  section: DocSlashSection
  keywords: string[]
  icon: LucideIcon
  run: (editor: Editor, range: Range) => void
}

function runBlockStyle(styleId: TextStyleId) {
  return (editor: Editor, range: Range) => {
    editor.chain().focus().deleteRange(range).run()
    const cur = editor.getAttributes('textStyle') as Record<string, unknown>
    const noFont = { ...cur, fontSize: null }
    applyDocTextStyle(editor, styleId, noFont, true)
  }
}

const TEXT_ITEMS: DocSlashItem[] = [
  {
    id: 'paragraph',
    label: 'Normal text',
    section: 'text',
    keywords: ['text', 'paragraph', 'plain'],
    icon: Type,
    run: runBlockStyle('paragraph'),
  },
  {
    id: 'heading1',
    label: 'Heading 1',
    section: 'text',
    keywords: ['h1', 'title'],
    icon: Heading1,
    run: runBlockStyle('heading1'),
  },
  {
    id: 'heading2',
    label: 'Heading 2',
    section: 'text',
    keywords: ['h2', 'subtitle'],
    icon: Heading2,
    run: runBlockStyle('heading2'),
  },
  {
    id: 'heading3',
    label: 'Heading 3',
    section: 'text',
    keywords: ['h3'],
    icon: Heading3,
    run: runBlockStyle('heading3'),
  },
  {
    id: 'heading4',
    label: 'Heading 4',
    section: 'text',
    keywords: ['h4'],
    icon: Heading4,
    run: runBlockStyle('heading4'),
  },
  {
    id: 'taskList',
    label: 'Checklist',
    section: 'text',
    keywords: ['todo', 'checkbox', 'task', 'check'],
    icon: ListChecks,
    run: runBlockStyle('taskList'),
  },
  {
    id: 'bulletList',
    label: 'Bulleted list',
    section: 'text',
    keywords: ['bullet', 'unordered', 'ul'],
    icon: List,
    run: runBlockStyle('bulletList'),
  },
  {
    id: 'orderedList',
    label: 'Numbered list',
    section: 'text',
    keywords: ['numbered', 'ordered', 'ol', '1'],
    icon: ListOrdered,
    run: runBlockStyle('orderedList'),
  },
  {
    id: 'toggleList',
    label: 'Toggle list',
    section: 'text',
    keywords: ['toggle', 'collapse', 'details', 'accordion'],
    icon: ChevronsDownUp,
    run: runBlockStyle('toggleList'),
  },
  {
    id: 'docBanner',
    label: 'Banners',
    section: 'text',
    keywords: ['banner', 'callout', 'info', 'alert'],
    icon: PanelTop,
    run: runBlockStyle('docBanner'),
  },
  {
    id: 'codeBlock',
    label: 'Code block',
    section: 'text',
    keywords: ['code', 'pre', 'snippet'],
    icon: Code2,
    run: runBlockStyle('codeBlock'),
  },
  {
    id: 'blockquote',
    label: 'Block quote',
    section: 'text',
    keywords: ['quote', 'blockquote', 'cite'],
    icon: Quote,
    run: runBlockStyle('blockquote'),
  },
  {
    id: 'docPullQuote',
    label: 'Pull quote',
    section: 'text',
    keywords: ['pull', 'quote', 'pullquote', 'featured'],
    icon: Quote,
    run: runBlockStyle('docPullQuote'),
  },
  {
    id: 'table',
    label: 'Table',
    section: 'text',
    keywords: ['table', 'grid', 'rows', 'columns'],
    icon: TableIcon,
    run: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run()
    },
  },
  {
    id: 'image',
    label: 'Image',
    section: 'text',
    keywords: ['image', 'photo', 'picture', 'media'],
    icon: ImageIcon,
    run: (editor, range) => {
      requestDocImageInsert({
        slashRange: { from: range.from, to: range.to },
        getAnchorRect: () => {
          const coords = editor.view.coordsAtPos(range.from)
          return new DOMRect(coords.left, coords.top, 0, Math.max(coords.bottom - coords.top, 1))
        },
      })
    },
  },
  {
    id: 'divider',
    label: 'Divider',
    section: 'text',
    keywords: ['divider', 'line', 'rule', 'separator', 'hr'],
    icon: Minus,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
  },
]

const FORMATTING_ITEMS: DocSlashItem[] = [
  {
    id: 'bold',
    label: 'Bold',
    section: 'formatting',
    keywords: ['strong', 'b'],
    icon: Bold,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBold().run()
    },
  },
  {
    id: 'italic',
    label: 'Italic',
    section: 'formatting',
    keywords: ['em', 'i'],
    icon: Italic,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleItalic().run()
    },
  },
  {
    id: 'underline',
    label: 'Underline',
    section: 'formatting',
    keywords: ['u'],
    icon: Underline,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleUnderline().run()
    },
  },
  {
    id: 'strikethrough',
    label: 'Strikethrough',
    section: 'formatting',
    keywords: ['strike', 's', 'del'],
    icon: Strikethrough,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleStrike().run()
    },
  },
  {
    id: 'inlineCode',
    label: 'Inline code',
    section: 'formatting',
    keywords: ['code', 'mono', 'inline'],
    icon: Code2,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCode().run()
    },
  },
  {
    id: 'clearFormat',
    label: 'Clear format',
    section: 'formatting',
    keywords: ['remove', 'clear', 'reset', 'plain'],
    icon: RemoveFormatting,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).unsetAllMarks().run()
    },
  },
  {
    id: 'link',
    label: 'Website Link',
    section: 'formatting',
    keywords: ['url', 'href', 'link', 'website'],
    icon: Link2,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run()
      const url = window.prompt('Enter URL')
      if (url) {
        const href = url.startsWith('http') ? url : `https://${url}`
        editor.chain().focus().setLink({ href }).run()
      }
    },
  },
]

export const DOC_SLASH_ITEMS: DocSlashItem[] = [...TEXT_ITEMS, ...FORMATTING_ITEMS]

export const DOC_SLASH_SECTION_ORDER: DocSlashSection[] = ['text', 'formatting']

export const DOC_SLASH_SECTION_LABELS: Record<DocSlashSection, string> = {
  text: 'TEXT',
  formatting: 'FORMATTING',
}

export function filterSlashItems(items: DocSlashItem[], query: string): DocSlashItem[] {
  if (!query) return items
  const q = query.toLowerCase()
  return items.filter(
    (item) => item.label.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q)),
  )
}
