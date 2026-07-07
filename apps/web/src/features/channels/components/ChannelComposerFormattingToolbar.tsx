import type { ReactNode } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from 'lucide-react'

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault()
        onClick()
      }}
      title={title}
      className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="bg-border mx-0.5 h-4 w-px" />
}

export function ChannelComposerFormattingToolbar({
  editor,
  linkInputOpen,
  onToggleLinkInput,
}: {
  editor: Editor
  linkInputOpen: boolean
  onToggleLinkInput: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold (⌘B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic (⌘I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Underline (⌘U)"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        title="Inline code"
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Bullet list"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Numbered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="Quote"
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        onClick={() => {
          if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run()
          } else {
            onToggleLinkInput()
          }
        }}
        active={editor.isActive('link') || linkInputOpen}
        title={editor.isActive('link') ? 'Remove link' : 'Add link'}
      >
        <Link2 className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  )
}
