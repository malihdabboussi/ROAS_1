'use client'

import type { ReactNode } from 'react'

export function CompareWaitlistButton(props: {
  className?: string
  children?: ReactNode
  initialNotes?: string
}) {
  return (
    <a
      href="https://app.vibey.im/login"
      className={props.className}
    >
      {props.children ?? 'Get Early Access'}
    </a>
  )
}
