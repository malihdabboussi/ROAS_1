import type {
  ChangeEventHandler,
  ClipboardEventHandler,
  FocusEventHandler,
  KeyboardEventHandler,
  ReactEventHandler,
  ReactNode,
  Ref,
  UIEventHandler,
} from 'react'

interface ChatInputTextareaProps {
  textareaRef: Ref<HTMLTextAreaElement>
  highlightBackdropRef: Ref<HTMLDivElement>
  value: string
  showHighlight: boolean
  renderHighlightBackdrop: (text: string) => ReactNode
  composerPadX: string
  compact?: boolean
  placeholder: string
  disabled: boolean
  onFocus: FocusEventHandler<HTMLTextAreaElement>
  onChange: ChangeEventHandler<HTMLTextAreaElement>
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>
  onPaste: ClipboardEventHandler<HTMLTextAreaElement>
  onSelect: ReactEventHandler<HTMLTextAreaElement>
  onScroll: UIEventHandler<HTMLTextAreaElement>
}

export function ChatInputTextarea({
  textareaRef,
  highlightBackdropRef,
  value,
  showHighlight,
  renderHighlightBackdrop,
  composerPadX,
  compact,
  placeholder,
  disabled,
  onFocus,
  onChange,
  onKeyDown,
  onPaste,
  onSelect,
  onScroll,
}: ChatInputTextareaProps) {
  return (
    <div className={`relative flex-1 ${composerPadX} ${compact ? 'pt-1.5' : 'pt-3'}`}>
      {showHighlight ? (
        <div
          ref={highlightBackdropRef}
          aria-hidden
          className={`body-2 pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words ${composerPadX} ${compact ? 'pt-1.5' : 'pt-3'}`}
          style={{ color: 'transparent' }}
        >
          {renderHighlightBackdrop(value)}
        </div>
      ) : null}
      <textarea
        ref={textareaRef}
        data-chat-input
        value={value}
        onFocus={onFocus}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onSelect={onSelect}
        onScroll={onScroll}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={`body-2 text-foreground caret-accent placeholder:text-muted-foreground relative w-full resize-none bg-transparent focus:outline-none ${compact ? 'max-h-[200px] min-h-[24px]' : 'max-h-[200px] min-h-[60px]'}`}
      />
    </div>
  )
}
