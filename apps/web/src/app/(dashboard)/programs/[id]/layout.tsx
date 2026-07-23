import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Program | ROAS',
}

export default function ProgramLayout({ children }: { children: ReactNode }) {
  return children
}
