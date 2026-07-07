import type { Editor } from '@tiptap/react'

export type DocSlashInsertRange = { from: number; to: number }

export function clearDocSlashInsertText(
  editor: Editor,
  range: DocSlashInsertRange | null | undefined,
): boolean {
  if (!range) return false
  const { from, to } = range
  if (from < 0 || to <= from || to > editor.state.doc.content.size) return false
  const text = editor.state.doc.textBetween(from, to, undefined, '\ufffc')
  if (!text.startsWith('/')) return false
  return editor.chain().focus().deleteRange({ from, to }).setTextSelection(from).run()
}
