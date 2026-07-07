import type { Editor } from '@tiptap/react'
import { docTextSolidHex } from '@/components/ui/forms/doc-background-value'
import { initialTagPanelValueFromOption } from '@/features/spaces/components/cells/field-color-presets-popover'

function mergeTextStyle(editor: Editor) {
  return (editor.getAttributes('textStyle') as Record<string, unknown>) || {}
}

export function applyDocTextPaint(editor: Editor, raw: string) {
  const v = raw.trim()
  const cur = mergeTextStyle(editor)
  if (!v) {
    editor
      .chain()
      .focus()
      .setMark('textStyle', { ...cur, color: null, clipTextFill: null })
      .removeEmptyTextStyle()
      .run()
    return
  }
  if (v.startsWith('linear-gradient')) {
    editor
      .chain()
      .focus()
      .setMark('textStyle', { ...cur, color: null, clipTextFill: v })
      .removeEmptyTextStyle()
      .run()
    return
  }
  const hex = v.startsWith('#') && v.length >= 4 ? v : docTextSolidHex(v)
  editor
    .chain()
    .focus()
    .setMark('textStyle', { ...cur, clipTextFill: null, color: hex })
    .removeEmptyTextStyle()
    .run()
}

export function applyDocBannerBackground(editor: Editor, raw: string) {
  const v = raw.trim() || 'blue'
  if (editor.isActive('docBanner')) {
    editor.chain().focus().updateAttributes('docBanner', { docBackground: v }).run()
  } else {
    editor.chain().focus().toggleWrap('docBanner', { docBackground: v }).run()
  }
}

export function applyDocBadgeBackground(editor: Editor, raw: string) {
  const v = raw.trim() || 'blue'
  if (editor.isActive('docBadge')) {
    editor
      .chain()
      .focus()
      .extendMarkRange('docBadge')
      .setMark('docBadge', { docBackground: v })
      .run()
  } else {
    editor.chain().focus().toggleMark('docBadge', { docBackground: v }).run()
  }
}

export function applyDocHighlightColor(editor: Editor, raw: string) {
  const v = raw.trim() || 'blue'
  editor.chain().focus().setHighlight({ color: v }).run()
}

export function initialPanelValueForDocTextColor(editor: Editor | null): string {
  if (!editor) return '#6366f1'
  const t = editor.getAttributes('textStyle') as {
    color?: string | null
    clipTextFill?: string | null
  }
  const combined = t.clipTextFill || t.color || undefined
  return initialTagPanelValueFromOption(combined)
}

export function initialPanelValueForDocBanner(editor: Editor | null): string {
  if (!editor) return '#6366f1'
  if (!editor.isActive('docBanner')) return '#6366f1'
  const a = editor.getAttributes('docBanner') as { docBackground?: string }
  return initialTagPanelValueFromOption(a.docBackground)
}

export function initialPanelValueForDocBadge(editor: Editor | null): string {
  if (!editor) return '#6366f1'
  if (!editor.isActive('docBadge')) return '#6366f1'
  const a = editor.getAttributes('docBadge') as { docBackground?: string }
  return initialTagPanelValueFromOption(a.docBackground)
}

export function initialPanelValueForDocHighlight(editor: Editor | null): string {
  if (!editor) return '#6366f1'
  const a = editor.getAttributes('highlight') as { color?: string | null }
  return initialTagPanelValueFromOption(a.color || undefined)
}
