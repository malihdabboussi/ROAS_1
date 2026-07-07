'use client'

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Upload } from 'lucide-react'

const PEEK_GAP = 8
const PEEK_CARD_W = 280

type PeekPayload = {
  top: number
  left: number
}

function computePeekLeft(anchor: DOMRect): number {
  if (typeof window === 'undefined') {
    return anchor.left - PEEK_CARD_W
  }
  const margin = 16
  const preferLeft = anchor.left - PEEK_CARD_W - PEEK_GAP
  if (preferLeft >= margin) {
    return preferLeft
  }
  const alternateRight = anchor.right + PEEK_GAP
  if (alternateRight + PEEK_CARD_W <= window.innerWidth - margin) {
    return alternateRight
  }
  return margin
}

function SkillMenuHoverPeekPortal({
  peek,
  onPeekEnter,
  onPeekLeave,
  children,
}: {
  peek: PeekPayload | null
  onPeekEnter: () => void
  onPeekLeave: () => void
  children: ReactNode
}) {
  if (typeof document === 'undefined' || !peek) {
    return null
  }

  return createPortal(
    <div
      className="z-dropdown surface-card border-border rounded-spacing-2 body-4 text-foreground p-spacing-3 pointer-events-auto w-[min(280px,calc(100vw-48px))] border shadow-xl"
      style={{
        position: 'fixed',
        left: peek.left,
        top: peek.top,
        transform: 'translateY(-50%)',
      }}
      onMouseEnter={onPeekEnter}
      onMouseLeave={onPeekLeave}
    >
      {children}
    </div>,
    document.body,
  )
}

export function SkillsMenuPeekList({ heading, items }: { heading: string; items: ReactNode[] }) {
  return (
    <>
      <p className="body-4 text-foreground mt-spacing-3 font-medium">{heading}</p>
      <ul className="body-4 text-muted-foreground mt-spacing-1 gap-spacing-2 flex flex-col">
        {items.map((item, index) => (
          <li key={index} className="gap-spacing-2 flex">
            <span className="text-foreground shrink-0 font-medium">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

export function SkillsMenuItemWithPeek({
  icon: Icon,
  label,
  peekTitle,
  peekDescription,
  peekExtra,
  disabled,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  label: ReactNode
  peekTitle: string
  peekDescription: ReactNode
  peekExtra?: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  const [peek, setPeek] = useState<PeekPayload | null>(null)
  const hideTimerRef = useRef<number | null>(null)

  const cancelHide = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const scheduleHide = () => {
    cancelHide()
    hideTimerRef.current = window.setTimeout(() => {
      setPeek(null)
      hideTimerRef.current = null
    }, 280)
  }

  useEffect(() => () => cancelHide(), [])

  const showPeek = (e: MouseEvent<HTMLElement>) => {
    cancelHide()
    const r = e.currentTarget.getBoundingClientRect()
    setPeek({
      top: r.top + r.height / 2,
      left: computePeekLeft(r),
    })
  }

  return (
    <>
      <SkillMenuHoverPeekPortal peek={peek} onPeekEnter={cancelHide} onPeekLeave={scheduleHide}>
        <p className="body-3 text-foreground font-semibold">{peekTitle}</p>
        <p className="body-4 text-muted-foreground mt-spacing-2">{peekDescription}</p>
        {peekExtra}
      </SkillMenuHoverPeekPortal>
      <button
        type="button"
        role="menuitem"
        disabled={disabled}
        className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left hover:bg-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onClick}
        onMouseEnter={showPeek}
        onMouseLeave={scheduleHide}
      >
        <Icon className="icon-sm shrink-0" />
        {label}
      </button>
    </>
  )
}

export function SkillsUploadMenuItem({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean
  onClick: () => void
  children?: ReactNode
}) {
  return (
    <SkillsMenuItemWithPeek
      icon={Upload}
      label={children ?? 'Upload skill'}
      disabled={disabled}
      onClick={onClick}
      peekTitle="Upload skill"
      peekDescription={
        <>
          Every skill needs a <span className="text-foreground font-mono">skill.md</span> file. That
          file tells your agent what to do.
        </>
      }
      peekExtra={
        <SkillsMenuPeekList
          heading="What you can upload"
          items={[
            <>
              <span className="text-foreground">Just skill.md</span>: upload the file by itself
            </>,
            <>
              <span className="text-foreground">skill.md + references</span>: select them together;
              extra text files land in{' '}
              <span className="text-foreground font-mono">references/</span>, PDFs are cleaned into
              formatted reference markdown
            </>,
            <>
              <span className="text-foreground">PDF or Word</span>: we&apos;ll extract the text and
              turn it into a skill
            </>,
          ]}
        />
      }
    />
  )
}
