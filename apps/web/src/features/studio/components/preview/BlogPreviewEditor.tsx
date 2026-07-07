'use client'

/**
 * Blog Preview Editor — TipTap rich text for blog post body in studio artifacts.
 * Same behavior as EmailPreviewEditor; distinct surface class for blog context.
 */
import { forwardRef } from 'react'
import {
  EmailPreviewEditor,
  type EmailPreviewEditorProps,
  type EmailPreviewEditorRef,
} from './EmailPreviewEditor'

export type BlogPreviewEditorRef = EmailPreviewEditorRef

export type BlogPreviewEditorProps = Omit<EmailPreviewEditorProps, 'editorContentClassName'>

export const BlogPreviewEditor = forwardRef<BlogPreviewEditorRef, BlogPreviewEditorProps>(
  function BlogPreviewEditor({ placeholder = 'Start writing your post…', ...rest }, ref) {
    return (
      <EmailPreviewEditor
        ref={ref}
        {...rest}
        editorContentClassName="blog-preview-editor"
        placeholder={placeholder}
        showImage
      />
    )
  },
)
