'use client'

/**
 * Email Preview Editor
 * Rich text editor for email content with TipTap
 * Ported from legacy app — stripped of media library, merge tags, subject selector
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, type ReactNode } from 'react'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import clsx from 'clsx'
import { marked } from 'marked'
import {
  FontSizeTextStyle,
  RichTextToolbar,
  type RichTextMergeFieldOption,
} from '@/components/ui/forms/rich-text-toolbar'

/** Convert plain text / markdown to HTML. Already-HTML content passes through unchanged. */
function toHtml(text: string): string {
  if (!text) return ''
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  return marked.parse(text, { async: false, breaks: true }) as string
}

export type { RichTextMergeFieldOption }

// ============================================================================
// TYPES
// ============================================================================

export interface EmailPreviewEditorProps {
  content: string
  onContentChange: (html: string) => void
  placeholder?: string
  className?: string
  readOnly?: boolean
  /** Root class on TipTap mount (e.g. `email-preview-editor` vs `blog-preview-editor`). */
  editorContentClassName?: string
  showImage?: boolean
  onImageUpload?: (file: File) => void
  onOpenMediaLibrary?: () => void
  /** Rendered inside the card below the scrollable body (e.g. send) — avoids clipping vs absolute + overflow-hidden. */
  footer?: ReactNode
  mergeFields?: RichTextMergeFieldOption[]
}

export interface EmailPreviewEditorRef {
  focus: () => void
  getHTML: () => string
  setContent: (html: string) => void
  getEditor: () => Editor | null
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const EmailPreviewEditor = forwardRef<EmailPreviewEditorRef, EmailPreviewEditorProps>(
  function EmailPreviewEditor(
    {
      content,
      onContentChange,
      placeholder = 'Start writing your email...',
      className,
      readOnly = false,
      editorContentClassName = 'email-preview-editor',
      showImage = false,
      onImageUpload,
      onOpenMediaLibrary,
      footer,
      mergeFields,
    },
    ref,
  ) {
    const htmlContent = useMemo(() => toHtml(content), [content])

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Underline,
        FontSizeTextStyle,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-primary underline hover:no-underline cursor-pointer',
          },
        }),
        ...(showImage
          ? [
              Image.configure({
                inline: false,
                allowBase64: false,
                HTMLAttributes: { class: 'blog-post-image' },
              }),
            ]
          : []),
      ],
      content: htmlContent || '',
      editable: !readOnly,
      immediatelyRender: false,
      onUpdate: ({ editor: ed }) => {
        onContentChange(ed.getHTML())
      },
      editorProps: {
        attributes: {
          class: clsx(
            'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
            'prose-headings:text-foreground prose-p:text-foreground',
            'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
            'prose-strong:text-foreground',
            'cursor-text',
          ),
        },
      },
    })

    // Sync content from outside (e.g. when switching emails)
    useEffect(() => {
      if (editor && htmlContent !== editor.getHTML()) {
        editor.commands.setContent(htmlContent || '', { emitUpdate: false })
      }
    }, [htmlContent, editor])

    useImperativeHandle(ref, () => ({
      focus: () => editor?.commands.focus(),
      getHTML: () => editor?.getHTML() || '',
      setContent: (html: string) => editor?.commands.setContent(html),
      getEditor: () => editor,
    }))

    return (
      <div
        className={clsx(
          'border-border bg-card/60 flex min-h-0 flex-col rounded-xl border',
          className,
        )}
      >
        {/* Toolbar — no overflow-hidden on root so Paragraph / Size menus (absolute) are not clipped */}
        {!readOnly && (
          <div className="min-w-0 flex-shrink-0 rounded-t-xl">
            <RichTextToolbar
              editor={editor}
              showTextStyles
              showFontSize
              showFormatting
              showLists
              showAlignment
              showLink
              showImage={showImage}
              onImageUpload={onImageUpload}
              onOpenMediaLibrary={onOpenMediaLibrary}
              includeCodeBlock={false}
              toolbarLayout="wrap"
              mergeFields={mergeFields}
            />
          </div>
        )}

        {/* Editor body — scroll here only; keeps rounded bottom */}
        <div
          className={clsx(
            'relative min-h-0 flex-1 overflow-y-auto',
            readOnly && 'rounded-xl',
            !readOnly && footer == null && 'rounded-b-xl',
            !readOnly && footer != null && 'rounded-b-none',
          )}
          onClick={() => editor?.commands.focus()}
        >
          {!content && (
            <div className="pointer-events-none absolute left-0 top-0 p-spacing-4">
              <span className="body-3 text-muted-foreground">{placeholder}</span>
            </div>
          )}
          <EditorContent
            editor={editor}
            className={clsx('artifact-rich-text-editor', editorContentClassName)}
          />
        </div>

        {footer != null ? (
          <div className="border-border px-spacing-2 py-spacing-2 flex shrink-0 justify-end rounded-b-xl border-t">
            {footer}
          </div>
        ) : null}

        {/* TipTap/ProseMirror internals need scoped CSS; utility classes cannot reach generated nodes. */}
        <style jsx global>{`
          .artifact-rich-text-editor .ProseMirror {
            min-height: 200px;
            outline: none;
            font-size: 14px;
            line-height: 1.6;
            color: var(--color-foreground);
            caret-color: var(--color-foreground);
            cursor: text;
          }
          .artifact-rich-text-editor .ProseMirror:focus {
            outline: none;
          }
          .artifact-rich-text-editor .ProseMirror p {
            margin: 8px 0;
          }
          .artifact-rich-text-editor .ProseMirror p:first-child {
            margin-top: 0;
          }
          .artifact-rich-text-editor .ProseMirror h1 {
            font-size: 1.5rem;
            font-weight: 700;
            line-height: 1.3;
            margin: 16px 0 8px;
          }
          .artifact-rich-text-editor .ProseMirror h2 {
            font-size: 1.25rem;
            font-weight: 600;
            line-height: 1.3;
            margin: 12px 0 8px;
          }
          .artifact-rich-text-editor .ProseMirror h3 {
            font-size: 1.1rem;
            font-weight: 500;
            line-height: 1.3;
            margin: 12px 0 8px;
          }
          .artifact-rich-text-editor .ProseMirror blockquote {
            border-left: 3px solid var(--color-border);
            padding-left: 16px;
            margin: 12px 0;
            color: var(--color-muted-foreground);
            font-style: italic;
          }
          .artifact-rich-text-editor .ProseMirror pre {
            background: var(--color-secondary);
            border-radius: 8px;
            padding: 12px;
            margin: 12px 0;
            overflow-x: auto;
          }
          .artifact-rich-text-editor .ProseMirror code {
            font-family: monospace;
            font-size: 0.85em;
            background: var(--color-secondary);
            padding: 0.2em 0.4em;
            border-radius: 3px;
          }
          .artifact-rich-text-editor .ProseMirror pre code {
            background: none;
            padding: 0;
          }
          .artifact-rich-text-editor .ProseMirror a {
            color: var(--color-primary);
            text-decoration: underline;
          }
          .artifact-rich-text-editor .ProseMirror a:hover {
            text-decoration: none;
          }
          .artifact-rich-text-editor .ProseMirror ul {
            list-style-type: disc;
            padding-left: 24px;
            margin: 8px 0;
          }
          .artifact-rich-text-editor .ProseMirror ol {
            list-style-type: decimal;
            padding-left: 24px;
            margin: 8px 0;
          }
          .artifact-rich-text-editor .ProseMirror li {
            margin: 4px 0;
          }
          .artifact-rich-text-editor .ProseMirror li p {
            margin: 0;
          }
          .artifact-rich-text-editor .ProseMirror img.blog-post-image {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 16px 0;
            display: block;
          }
          .artifact-rich-text-editor .ProseMirror img.blog-post-image.ProseMirror-selectednode {
            outline: 2px solid var(--color-primary);
            outline-offset: 2px;
          }
        `}</style>
      </div>
    )
  },
)
