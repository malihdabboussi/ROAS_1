'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export function WaitlistAwareLink(props: {
  href: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link href={props.href} className={props.className}>
      {props.children}
    </Link>
  )
}
