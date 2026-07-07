'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details'
import Link from '@tiptap/extension-link'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import Placeholder from '@tiptap/extension-placeholder'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { FontSizeTextStyle } from '@/components/ui/forms/rich-text-toolbar'
import { cn } from '@/lib/utils/cn'
import { docEditorColorAndSurfaces } from '../doc-editor-extensions'
import { DocEditorImage } from '../doc-editor-image-extension'
import { DOC_SLASH_ITEMS, filterSlashItems } from '../doc-slash-commands'
import { DocSlashCommand, DocSlashCommandKey } from '../doc-slash-extension'
import { renderDocSlashMenu } from '../DocSlashMenu'

export function useDocTiptapEditor({
  initialItemId,
  initialDocBodyContent,
  docBodyHydrationResumeNonce,
  inline,
  docLocked,
  isDriveDoc,
  docBodyHydrationBlockedRef,
  handleDocBodyChange,
}: {
  initialItemId: string
  initialDocBodyContent: string
  docBodyHydrationResumeNonce: number
  inline: boolean
  docLocked: boolean
  isDriveDoc: boolean
  docBodyHydrationBlockedRef: MutableRefObject<boolean>
  handleDocBodyChange: (html: string) => void
}): Editor | null {
  const lastInitialItemIdRef = useRef(initialItemId)
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        dropcursor: {
          color: false,
          width: 2,
          class: 'doc-editor-dropcursor',
        },
      }),
      TaskList,
      TaskItem,
      Details,
      DetailsContent,
      DetailsSummary,
      Table.configure({ resizable: true, HTMLAttributes: { class: 'doc-editor-table' } }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
      FontSizeTextStyle,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:no-underline cursor-pointer',
        },
      }),
      DocEditorImage.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: 'doc-editor-image' },
        resize: {
          enabled: true,
          directions: [
            'top',
            'right',
            'bottom',
            'left',
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
          ],
          minWidth: 48,
          minHeight: 48,
          alwaysPreserveAspectRatio: true,
        },
      }),
      Placeholder.configure({
        placeholder: 'Type / for commands…',
        showOnlyCurrent: true,
      }),
      DocSlashCommand.configure({
        suggestion: {
          char: '/',
          pluginKey: DocSlashCommandKey,
          allowSpaces: false,
          startOfLine: false,
          items: ({ query }: { query: string }) => filterSlashItems(DOC_SLASH_ITEMS, query),
          command: ({
            editor: ed,
            range,
            props,
          }: {
            editor: unknown
            range: { from: number; to: number }
            props: (typeof DOC_SLASH_ITEMS)[number]
          }) => {
            props.run(ed as import('@tiptap/react').Editor, range)
          },
          render: renderDocSlashMenu,
        },
      }),
      ...docEditorColorAndSurfaces,
    ],
    content: initialDocBodyContent,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none min-h-[200px] outline-none py-3 text-[var(--foreground)] cursor-text',
          !inline && 'px-4',
          inline && 'px-0',
        ),
      },
    },
    onUpdate: ({ editor: ed }) => {
      handleDocBodyChange(ed.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!docLocked && !isDriveDoc)
  }, [editor, docLocked, isDriveDoc])

  /**
   * `useEditor` only honors the initial `content`. Studio docs hydrate `doc_body`
   * AFTER mount (campaign docs fetch finishes), so without this the editor
   * stays empty even though the prop later contains HTML.
   *
   * While a doc has unsaved local body changes, the editor is protected from
   * same-doc prop hydration. Once autosave clears that dirty/saving window,
   * incoming rows from realtime, agent edits, or campaign-doc refreshes may
   * safely hydrate the open editor.
   */
  useEffect(() => {
    if (!editor) return
    const itemChanged = lastInitialItemIdRef.current !== initialItemId
    lastInitialItemIdRef.current = initialItemId
    if (itemChanged) docBodyHydrationBlockedRef.current = false
    const current = editor.getHTML()
    const incoming =
      initialDocBodyContent && initialDocBodyContent !== '<p></p>' ? initialDocBodyContent : ''
    if (incoming === current) return
    if (!itemChanged) {
      if (docBodyHydrationBlockedRef.current) return
      if (!incoming) return
    }
    if (!incoming && (current === '<p></p>' || current === '')) return
    editor.commands.setContent(incoming, { emitUpdate: false })
  }, [
    editor,
    initialDocBodyContent,
    initialItemId,
    docBodyHydrationBlockedRef,
    docBodyHydrationResumeNonce,
  ])

  return editor
}
