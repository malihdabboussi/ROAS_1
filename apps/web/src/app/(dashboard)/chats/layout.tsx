import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Server layout only exists to own <title>; the page itself is a client component.
export const metadata: Metadata = { title: 'Chats | ROAS' }

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
