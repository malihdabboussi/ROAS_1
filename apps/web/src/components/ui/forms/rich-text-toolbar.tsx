'use client'

import type { MouseEventHandler } from 'react'
/**
 * RichTextToolbar
 * Shared toolbar component for TipTap rich text editors
 *
 * Features:
 * - Text style dropdown (Paragraph, H1-H3, Quote, Code Block)
 * - Font size dropdown (px)
 * - Bold, Italic, Underline, Strikethrough formatting
 * - List buttons (Bullet, Numbered)
 * - Text alignment dropdown (left / center / right + list indent)
 * - Link insertion with inline input
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
// ============================================================================
// CUSTOM FONT SIZE EXTENSION
// ============================================================================

import { TextStyle } from '@tiptap/extension-text-style'
import type { Editor } from '@tiptap/react'
import clsx from 'clsx'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Badge,
  Bold,
  Bookmark,
  BookmarkPlus,
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  Code2,
  Droplets,
  FolderOpen,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Palette,
  PanelTop,
  Plus,
  Quote,
  Strikethrough,
  Type,
  Underline as UnderlineIcon,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'
import { ColorPickerPanelStandalone } from '@/components/ui/ColorPicker'
import {
  applyDocBadgeBackground,
  applyDocBannerBackground,
  applyDocHighlightColor,
  applyDocTextPaint,
  initialPanelValueForDocBadge,
  initialPanelValueForDocBanner,
  initialPanelValueForDocHighlight,
  initialPanelValueForDocTextColor,
} from '@/components/ui/forms/doc-apply-tiptap-colors'
import {
  ColorPickerPopover,
  glassSwatchStyle,
  MAX_CUSTOM_TAG_SWATCHES,
  positionTagFullPickerNextToPresets,
  PRESET_HEX,
  shouldSaveAsNewCustom,
  TAG_COLORS,
  TagSwatchButton,
} from '@/features/spaces/components/cells/field-color-presets-popover'

// ============================================================================
// TYPES
// ============================================================================

export type TextStyleId =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'blockquote'
  | 'codeBlock'
  | 'taskList'
  | 'bulletList'
  | 'orderedList'
  | 'toggleList'
  | 'docBanner'
  | 'docPullQuote'

export interface TextStyleOption {
  id: TextStyleId
  label: string
  className: string
  /** Shown in the doc block-style (ClickUp-style) menu when `docTextStyleMenu` is on. */
  icon?: LucideIcon
}

export interface RichTextMergeFieldOption {
  id: string
  label: string
  valuePreview: string
  token: string
}

export interface RichTextToolbarProps {
  editor: Editor | null
  showTextStyles?: boolean
  showFontSize?: boolean
  showFormatting?: boolean
  showLists?: boolean
  showAlignment?: boolean
  showLink?: boolean
  showImage?: boolean
  onImageUpload?: (file: File) => void
  onOpenMediaLibrary?: () => void
  includeCodeBlock?: boolean
  /** Text (foreground) color swatches (requires TipTap `Color` + `TextStyle`). */
  showTextColor?: boolean
  /** Banner block, badge mark, and highlight mark with shared color presets. */
  showDocSurfaces?: boolean
  /** Quick blockquote and code block (pair with `includeCodeBlock` for code). */
  showQuoteCodeBlocks?: boolean
  /**
   * Full block-type menu (normal, H1–H4, checklist, lists, toggle, banner, code, block/pull quote).
   * Requires matching TipTap extensions in the editor (e.g. docs `DocEditorPanel`).
   */
  docTextStyleMenu?: boolean
  /** When 'nowrap', main toolbar row stays horizontal (e.g. floating bubble near viewport edge). */
  toolbarLayout?: 'wrap' | 'nowrap'
  className?: string
  /** Contact / merge tokens: insert left of the link control. */
  mergeFields?: RichTextMergeFieldOption[]
}

const DOC_COLORS_GROUPED_GRID_PRESETS = TAG_COLORS.slice(0, 11)

// ============================================================================
// TEXT STYLE OPTIONS
// ============================================================================

const TEXT_STYLES: TextStyleOption[] = [
  { id: 'paragraph', label: 'Paragraph', className: 'body-3' },
  { id: 'heading1', label: 'Heading 1', className: 'text-lg font-bold' },
  { id: 'heading2', label: 'Heading 2', className: 'text-base font-semibold' },
  { id: 'heading3', label: 'Heading 3', className: 'text-sm font-medium' },
  { id: 'blockquote', label: 'Quote', className: 'text-sm italic text-muted-foreground' },
  { id: 'codeBlock', label: 'Code Block', className: 'font-mono text-xs' },
]

/** Turn into — structure only; lists use the Lists dropdown (ClickUp-style). */
const DOC_TURN_INTO_LEFT_IDS: TextStyleId[] = [
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  'heading4',
]
/** Block row after divider (Banners lives as nested submenu, not here). */
const DOC_TURN_INTO_RIGHT_IDS: TextStyleId[] = ['codeBlock']

const DOC_LIST_STYLE_IDS: TextStyleId[] = ['bulletList', 'orderedList', 'toggleList', 'taskList']

const DOC_QUOTE_STYLE_IDS: TextStyleId[] = ['blockquote', 'docPullQuote']

const DOC_TEXT_STYLE_ALL: TextStyleOption[] = [
  { id: 'paragraph', label: 'Normal text', className: 'body-3', icon: Type },
  { id: 'heading1', label: 'Heading 1', className: 'text-lg font-bold', icon: Heading1 },
  { id: 'heading2', label: 'Heading 2', className: 'text-base font-semibold', icon: Heading2 },
  { id: 'heading3', label: 'Heading 3', className: 'text-sm font-medium', icon: Heading3 },
  { id: 'heading4', label: 'Heading 4', className: 'text-sm font-semibold', icon: Heading4 },
  { id: 'taskList', label: 'Checklist', className: 'text-sm', icon: ListChecks },
  { id: 'bulletList', label: 'Bulleted list', className: 'text-sm', icon: List },
  { id: 'orderedList', label: 'Numbered list', className: 'text-sm', icon: ListOrdered },
  { id: 'toggleList', label: 'Toggle list', className: 'text-sm', icon: ChevronsDownUp },
  { id: 'docBanner', label: 'Banners', className: 'text-sm', icon: Bookmark },
  { id: 'codeBlock', label: 'Code block', className: 'font-mono text-xs', icon: Code2 },
  {
    id: 'blockquote',
    label: 'Block quote',
    className: 'text-sm italic text-muted-foreground',
    icon: Quote,
  },
  {
    id: 'docPullQuote',
    label: 'Pull quote',
    className: 'text-sm italic text-muted-foreground',
    icon: Quote,
  },
]

const DOC_TEXT_BY_ID: Map<TextStyleId, TextStyleOption> = new Map(
  DOC_TEXT_STYLE_ALL.map((o) => [o.id, o]),
)

/** Avoid getNodeType throws when TaskList/TaskItem extensions are not registered on the editor. */
function editorHasTaskItems(editor: Editor): boolean {
  return Boolean(editor.schema.nodes.taskItem)
}

export function liftOutOfListItems(editor: Editor) {
  for (let i = 0; i < 64; i += 1) {
    if (editor.isActive('listItem') && editor.can().liftListItem('listItem')) {
      editor.chain().focus().liftListItem('listItem').run()
      continue
    }
    if (
      editorHasTaskItems(editor) &&
      editor.isActive('taskItem') &&
      editor.can().liftListItem('taskItem')
    ) {
      editor.chain().focus().liftListItem('taskItem').run()
      continue
    }
    break
  }
}

function getDocTextStyleOption(editor: Editor, includeCodeBlock: boolean): TextStyleOption {
  const fallback = DOC_TEXT_BY_ID.get('paragraph')!
  if (editor.isActive('codeBlock') && includeCodeBlock)
    return DOC_TEXT_BY_ID.get('codeBlock') ?? fallback
  if (editor.isActive('codeBlock') && !includeCodeBlock) return fallback
  if (editor.isActive('heading', { level: 1 })) return DOC_TEXT_BY_ID.get('heading1') ?? fallback
  if (editor.isActive('heading', { level: 2 })) return DOC_TEXT_BY_ID.get('heading2') ?? fallback
  if (editor.isActive('heading', { level: 3 })) return DOC_TEXT_BY_ID.get('heading3') ?? fallback
  if (editor.isActive('heading', { level: 4 })) return DOC_TEXT_BY_ID.get('heading4') ?? fallback
  if (editor.isActive('taskList')) return DOC_TEXT_BY_ID.get('taskList') ?? fallback
  if (editor.isActive('bulletList')) return DOC_TEXT_BY_ID.get('bulletList') ?? fallback
  if (editor.isActive('orderedList')) return DOC_TEXT_BY_ID.get('orderedList') ?? fallback
  if (editor.isActive('blockquote')) return DOC_TEXT_BY_ID.get('blockquote') ?? fallback
  if (editor.isActive('details')) return DOC_TEXT_BY_ID.get('toggleList') ?? fallback
  if (editor.isActive('docPullQuote')) return DOC_TEXT_BY_ID.get('docPullQuote') ?? fallback
  if (editor.isActive('docBanner')) return DOC_TEXT_BY_ID.get('docBanner') ?? fallback
  return fallback
}

export function applyDocTextStyle(
  editor: Editor,
  styleId: TextStyleId,
  noFont: Record<string, unknown>,
  includeCodeBlock: boolean,
) {
  if (styleId === 'codeBlock' && !includeCodeBlock) return
  const BAN = { docBackground: 'blue' } as { docBackground: string }
  switch (styleId) {
    case 'paragraph': {
      liftOutOfListItems(editor)
      if (editor.isActive('codeBlock')) editor.chain().focus().toggleCodeBlock().run()
      if (editor.isActive('blockquote')) editor.chain().focus().toggleBlockquote().run()
      if (editor.isActive('details')) editor.chain().focus().unsetDetails().run()
      if (editor.isActive('docBanner')) editor.chain().focus().toggleWrap('docBanner', BAN).run()
      if (editor.isActive('docPullQuote')) editor.chain().focus().toggleWrap('docPullQuote').run()
      editor
        .chain()
        .focus()
        .setParagraph()
        .setMark('textStyle', noFont)
        .removeEmptyTextStyle()
        .run()
      return
    }
    case 'heading1':
    case 'heading2':
    case 'heading3':
    case 'heading4': {
      const level =
        styleId === 'heading1' ? 1 : styleId === 'heading2' ? 2 : styleId === 'heading3' ? 3 : 4
      liftOutOfListItems(editor)
      if (editor.isActive('codeBlock')) editor.chain().focus().toggleCodeBlock().run()
      if (editor.isActive('blockquote')) editor.chain().focus().toggleBlockquote().run()
      if (editor.isActive('docPullQuote')) editor.chain().focus().toggleWrap('docPullQuote').run()
      editor
        .chain()
        .focus()
        .toggleHeading({ level: level as 1 | 2 | 3 | 4 })
        .setMark('textStyle', noFont)
        .removeEmptyTextStyle()
        .run()
      return
    }
    case 'taskList': {
      if (editor.isActive('taskList')) {
        editor.chain().focus().setMark('textStyle', noFont).removeEmptyTextStyle().run()
        return
      }
      liftOutOfListItems(editor)
      if (editor.isActive('codeBlock')) editor.chain().focus().toggleCodeBlock().run()
      if (editor.isActive('blockquote')) editor.chain().focus().toggleBlockquote().run()
      if (editor.isActive('details')) editor.chain().focus().unsetDetails().run()
      if (editor.isActive('docBanner')) editor.chain().focus().toggleWrap('docBanner', BAN).run()
      if (editor.isActive('docPullQuote')) editor.chain().focus().toggleWrap('docPullQuote').run()
      if (editor.isActive('orderedList')) editor.chain().focus().toggleOrderedList().run()
      if (editor.isActive('bulletList')) editor.chain().focus().toggleBulletList().run()
      editor
        .chain()
        .focus()
        .toggleTaskList()
        .setMark('textStyle', noFont)
        .removeEmptyTextStyle()
        .run()
      return
    }
    case 'bulletList': {
      if (editor.isActive('bulletList') && !editor.isActive('taskList')) {
        editor.chain().focus().setMark('textStyle', noFont).removeEmptyTextStyle().run()
        return
      }
      if (editor.isActive('taskList')) editor.chain().focus().toggleTaskList().run()
      if (editor.isActive('orderedList')) editor.chain().focus().toggleOrderedList().run()
      if (editor.isActive('codeBlock')) editor.chain().focus().toggleCodeBlock().run()
      if (editor.isActive('details')) editor.chain().focus().unsetDetails().run()
      if (editor.isActive('docPullQuote')) editor.chain().focus().toggleWrap('docPullQuote').run()
      if (editor.isActive('docBanner')) editor.chain().focus().toggleWrap('docBanner', BAN).run()
      editor
        .chain()
        .focus()
        .toggleBulletList()
        .setMark('textStyle', noFont)
        .removeEmptyTextStyle()
        .run()
      return
    }
    case 'orderedList': {
      if (editor.isActive('orderedList')) {
        editor.chain().focus().setMark('textStyle', noFont).removeEmptyTextStyle().run()
        return
      }
      if (editor.isActive('taskList')) editor.chain().focus().toggleTaskList().run()
      if (editor.isActive('bulletList')) editor.chain().focus().toggleBulletList().run()
      if (editor.isActive('codeBlock')) editor.chain().focus().toggleCodeBlock().run()
      if (editor.isActive('details')) editor.chain().focus().unsetDetails().run()
      if (editor.isActive('docPullQuote')) editor.chain().focus().toggleWrap('docPullQuote').run()
      if (editor.isActive('docBanner')) editor.chain().focus().toggleWrap('docBanner', BAN).run()
      editor
        .chain()
        .focus()
        .toggleOrderedList()
        .setMark('textStyle', noFont)
        .removeEmptyTextStyle()
        .run()
      return
    }
    case 'toggleList': {
      if (editor.isActive('details')) {
        editor.chain().focus().setMark('textStyle', noFont).removeEmptyTextStyle().run()
        return
      }
      if (editor.isActive('codeBlock')) editor.chain().focus().toggleCodeBlock().run()
      if (editor.isActive('blockquote')) editor.chain().focus().toggleBlockquote().run()
      if (editor.isActive('docPullQuote')) editor.chain().focus().toggleWrap('docPullQuote').run()
      if (editor.isActive('docBanner')) editor.chain().focus().toggleWrap('docBanner', BAN).run()
      if (editor.isActive('taskList')) editor.chain().focus().toggleTaskList().run()
      if (editor.isActive('bulletList')) editor.chain().focus().toggleBulletList().run()
      if (editor.isActive('orderedList')) editor.chain().focus().toggleOrderedList().run()
      liftOutOfListItems(editor)
      editor.chain().focus().setDetails().setMark('textStyle', noFont).removeEmptyTextStyle().run()
      return
    }
    case 'docBanner': {
      if (editor.isActive('docBanner')) {
        editor.chain().focus().setMark('textStyle', noFont).removeEmptyTextStyle().run()
        return
      }
      liftOutOfListItems(editor)
      if (editor.isActive('codeBlock')) editor.chain().focus().toggleCodeBlock().run()
      if (editor.isActive('details')) editor.chain().focus().unsetDetails().run()
      if (editor.isActive('blockquote')) editor.chain().focus().toggleBlockquote().run()
      if (editor.isActive('docPullQuote')) editor.chain().focus().toggleWrap('docPullQuote').run()
      if (editor.isActive('taskList')) editor.chain().focus().toggleTaskList().run()
      if (editor.isActive('bulletList')) editor.chain().focus().toggleBulletList().run()
      if (editor.isActive('orderedList')) editor.chain().focus().toggleOrderedList().run()
      editor
        .chain()
        .focus()
        .toggleWrap('docBanner', BAN)
        .setMark('textStyle', noFont)
        .removeEmptyTextStyle()
        .run()
      return
    }
    case 'docPullQuote': {
      if (editor.isActive('docPullQuote')) {
        editor.chain().focus().setMark('textStyle', noFont).removeEmptyTextStyle().run()
        return
      }
      liftOutOfListItems(editor)
      if (editor.isActive('codeBlock')) editor.chain().focus().toggleCodeBlock().run()
      if (editor.isActive('details')) editor.chain().focus().unsetDetails().run()
      if (editor.isActive('blockquote')) editor.chain().focus().toggleBlockquote().run()
      if (editor.isActive('docBanner')) editor.chain().focus().toggleWrap('docBanner', BAN).run()
      if (editor.isActive('taskList')) editor.chain().focus().toggleTaskList().run()
      if (editor.isActive('bulletList')) editor.chain().focus().toggleBulletList().run()
      if (editor.isActive('orderedList')) editor.chain().focus().toggleOrderedList().run()
      editor
        .chain()
        .focus()
        .toggleWrap('docPullQuote')
        .setMark('textStyle', noFont)
        .removeEmptyTextStyle()
        .run()
      return
    }
    case 'blockquote': {
      if (editor.isActive('blockquote')) {
        editor.chain().focus().setMark('textStyle', noFont).removeEmptyTextStyle().run()
        return
      }
      liftOutOfListItems(editor)
      if (editor.isActive('codeBlock')) editor.chain().focus().toggleCodeBlock().run()
      if (editor.isActive('details')) editor.chain().focus().unsetDetails().run()
      if (editor.isActive('docPullQuote')) editor.chain().focus().toggleWrap('docPullQuote').run()
      if (editor.isActive('docBanner')) editor.chain().focus().toggleWrap('docBanner', BAN).run()
      if (editor.isActive('taskList')) editor.chain().focus().toggleTaskList().run()
      if (editor.isActive('bulletList')) editor.chain().focus().toggleBulletList().run()
      if (editor.isActive('orderedList')) editor.chain().focus().toggleOrderedList().run()
      editor
        .chain()
        .focus()
        .toggleBlockquote()
        .setMark('textStyle', noFont)
        .removeEmptyTextStyle()
        .run()
      return
    }
    case 'codeBlock': {
      if (!includeCodeBlock) return
      if (editor.isActive('codeBlock')) {
        editor.chain().focus().setMark('textStyle', noFont).removeEmptyTextStyle().run()
        return
      }
      liftOutOfListItems(editor)
      if (editor.isActive('details')) editor.chain().focus().unsetDetails().run()
      if (editor.isActive('docPullQuote')) editor.chain().focus().toggleWrap('docPullQuote').run()
      if (editor.isActive('docBanner')) editor.chain().focus().toggleWrap('docBanner', BAN).run()
      if (editor.isActive('taskList')) editor.chain().focus().toggleTaskList().run()
      if (editor.isActive('bulletList')) editor.chain().focus().toggleBulletList().run()
      if (editor.isActive('orderedList')) editor.chain().focus().toggleOrderedList().run()
      editor
        .chain()
        .focus()
        .toggleCodeBlock()
        .setMark('textStyle', noFont)
        .removeEmptyTextStyle()
        .run()
      return
    }
    default:
      return
  }
}

function getToolbarTextAlign(editor: Editor): 'left' | 'center' | 'right' {
  if (editor.isActive({ textAlign: 'center' })) return 'center'
  if (editor.isActive({ textAlign: 'right' })) return 'right'
  return 'left'
}

function alignmentShortcutHint(which: 'left' | 'center' | 'right'): string {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform)) {
    return which === 'left' ? '⌘⇧L' : which === 'center' ? '⌘⇧E' : '⌘⇧R'
  }
  return which === 'left' ? 'Ctrl+Shift+L' : which === 'center' ? 'Ctrl+Shift+E' : 'Ctrl+Shift+R'
}

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72]

const RICH_TEXT_DOC_SWATCHES_KEY = 'vibey.richTextDocColorSwatches'

// ============================================================================
// TOOLBAR BUTTON
// ============================================================================

interface ToolbarButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        'box-border flex h-8 w-8 shrink-0 items-center justify-center rounded border border-transparent p-0 transition-[color,background-color,box-shadow,border-color]',
        isActive
          ? 'chip-glass-blue'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {children}
    </button>
  )
}

// ============================================================================
// DIVIDER
// ============================================================================

function ToolbarDivider() {
  return <div className="bg-border mx-0.5 h-5 w-px" />
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RichTextToolbar({
  editor,
  showTextStyles = true,
  showFontSize = false,
  showFormatting = true,
  showLists = false,
  showAlignment = false,
  showLink = true,
  showImage = false,
  onImageUpload,
  onOpenMediaLibrary,
  includeCodeBlock = false,
  showTextColor = false,
  showDocSurfaces = false,
  showQuoteCodeBlocks = false,
  docTextStyleMenu = false,
  toolbarLayout = 'wrap',
  className,
  mergeFields,
}: RichTextToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkEditDialog, setShowLinkEditDialog] = useState(false)
  const [isTextStyleDropdownOpen, setIsTextStyleDropdownOpen] = useState(false)
  const [isFontSizeDropdownOpen, setIsFontSizeDropdownOpen] = useState(false)
  const [docColorMenu, setDocColorMenu] = useState<null | {
    kind: 'textColor' | 'banner' | 'badge' | 'highlight'
    top: number
    left: number
    /** Open full panel without showing floating preset popover (grouped Colors + button). */
    skipPresetPopover?: boolean
  }>(null)
  const [isListsDropdownOpen, setIsListsDropdownOpen] = useState(false)
  const [isColorsGroupedOpen, setIsColorsGroupedOpen] = useState(false)
  /** Banner color flyout inside Turn into (not toolbar dock). */
  const [isBannerPaintSubmenuOpen, setIsBannerPaintSubmenuOpen] = useState(false)
  /** Block / pull quote flyout inside Turn into (not toolbar dock). */
  const [isQuoteSubmenuOpen, setIsQuoteSubmenuOpen] = useState(false)
  const [docTagPanelPos, setDocTagPanelPos] = useState<{ top: number; left: number } | null>(null)
  const [docTagPanelValue, setDocTagPanelValue] = useState('#6366f1')
  const docTagPanelValueRef = useRef(docTagPanelValue)
  docTagPanelValueRef.current = docTagPanelValue
  const [docCustomSwatches, setDocCustomSwatches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(RICH_TEXT_DOC_SWATCHES_KEY)
      if (!raw) return []
      const p = JSON.parse(raw) as unknown
      if (!Array.isArray(p)) return []
      return p.filter(
        (x): x is string =>
          typeof x === 'string' && (x.startsWith('#') || x.startsWith('linear-gradient')),
      )
    } catch {
      return []
    }
  })
  const openDocFullPanelPendingCommitRef = useRef(false)
  const [isAlignmentDropdownOpen, setIsAlignmentDropdownOpen] = useState(false)
  const [isMergeFieldsOpen, setIsMergeFieldsOpen] = useState(false)
  const textStyleDropdownRef = useRef<HTMLDivElement>(null)
  const listsDropdownRef = useRef<HTMLDivElement>(null)
  const colorsGroupedDropdownRef = useRef<HTMLDivElement>(null)
  const fontSizeDropdownRef = useRef<HTMLDivElement>(null)
  const alignmentDropdownRef = useRef<HTMLDivElement>(null)
  const mergeFieldsDropdownRef = useRef<HTMLDivElement>(null)
  const docColorPresetPopoverRef = useRef<HTMLDivElement | null>(null)
  const docColorFullPanelRef = useRef<HTMLDivElement | null>(null)

  // Force re-render on editor transactions (for formatting state)
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    if (!editor) return
    const handler = () => forceUpdate()
    editor.on('transaction', handler)
    return () => {
      editor.off('transaction', handler)
    }
  }, [editor])

  useEffect(() => {
    if (!isTextStyleDropdownOpen) {
      setIsBannerPaintSubmenuOpen(false)
      setIsQuoteSubmenuOpen(false)
    }
  }, [isTextStyleDropdownOpen])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (textStyleDropdownRef.current && !textStyleDropdownRef.current.contains(t)) {
        if (!docColorFullPanelRef.current?.contains(t)) {
          setIsTextStyleDropdownOpen(false)
        }
      }
      if (listsDropdownRef.current && !listsDropdownRef.current.contains(e.target as Node)) {
        setIsListsDropdownOpen(false)
      }
      if (
        colorsGroupedDropdownRef.current &&
        !colorsGroupedDropdownRef.current.contains(e.target as Node)
      ) {
        if (!docColorFullPanelRef.current?.contains(e.target as Node)) {
          setIsColorsGroupedOpen(false)
        }
      }
      if (fontSizeDropdownRef.current && !fontSizeDropdownRef.current.contains(e.target as Node)) {
        setIsFontSizeDropdownOpen(false)
      }
      if (
        alignmentDropdownRef.current &&
        !alignmentDropdownRef.current.contains(e.target as Node)
      ) {
        setIsAlignmentDropdownOpen(false)
      }
      if (
        mergeFieldsDropdownRef.current &&
        !mergeFieldsDropdownRef.current.contains(e.target as Node)
      ) {
        setIsMergeFieldsOpen(false)
      }
    }
    if (
      isTextStyleDropdownOpen ||
      isListsDropdownOpen ||
      isColorsGroupedOpen ||
      isFontSizeDropdownOpen ||
      isAlignmentDropdownOpen ||
      isMergeFieldsOpen
    ) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [
    isTextStyleDropdownOpen,
    isListsDropdownOpen,
    isColorsGroupedOpen,
    isFontSizeDropdownOpen,
    isAlignmentDropdownOpen,
    isMergeFieldsOpen,
  ])

  const availableStyles = useMemo((): TextStyleOption[] => {
    if (docTextStyleMenu) {
      if (includeCodeBlock) return DOC_TEXT_STYLE_ALL
      return DOC_TEXT_STYLE_ALL.filter((s) => s.id !== 'codeBlock')
    }
    if (includeCodeBlock) return TEXT_STYLES
    return TEXT_STYLES.filter((s) => s.id !== 'codeBlock')
  }, [docTextStyleMenu, includeCodeBlock])

  const getCurrentTextStyle = useCallback((): TextStyleOption => {
    const fallback = availableStyles[0] ?? {
      id: 'paragraph' as TextStyleId,
      label: 'Paragraph',
      className: 'body-3',
    }
    if (!editor) return fallback
    if (docTextStyleMenu) {
      return getDocTextStyleOption(editor, includeCodeBlock)
    }
    if (editor.isActive('heading', { level: 1 }))
      return availableStyles.find((s) => s.id === 'heading1') ?? fallback
    if (editor.isActive('heading', { level: 2 }))
      return availableStyles.find((s) => s.id === 'heading2') ?? fallback
    if (editor.isActive('heading', { level: 3 }))
      return availableStyles.find((s) => s.id === 'heading3') ?? fallback
    if (editor.isActive('blockquote'))
      return availableStyles.find((s) => s.id === 'blockquote') ?? fallback
    if (includeCodeBlock && editor.isActive('codeBlock'))
      return availableStyles.find((s) => s.id === 'codeBlock') ?? fallback
    return fallback
  }, [editor, availableStyles, docTextStyleMenu, includeCodeBlock])

  const getCurrentFontSize = useCallback((): number | null => {
    if (!editor) return null
    const attrs = editor.getAttributes('textStyle')
    if (attrs.fontSize) {
      const match = (attrs.fontSize as string).match(/(\d+)/)
      if (match?.[1]) return parseInt(match[1], 10)
    }
    return null
  }, [editor])

  const applyTextStyle = useCallback(
    (styleId: TextStyleId) => {
      if (!editor) return
      const cur = editor.getAttributes('textStyle') as Record<string, unknown>
      const noFont = { ...cur, fontSize: null } as Record<string, unknown>
      if (docTextStyleMenu) {
        applyDocTextStyle(editor, styleId, noFont, includeCodeBlock)
        return
      }
      switch (styleId) {
        case 'paragraph':
          editor
            .chain()
            .focus()
            .setParagraph()
            .setMark('textStyle', noFont)
            .removeEmptyTextStyle()
            .run()
          break
        case 'heading1':
          editor
            .chain()
            .focus()
            .toggleHeading({ level: 1 })
            .setMark('textStyle', noFont)
            .removeEmptyTextStyle()
            .run()
          break
        case 'heading2':
          editor
            .chain()
            .focus()
            .toggleHeading({ level: 2 })
            .setMark('textStyle', noFont)
            .removeEmptyTextStyle()
            .run()
          break
        case 'heading3':
          editor
            .chain()
            .focus()
            .toggleHeading({ level: 3 })
            .setMark('textStyle', noFont)
            .removeEmptyTextStyle()
            .run()
          break
        case 'blockquote':
          editor
            .chain()
            .focus()
            .toggleBlockquote()
            .setMark('textStyle', noFont)
            .removeEmptyTextStyle()
            .run()
          break
        case 'codeBlock':
          editor
            .chain()
            .focus()
            .toggleCodeBlock()
            .setMark('textStyle', noFont)
            .removeEmptyTextStyle()
            .run()
          break
        default:
          break
      }
    },
    [editor, docTextStyleMenu, includeCodeBlock],
  )

  const applyFontSize = useCallback(
    (size: number | null) => {
      if (!editor) return
      if (size === null) {
        const cur = editor.getAttributes('textStyle') as Record<string, unknown>
        editor
          .chain()
          .focus()
          .setMark('textStyle', { ...cur, fontSize: null })
          .removeEmptyTextStyle()
          .run()
      } else {
        const cur = editor.getAttributes('textStyle') as Record<string, unknown>
        editor
          .chain()
          .focus()
          .setMark('textStyle', { ...cur, fontSize: `${size}px` })
          .run()
      }
    },
    [editor],
  )

  const handleLinkToggle = useCallback(() => {
    if (!editor) return
    if (editor.isActive('link')) {
      const attrs = editor.getAttributes('link')
      setLinkUrl(attrs.href || '')
      setShowLinkEditDialog(true)
    } else {
      setShowLinkInput(true)
    }
  }, [editor])

  const removeLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().unsetLink().run()
    setShowLinkEditDialog(false)
    setLinkUrl('')
  }, [editor])

  const updateLink = useCallback(() => {
    if (!editor || !linkUrl) return
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    setLinkUrl('')
    setShowLinkEditDialog(false)
  }, [editor, linkUrl])

  const addLink = useCallback(() => {
    if (!editor || !linkUrl) return
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
    editor.chain().focus().setLink({ href: url }).run()
    setLinkUrl('')
    setShowLinkInput(false)
  }, [editor, linkUrl])

  const [isImageDropdownOpen, setIsImageDropdownOpen] = useState(false)
  const imageDropdownRef = useRef<HTMLDivElement>(null)
  const imageFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isImageDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (imageDropdownRef.current && !imageDropdownRef.current.contains(e.target as Node)) {
        setIsImageDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isImageDropdownOpen])

  const handleImageFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && onImageUpload) onImageUpload(file)
      if (imageFileInputRef.current) imageFileInputRef.current.value = ''
      setIsImageDropdownOpen(false)
    },
    [onImageUpload],
  )

  const tryCommitCustomFromDocFullPanel = useCallback(() => {
    if (!openDocFullPanelPendingCommitRef.current) return
    openDocFullPanelPendingCommitRef.current = false
    const v = docTagPanelValueRef.current.trim()
    setDocCustomSwatches((prev) => {
      if (!shouldSaveAsNewCustom(v, prev)) return prev
      const next = [...prev, v].slice(-MAX_CUSTOM_TAG_SWATCHES)
      try {
        localStorage.setItem(RICH_TEXT_DOC_SWATCHES_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!docColorMenu) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (docColorFullPanelRef.current?.contains(t)) return
      if (docTagPanelPos) {
        tryCommitCustomFromDocFullPanel()
        setDocTagPanelPos(null)
        if (
          docColorPresetPopoverRef.current?.contains(t) ||
          textStyleDropdownRef.current?.contains(t) ||
          listsDropdownRef.current?.contains(t) ||
          colorsGroupedDropdownRef.current?.contains(t) ||
          fontSizeDropdownRef.current?.contains(t) ||
          alignmentDropdownRef.current?.contains(t) ||
          mergeFieldsDropdownRef.current?.contains(t) ||
          imageDropdownRef.current?.contains(t)
        ) {
          return
        }
        setDocColorMenu(null)
        return
      }
      if (
        docColorPresetPopoverRef.current?.contains(t) ||
        textStyleDropdownRef.current?.contains(t) ||
        listsDropdownRef.current?.contains(t) ||
        colorsGroupedDropdownRef.current?.contains(t) ||
        fontSizeDropdownRef.current?.contains(t) ||
        alignmentDropdownRef.current?.contains(t) ||
        mergeFieldsDropdownRef.current?.contains(t) ||
        imageDropdownRef.current?.contains(t)
      )
        return
      setDocColorMenu(null)
    }
    const id = setTimeout(() => {
      document.addEventListener('mousedown', onDown, true)
    }, 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', onDown, true)
    }
  }, [docColorMenu, docTagPanelPos, tryCommitCustomFromDocFullPanel])

  useEffect(() => {
    if (!docColorMenu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (docTagPanelPos) {
        e.stopPropagation()
        e.preventDefault()
        tryCommitCustomFromDocFullPanel()
        setDocTagPanelPos(null)
        setDocColorMenu((m) => (m?.skipPresetPopover ? null : m))
        return
      }
      if (docColorMenu) {
        e.stopPropagation()
        e.preventDefault()
        setDocColorMenu(null)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [docColorMenu, docTagPanelPos, tryCommitCustomFromDocFullPanel])

  const applyGroupedDocColorPreset = useCallback(
    (kind: 'textColor' | 'banner' | 'badge' | 'highlight', presetId: string) => {
      if (!editor) return
      if (kind === 'textColor') {
        applyDocTextPaint(editor, presetId)
      } else if (kind === 'banner') {
        applyDocBannerBackground(editor, presetId)
      } else if (kind === 'badge') {
        applyDocBadgeBackground(editor, presetId)
      } else {
        applyDocHighlightColor(editor, presetId)
      }
      setIsColorsGroupedOpen(false)
      if (kind === 'banner') setIsBannerPaintSubmenuOpen(false)
    },
    [editor],
  )

  const openDocFullPickerFromGroupedPlus = useCallback(
    (anchor: HTMLElement, kind: 'textColor' | 'banner' | 'badge' | 'highlight') => {
      if (!editor) return
      openDocFullPanelPendingCommitRef.current = true
      if (kind === 'textColor') {
        setDocTagPanelValue(initialPanelValueForDocTextColor(editor))
      } else if (kind === 'banner') {
        setDocTagPanelValue(initialPanelValueForDocBanner(editor))
      } else if (kind === 'badge') {
        setDocTagPanelValue(initialPanelValueForDocBadge(editor))
      } else {
        setDocTagPanelValue(initialPanelValueForDocHighlight(editor))
      }
      setDocColorMenu({ kind, top: 0, left: 0, skipPresetPopover: true })
      setDocTagPanelPos(positionTagFullPickerNextToPresets(anchor.getBoundingClientRect()))
    },
    [editor],
  )

  if (!editor) return null

  const currentStyle = getCurrentTextStyle()
  const currentFontSize = getCurrentFontSize()
  const DocTextStyleTriggerIcon = docTextStyleMenu ? (currentStyle.icon ?? Type) : null

  const currentTextAlign = getToolbarTextAlign(editor)
  const AlignDockTriggerIcon =
    currentTextAlign === 'center'
      ? AlignCenter
      : currentTextAlign === 'right'
        ? AlignRight
        : AlignLeft

  const inList = editor.isActive('listItem') || editor.isActive('taskItem')
  const canIncreaseIndent = inList
    ? editor.can().sinkListItem('listItem') ||
      (editorHasTaskItems(editor) && editor.can().sinkListItem('taskItem'))
    : ((editor.can() as unknown as { increaseIndent: () => boolean }).increaseIndent?.() ?? false)
  const canDecreaseIndent = inList
    ? editor.can().liftListItem('listItem') ||
      (editorHasTaskItems(editor) && editor.can().liftListItem('taskItem'))
    : ((editor.can() as unknown as { decreaseIndent: () => boolean }).decreaseIndent?.() ?? false)

  const linkPanelOpen = showLinkInput || showLinkEditDialog

  return (
    <div className={clsx('rich-text-toolbar-dock border-border border-b', className)}>
      {/* Main Toolbar */}
      <div
        className={clsx(
          'flex min-h-10 items-center gap-0.5 px-1.5 py-1',
          toolbarLayout === 'nowrap' ? 'min-w-0 flex-nowrap overflow-x-auto' : 'flex-wrap',
        )}
      >
        {/* Text Style Dropdown */}
        {showTextStyles && (
          <div className="relative" ref={textStyleDropdownRef}>
            <button
              type="button"
              onClick={() => setIsTextStyleDropdownOpen(!isTextStyleDropdownOpen)}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground box-border flex h-8 shrink-0 items-center gap-1 rounded border border-transparent px-2 text-xs transition-colors"
            >
              {DocTextStyleTriggerIcon ? (
                <DocTextStyleTriggerIcon className="text-muted-foreground h-4 w-4 shrink-0" />
              ) : (
                <span>{currentStyle.label}</span>
              )}
              <ChevronDown
                className={clsx(
                  'h-3 w-3 transition-transform',
                  isTextStyleDropdownOpen && 'rotate-180',
                )}
              />
            </button>
            {isTextStyleDropdownOpen &&
              (docTextStyleMenu ? (
                <div className="border-border bg-card absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border py-1 shadow-lg">
                  <div className="text-muted-foreground px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide">
                    Turn into
                  </div>
                  <div className="flex flex-col gap-0.5 px-1">
                    {DOC_TURN_INTO_LEFT_IDS.map((id) => {
                      const style = DOC_TEXT_BY_ID.get(id)
                      if (!style) return null
                      const Icon = style.icon
                      const isSelected = currentStyle.id === style.id
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => {
                            applyTextStyle(style.id)
                            setIsTextStyleDropdownOpen(false)
                          }}
                          className={clsx(
                            'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                            isSelected
                              ? 'chip-glass-blue'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                          )}
                        >
                          {Icon ? (
                            <Icon
                              className={clsx(
                                'h-4 w-4 shrink-0',
                                isSelected ? undefined : 'text-muted-foreground',
                              )}
                            />
                          ) : null}
                          <span
                            className={clsx(
                              'min-w-0 flex-1 truncate text-xs',
                              !isSelected && 'text-foreground',
                            )}
                          >
                            {style.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="border-border mx-2 my-1 border-t" />
                  <div className="flex flex-col gap-0.5 px-1 pb-1">
                    {showDocSurfaces && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsBannerPaintSubmenuOpen((prev) => {
                              const next = !prev
                              if (next) setIsQuoteSubmenuOpen(false)
                              return next
                            })
                          }}
                          className={clsx(
                            'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                            editor.isActive('docBanner') || isBannerPaintSubmenuOpen
                              ? 'chip-glass-blue'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                          )}
                        >
                          <Bookmark
                            className={clsx(
                              'h-4 w-4 shrink-0',
                              !(editor.isActive('docBanner') || isBannerPaintSubmenuOpen) &&
                                'text-muted-foreground',
                            )}
                          />
                          <span
                            className={clsx(
                              'min-w-0 flex-1 truncate text-xs',
                              !(editor.isActive('docBanner') || isBannerPaintSubmenuOpen) &&
                                'text-foreground',
                            )}
                          >
                            {DOC_TEXT_BY_ID.get('docBanner')?.label ?? 'Banners'}
                          </span>
                          <ChevronRight
                            className={clsx(
                              'text-muted-foreground h-4 w-4 shrink-0 transition-transform',
                              isBannerPaintSubmenuOpen && 'rotate-90',
                            )}
                          />
                        </button>
                        {isBannerPaintSubmenuOpen && (
                          <div className="border-border bg-card absolute left-full top-0 z-[60] ml-1 min-w-[200px] rounded-lg border p-2 shadow-lg">
                            <div className="text-foreground mb-2 flex items-center gap-1.5 px-1 text-xs font-medium">
                              <Bookmark className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                              Banner (block)
                            </div>
                            <div className="grid grid-cols-6 gap-1.5">
                              {DOC_COLORS_GROUPED_GRID_PRESETS.map((c) => {
                                const presetHex = PRESET_HEX[c.id] ?? '#6366f1'
                                return (
                                  <TagSwatchButton
                                    key={c.id}
                                    title={c.label}
                                    onClick={() => applyGroupedDocColorPreset('banner', c.id)}
                                    swatchStyle={glassSwatchStyle(presetHex)}
                                  />
                                )
                              })}
                              <button
                                type="button"
                                onClick={(e) =>
                                  openDocFullPickerFromGroupedPlus(e.currentTarget, 'banner')
                                }
                                className="bg-[var(--color-card)]/40 hover:border-[var(--foreground)]/40 flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)] transition-all hover:text-[var(--foreground)]"
                                title="Custom banner color"
                              >
                                <BookmarkPlus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuoteSubmenuOpen((prev) => {
                            const next = !prev
                            if (next) setIsBannerPaintSubmenuOpen(false)
                            return next
                          })
                        }}
                        className={clsx(
                          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                          editor.isActive('blockquote') ||
                            editor.isActive('docPullQuote') ||
                            isQuoteSubmenuOpen
                            ? 'chip-glass-blue'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                        )}
                      >
                        <Quote
                          className={clsx(
                            'h-4 w-4 shrink-0',
                            !(
                              editor.isActive('blockquote') ||
                              editor.isActive('docPullQuote') ||
                              isQuoteSubmenuOpen
                            ) && 'text-muted-foreground',
                          )}
                        />
                        <span
                          className={clsx(
                            'min-w-0 flex-1 truncate text-xs',
                            !(
                              editor.isActive('blockquote') ||
                              editor.isActive('docPullQuote') ||
                              isQuoteSubmenuOpen
                            ) && 'text-foreground',
                          )}
                        >
                          Quote
                        </span>
                        <ChevronRight
                          className={clsx(
                            'text-muted-foreground h-4 w-4 shrink-0 transition-transform',
                            isQuoteSubmenuOpen && 'rotate-90',
                          )}
                        />
                      </button>
                      {isQuoteSubmenuOpen && (
                        <div className="border-border bg-card absolute left-full top-0 z-[60] ml-1 flex min-w-[176px] flex-col gap-0.5 rounded-lg border px-1 py-1 shadow-lg">
                          {DOC_QUOTE_STYLE_IDS.map((id) => {
                            const style = DOC_TEXT_BY_ID.get(id)
                            if (!style) return null
                            const isSelected = currentStyle.id === id
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => {
                                  applyTextStyle(id)
                                  setIsQuoteSubmenuOpen(false)
                                }}
                                className={clsx(
                                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                                  isSelected
                                    ? 'chip-glass-blue'
                                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                                )}
                              >
                                <Quote
                                  className={clsx(
                                    'h-4 w-4 shrink-0',
                                    isSelected ? undefined : 'text-muted-foreground',
                                  )}
                                />
                                <span
                                  className={clsx(
                                    'min-w-0 flex-1 truncate text-xs',
                                    !isSelected && 'text-foreground',
                                  )}
                                >
                                  {style.label}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    {DOC_TURN_INTO_RIGHT_IDS.map((id) => {
                      if (!includeCodeBlock && id === 'codeBlock') return null
                      const style = DOC_TEXT_BY_ID.get(id)
                      if (!style) return null
                      const Icon = style.icon
                      const isSelected = currentStyle.id === style.id
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => {
                            applyTextStyle(style.id)
                            setIsTextStyleDropdownOpen(false)
                          }}
                          className={clsx(
                            'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                            isSelected
                              ? 'chip-glass-blue'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                          )}
                        >
                          {Icon ? (
                            <Icon
                              className={clsx(
                                'h-4 w-4 shrink-0',
                                isSelected ? undefined : 'text-muted-foreground',
                              )}
                            />
                          ) : null}
                          <span
                            className={clsx(
                              'min-w-0 flex-1 truncate text-xs',
                              isSelected ? undefined : 'text-foreground',
                              style.id === 'codeBlock' && 'font-mono',
                            )}
                          >
                            {style.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="border-border bg-card absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border p-1 shadow-lg">
                  {availableStyles.map((style) => {
                    const isSelected = currentStyle.id === style.id
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          applyTextStyle(style.id)
                          setIsTextStyleDropdownOpen(false)
                        }}
                        className={clsx(
                          'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs',
                          isSelected
                            ? 'chip-glass-blue'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                        )}
                      >
                        <span
                          className={clsx(
                            'text-xs',
                            isSelected ? undefined : 'text-foreground',
                            style.id === 'blockquote' &&
                              !isSelected &&
                              'text-muted-foreground italic',
                          )}
                        >
                          {style.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
          </div>
        )}

        {/* Font Size Dropdown */}
        {showFontSize && (
          <>
            {showTextStyles && <ToolbarDivider />}
            <div className="relative" ref={fontSizeDropdownRef}>
              <button
                type="button"
                onClick={() => setIsFontSizeDropdownOpen(!isFontSizeDropdownOpen)}
                className="text-muted-foreground hover:bg-secondary hover:text-foreground box-border flex h-8 min-w-[65px] items-center gap-1 rounded border border-transparent px-2 text-xs transition-colors"
              >
                <span>{currentFontSize ? `${currentFontSize}px` : 'Size'}</span>
                <ChevronDown
                  className={clsx(
                    'h-3 w-3 transition-transform',
                    isFontSizeDropdownOpen && 'rotate-180',
                  )}
                />
              </button>
              {isFontSizeDropdownOpen && (
                <div className="border-border bg-card absolute left-0 top-full z-50 mt-1 max-h-[300px] min-w-[90px] overflow-y-auto rounded-lg border p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      applyFontSize(null)
                      setIsFontSizeDropdownOpen(false)
                    }}
                    className={clsx(
                      'flex w-full items-center rounded px-2 py-1.5 text-left text-xs',
                      currentFontSize === null
                        ? 'chip-glass-blue'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    Default
                  </button>
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        applyFontSize(size)
                        setIsFontSizeDropdownOpen(false)
                      }}
                      className={clsx(
                        'flex w-full items-center rounded px-2 py-1.5 text-left text-xs',
                        currentFontSize === size
                          ? 'chip-glass-blue'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                      )}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {(showTextStyles || showFontSize) &&
          ((docTextStyleMenu && (showTextColor || showDocSurfaces || showLists)) ||
            (!docTextStyleMenu && (showTextColor || showDocSurfaces || showQuoteCodeBlocks))) && (
            <ToolbarDivider />
          )}

        {docTextStyleMenu && (showTextColor || showDocSurfaces) && (
          <div className="relative" ref={colorsGroupedDropdownRef}>
            <button
              type="button"
              onClick={() => setIsColorsGroupedOpen((o) => !o)}
              className={clsx(
                'box-border flex h-8 min-w-0 items-center gap-1 rounded px-2 text-xs transition-colors',
                isColorsGroupedOpen || (docColorMenu != null && docColorMenu.kind !== 'banner')
                  ? 'chip-glass-blue'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent',
              )}
              title="Colors"
            >
              <Droplets className="h-4 w-4 shrink-0" />
              <ChevronDown
                className={clsx(
                  'h-3 w-3 shrink-0 transition-transform',
                  isColorsGroupedOpen && 'rotate-180',
                )}
              />
            </button>
            {isColorsGroupedOpen && (
              <div className="border-border bg-card absolute left-0 top-full z-50 mt-1 min-w-[260px] rounded-lg border p-1 shadow-lg">
                {showTextColor && (
                  <div className="px-2 pb-2 pt-1">
                    <div className="text-foreground mb-1 flex items-center gap-1.5 text-xs font-medium">
                      <Palette className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      Text color
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {DOC_COLORS_GROUPED_GRID_PRESETS.map((c) => {
                        const presetHex = PRESET_HEX[c.id] ?? '#6366f1'
                        return (
                          <TagSwatchButton
                            key={c.id}
                            title={c.label}
                            onClick={() => applyGroupedDocColorPreset('textColor', c.id)}
                            swatchStyle={glassSwatchStyle(presetHex)}
                          />
                        )
                      })}
                      <button
                        type="button"
                        onClick={(e) =>
                          openDocFullPickerFromGroupedPlus(e.currentTarget, 'textColor')
                        }
                        className="bg-[var(--color-card)]/40 hover:border-[var(--foreground)]/40 flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)] transition-all hover:text-[var(--foreground)]"
                        title="Custom color"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                {showDocSurfaces && (
                  <>
                    <div
                      className={clsx(
                        'border-border px-2 pb-2',
                        showTextColor ? 'border-t pt-2' : 'pt-1',
                      )}
                    >
                      <div className="text-foreground mb-1 flex items-center gap-1.5 text-xs font-medium">
                        <Badge className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        Badge (inline)
                      </div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {DOC_COLORS_GROUPED_GRID_PRESETS.map((c) => {
                          const presetHex = PRESET_HEX[c.id] ?? '#6366f1'
                          return (
                            <TagSwatchButton
                              key={c.id}
                              title={c.label}
                              onClick={() => applyGroupedDocColorPreset('badge', c.id)}
                              swatchStyle={glassSwatchStyle(presetHex)}
                            />
                          )
                        })}
                        <button
                          type="button"
                          onClick={(e) =>
                            openDocFullPickerFromGroupedPlus(e.currentTarget, 'badge')
                          }
                          className="bg-[var(--color-card)]/40 hover:border-[var(--foreground)]/40 flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)] transition-all hover:text-[var(--foreground)]"
                          title="Custom color"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="border-border border-t px-2 pb-2 pt-2">
                      <div className="text-foreground mb-1 flex items-center gap-1.5 text-xs font-medium">
                        <Highlighter className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        Text highlight
                      </div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {DOC_COLORS_GROUPED_GRID_PRESETS.map((c) => {
                          const presetHex = PRESET_HEX[c.id] ?? '#6366f1'
                          return (
                            <TagSwatchButton
                              key={c.id}
                              title={c.label}
                              onClick={() => applyGroupedDocColorPreset('highlight', c.id)}
                              swatchStyle={glassSwatchStyle(presetHex)}
                            />
                          )
                        })}
                        <button
                          type="button"
                          onClick={(e) =>
                            openDocFullPickerFromGroupedPlus(e.currentTarget, 'highlight')
                          }
                          className="bg-[var(--color-card)]/40 hover:border-[var(--foreground)]/40 flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-[var(--color-border)] text-[var(--color-muted-foreground)] transition-all hover:text-[var(--foreground)]"
                          title="Custom color"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {!docTextStyleMenu && (showTextColor || showDocSurfaces || showQuoteCodeBlocks) && (
          <div className="relative flex flex-wrap items-center gap-0.5">
            {showTextColor && (
              <ToolbarButton
                onClick={(e) => {
                  e.preventDefault()
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  const top = r.bottom + 4
                  const left = Math.min(Math.max(8, r.left), window.innerWidth - 220)
                  setDocColorMenu((m) =>
                    m?.kind === 'textColor' ? null : { kind: 'textColor', top, left },
                  )
                  setDocTagPanelPos(null)
                }}
                isActive={docColorMenu?.kind === 'textColor' || false}
                title="Text color"
              >
                <Palette className="h-4 w-4" />
              </ToolbarButton>
            )}

            {showDocSurfaces && (
              <>
                <ToolbarButton
                  onClick={(e) => {
                    e.preventDefault()
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const top = r.bottom + 4
                    const left = Math.min(Math.max(8, r.left), window.innerWidth - 220)
                    setDocColorMenu((m) =>
                      m?.kind === 'banner' ? null : { kind: 'banner', top, left },
                    )
                    setDocTagPanelPos(null)
                  }}
                  isActive={docColorMenu?.kind === 'banner' || editor.isActive('docBanner')}
                  title="Banner (block)"
                >
                  <PanelTop className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={(e) => {
                    e.preventDefault()
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const top = r.bottom + 4
                    const left = Math.min(Math.max(8, r.left), window.innerWidth - 220)
                    setDocColorMenu((m) =>
                      m?.kind === 'badge' ? null : { kind: 'badge', top, left },
                    )
                    setDocTagPanelPos(null)
                  }}
                  isActive={docColorMenu?.kind === 'badge' || editor.isActive('docBadge')}
                  title="Badge (inline)"
                >
                  <Badge className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={(e) => {
                    e.preventDefault()
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const top = r.bottom + 4
                    const left = Math.min(Math.max(8, r.left), window.innerWidth - 220)
                    setDocColorMenu((m) =>
                      m?.kind === 'highlight' ? null : { kind: 'highlight', top, left },
                    )
                    setDocTagPanelPos(null)
                  }}
                  isActive={docColorMenu?.kind === 'highlight' || editor.isActive('highlight')}
                  title="Text highlight"
                >
                  <Highlighter className="h-4 w-4" />
                </ToolbarButton>
              </>
            )}

            {showQuoteCodeBlocks && (
              <>
                <ToolbarButton
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  isActive={editor.isActive('blockquote')}
                  title="Quote"
                >
                  <Quote className="h-4 w-4" />
                </ToolbarButton>
                {includeCodeBlock && (
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    title="Code block"
                  >
                    <Code2 className="h-4 w-4" />
                  </ToolbarButton>
                )}
              </>
            )}
          </div>
        )}

        {docTextStyleMenu && showLists && (
          <>
            {(showTextStyles || showFontSize || showTextColor || showDocSurfaces) && (
              <ToolbarDivider />
            )}
            <div className="relative" ref={listsDropdownRef}>
              <button
                type="button"
                onClick={() => setIsListsDropdownOpen((o) => !o)}
                className={clsx(
                  'box-border flex h-8 items-center gap-1 rounded px-2 text-xs transition-colors',
                  DOC_LIST_STYLE_IDS.includes(currentStyle.id)
                    ? 'chip-glass-blue'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent',
                  isListsDropdownOpen &&
                    !DOC_LIST_STYLE_IDS.includes(currentStyle.id) &&
                    'bg-secondary',
                )}
                title="Lists"
              >
                {(() => {
                  const opt = getDocTextStyleOption(editor, includeCodeBlock)
                  const G = DOC_LIST_STYLE_IDS.includes(opt.id) && opt.icon ? opt.icon : List
                  return <G className="h-4 w-4" />
                })()}
                <ChevronDown
                  className={clsx(
                    'h-3 w-3 transition-transform',
                    isListsDropdownOpen && 'rotate-180',
                  )}
                />
              </button>
              {isListsDropdownOpen && (
                <div className="border-border bg-card absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border py-1 shadow-lg">
                  <div className="flex flex-col gap-0.5 px-1">
                    {DOC_LIST_STYLE_IDS.map((id) => {
                      const style = DOC_TEXT_BY_ID.get(id)
                      if (!style?.icon) return null
                      const Icon = style.icon
                      const isSelected = currentStyle.id === id
                      return (
                        <button
                          key={id}
                          type="button"
                          title={style.label}
                          onClick={() => {
                            applyTextStyle(id)
                            setIsListsDropdownOpen(false)
                          }}
                          className={clsx(
                            'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                            isSelected
                              ? 'chip-glass-blue'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                          )}
                        >
                          <Icon
                            className={clsx(
                              'h-4 w-4 shrink-0',
                              !isSelected && 'text-muted-foreground',
                            )}
                          />
                          <span
                            className={clsx(
                              'min-w-0 flex-1 truncate text-xs',
                              !isSelected && 'text-foreground',
                            )}
                          >
                            {style.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {docColorMenu &&
          !docColorMenu.skipPresetPopover &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <ColorPickerPopover
                ref={docColorPresetPopoverRef}
                top={docColorMenu.top}
                left={docColorMenu.left}
                customSwatches={docCustomSwatches}
                onSelect={(c) => {
                  const kind = docColorMenu.kind
                  if (kind === 'textColor') {
                    applyDocTextPaint(editor, c)
                  } else if (kind === 'banner') {
                    applyDocBannerBackground(editor, c)
                  } else if (kind === 'badge') {
                    applyDocBadgeBackground(editor, c)
                  } else {
                    applyDocHighlightColor(editor, c)
                  }
                  setDocColorMenu(null)
                  setDocTagPanelPos(null)
                }}
                onOpenFullPicker={() => {
                  openDocFullPanelPendingCommitRef.current = true
                  if (docColorMenu.kind === 'textColor') {
                    setDocTagPanelValue(initialPanelValueForDocTextColor(editor))
                  } else if (docColorMenu.kind === 'banner') {
                    setDocTagPanelValue(initialPanelValueForDocBanner(editor))
                  } else if (docColorMenu.kind === 'badge') {
                    setDocTagPanelValue(initialPanelValueForDocBadge(editor))
                  } else {
                    setDocTagPanelValue(initialPanelValueForDocHighlight(editor))
                  }
                  const menu = docColorPresetPopoverRef.current
                  if (menu) {
                    setDocTagPanelPos(
                      positionTagFullPickerNextToPresets(menu.getBoundingClientRect()),
                    )
                  }
                }}
              />
            </div>,
            document.body,
          )}

        {docTagPanelPos &&
          docColorMenu &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              ref={docColorFullPanelRef}
              className="fixed z-[100001]"
              style={{ top: docTagPanelPos.top, left: docTagPanelPos.left }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <ColorPickerPanelStandalone
                key={docColorMenu.kind}
                value={docTagPanelValue}
                onChange={(v) => {
                  setDocTagPanelValue(v)
                  if (docColorMenu.kind === 'textColor') {
                    applyDocTextPaint(editor, v)
                  } else if (docColorMenu.kind === 'banner') {
                    applyDocBannerBackground(editor, v)
                  } else if (docColorMenu.kind === 'badge') {
                    applyDocBadgeBackground(editor, v)
                  } else {
                    applyDocHighlightColor(editor, v)
                  }
                }}
                allowGradient
              />
            </div>,
            document.body,
          )}

        {(showTextStyles ||
          showFontSize ||
          (!docTextStyleMenu && (showTextColor || showDocSurfaces || showQuoteCodeBlocks)) ||
          docTextStyleMenu) &&
          showFormatting && <ToolbarDivider />}

        {/* Text Formatting */}
        {showFormatting && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>
            {(showAlignment || showLink || (!docTextStyleMenu && showLists)) && <ToolbarDivider />}
          </>
        )}

        {/* Lists (legacy inline buttons when not doc block menu) */}
        {showLists && !docTextStyleMenu && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            {(showAlignment || showLink) && <ToolbarDivider />}
          </>
        )}

        {/* Alignment */}
        {showAlignment && (
          <>
            <div className="relative" ref={alignmentDropdownRef}>
              <button
                type="button"
                onClick={() => setIsAlignmentDropdownOpen(!isAlignmentDropdownOpen)}
                title="Alignment"
                className={clsx(
                  'text-muted-foreground hover:bg-secondary hover:text-foreground box-border flex h-8 min-w-[52px] items-center gap-1 rounded border border-transparent px-2 text-xs transition-colors',
                  isAlignmentDropdownOpen && 'bg-secondary',
                )}
              >
                <AlignDockTriggerIcon className="h-4 w-4 shrink-0" />
                <ChevronDown
                  className={clsx(
                    'h-3 w-3 shrink-0 transition-transform',
                    isAlignmentDropdownOpen && 'rotate-180',
                  )}
                />
              </button>
              {isAlignmentDropdownOpen && (
                <div className="border-border bg-card absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border py-1 shadow-lg">
                  <div className="flex flex-col gap-0.5 px-1 pt-1">
                    {(
                      [
                        {
                          align: 'left' as const,
                          label: 'Align left',
                          Icon: AlignLeft,
                        },
                        {
                          align: 'center' as const,
                          label: 'Align center',
                          Icon: AlignCenter,
                        },
                        {
                          align: 'right' as const,
                          label: 'Align right',
                          Icon: AlignRight,
                        },
                      ] as const
                    ).map(({ align, label, Icon }) => {
                      const selected = currentTextAlign === align
                      return (
                        <button
                          key={align}
                          type="button"
                          onClick={() => {
                            editor.chain().focus().setTextAlign(align).run()
                            setIsAlignmentDropdownOpen(false)
                          }}
                          className={clsx(
                            'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                            selected
                              ? 'chip-glass-blue'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                          )}
                        >
                          <Icon
                            className={clsx(
                              'h-4 w-4 shrink-0',
                              !selected && 'text-muted-foreground',
                            )}
                          />
                          <span
                            className={clsx(
                              'min-w-0 flex-1 truncate',
                              !selected && 'text-foreground',
                            )}
                          >
                            {label}
                          </span>
                          <span
                            className={clsx(
                              'shrink-0 text-[10px] tabular-nums',
                              selected ? 'opacity-60' : 'text-muted-foreground',
                            )}
                          >
                            {alignmentShortcutHint(align)}
                          </span>
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                            {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="border-border mx-2 my-1 border-t" />
                  <div className="flex flex-col gap-0.5 px-1 pb-1">
                    <button
                      type="button"
                      disabled={!canIncreaseIndent}
                      onClick={() => {
                        if (inList) {
                          if (editor.can().sinkListItem('listItem')) {
                            editor.chain().focus().sinkListItem('listItem').run()
                          } else if (
                            editorHasTaskItems(editor) &&
                            editor.can().sinkListItem('taskItem')
                          ) {
                            editor.chain().focus().sinkListItem('taskItem').run()
                          }
                        } else {
                          ;(
                            editor.chain().focus() as unknown as {
                              increaseIndent: () => { run: () => void }
                            }
                          )
                            .increaseIndent()
                            .run()
                        }
                      }}
                      className={clsx(
                        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                        canIncreaseIndent
                          ? 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          : 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <IndentIncrease className="text-muted-foreground h-4 w-4 shrink-0" />
                      <span className="text-foreground min-w-0 flex-1 truncate">
                        Increase indent
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={!canDecreaseIndent}
                      onClick={() => {
                        if (inList) {
                          if (editor.can().liftListItem('listItem')) {
                            editor.chain().focus().liftListItem('listItem').run()
                          } else if (
                            editorHasTaskItems(editor) &&
                            editor.can().liftListItem('taskItem')
                          ) {
                            editor.chain().focus().liftListItem('taskItem').run()
                          }
                        } else {
                          ;(
                            editor.chain().focus() as unknown as {
                              decreaseIndent: () => { run: () => void }
                            }
                          )
                            .decreaseIndent()
                            .run()
                        }
                      }}
                      className={clsx(
                        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                        canDecreaseIndent
                          ? 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          : 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <IndentDecrease className="text-muted-foreground h-4 w-4 shrink-0" />
                      <span className="text-foreground min-w-0 flex-1 truncate">
                        Decrease indent
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {mergeFields && mergeFields.length > 0 ? (
          <>
            <ToolbarDivider />
            <div className="shrink-0" ref={mergeFieldsDropdownRef}>
              <button
                type="button"
                onClick={() => setIsMergeFieldsOpen((open) => !open)}
                title="Insert contact field"
                className={clsx(
                  'text-muted-foreground hover:bg-secondary hover:text-foreground box-border flex h-8 shrink-0 items-center gap-0.5 rounded border border-transparent px-1.5 text-xs transition-colors',
                  isMergeFieldsOpen && 'bg-secondary',
                )}
              >
                <Braces className="h-4 w-4 shrink-0" />
                <ChevronDown
                  className={clsx(
                    'h-3 w-3 shrink-0 transition-transform',
                    isMergeFieldsOpen && 'rotate-180',
                  )}
                />
              </button>
            </div>
          </>
        ) : null}

        {showLink ? <ToolbarDivider /> : null}

        {/* Link + slide-out URL strip (to the right of the dock) */}
        {showLink && (
          <div className="flex shrink-0 items-center">
            <ToolbarButton
              onClick={handleLinkToggle}
              isActive={editor.isActive('link') || linkPanelOpen}
              title={editor.isActive('link') ? 'Edit link' : 'Add link'}
            >
              <Link2 className="h-4 w-4" />
            </ToolbarButton>
            <div
              className={clsx(
                'flex items-stretch overflow-hidden transition-[max-width,opacity] duration-200 ease-out',
                linkPanelOpen
                  ? 'ml-1 max-w-[min(100vw-5rem,22rem)] opacity-100'
                  : 'max-w-0 opacity-0',
              )}
              aria-hidden={!linkPanelOpen}
            >
              {showLinkInput ? (
                <div className="border-border bg-card flex h-8 min-w-[200px] max-w-[min(100vw-5rem,22rem)] items-center gap-1 rounded-md border px-1.5 shadow-sm">
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="border-border text-foreground focus:border-primary min-w-0 flex-1 rounded border bg-transparent px-2 py-0.5 text-xs outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addLink()
                      }
                      if (e.key === 'Escape') {
                        setShowLinkInput(false)
                        setLinkUrl('')
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addLink}
                    className="chip-glass-blue shrink-0 rounded px-2 py-0.5 text-xs transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkInput(false)
                      setLinkUrl('')
                    }}
                    className="text-muted-foreground hover:bg-secondary flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
              {showLinkEditDialog ? (
                <div className="border-border bg-card flex h-8 min-w-[200px] max-w-[min(100vw-5rem,22rem)] items-center gap-1 rounded-md border px-1.5 shadow-sm">
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="border-border text-foreground focus:border-primary min-w-0 flex-1 rounded border bg-transparent px-2 py-0.5 text-xs outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        updateLink()
                      }
                      if (e.key === 'Escape') {
                        setShowLinkEditDialog(false)
                        setLinkUrl('')
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={updateLink}
                    className="chip-glass-blue shrink-0 rounded px-2 py-0.5 text-xs transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={removeLink}
                    className="text-destructive shrink-0 rounded px-2 py-0.5 text-xs transition-colors hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkEditDialog(false)
                      setLinkUrl('')
                    }}
                    className="text-muted-foreground hover:bg-secondary flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Image */}
        {showImage && (
          <>
            {showLink && <ToolbarDivider />}
            <div className="relative" ref={imageDropdownRef}>
              <ToolbarButton onClick={() => setIsImageDropdownOpen((o) => !o)} title="Insert image">
                <ImageIcon className="h-4 w-4" />
              </ToolbarButton>
              {isImageDropdownOpen && (
                <div className="border-border bg-card absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => imageFileInputRef.current?.click()}
                    className="text-muted-foreground hover:bg-secondary hover:text-foreground flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsImageDropdownOpen(false)
                      onOpenMediaLibrary?.()
                    }}
                    className="text-muted-foreground hover:bg-secondary hover:text-foreground flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Media Library
                  </button>
                </div>
              )}
              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
              />
            </div>
          </>
        )}
      </div>

      {isMergeFieldsOpen &&
        mergeFields &&
        mergeFields.length > 0 &&
        typeof document !== 'undefined' &&
        (() => {
          const btn = mergeFieldsDropdownRef.current
          if (!btn) return null
          const r = btn.getBoundingClientRect()
          const top = r.bottom + 4
          const left = Math.min(Math.max(8, r.left), window.innerWidth - 360)
          return createPortal(
            <div
              className="border-border bg-card fixed z-[100000] max-h-[min(30vh,12rem)] w-[min(100vw-2rem,22rem)] overflow-y-auto rounded-lg border py-1 shadow-lg"
              style={{ top, left }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {mergeFields.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    if (!editor) return
                    editor.chain().focus().insertContent(row.token).run()
                    setIsMergeFieldsOpen(false)
                  }}
                  className="hover:bg-secondary flex w-full items-center justify-between gap-3 px-2.5 py-1.5 text-left text-xs transition-colors"
                >
                  <span className="text-foreground min-w-0 shrink truncate font-medium">
                    {row.label}
                  </span>
                  <span className="text-muted-foreground max-w-[42%] shrink-0 truncate text-right">
                    {row.valuePreview}
                  </span>
                </button>
              ))}
            </div>,
            document.body,
          )
        })()}
    </div>
  )
}

export const FontSizeTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: Record<string, string | null>) => {
          if (!attributes.fontSize) return {}
          return { style: `font-size: ${attributes.fontSize}` }
        },
      },
    }
  },
})
