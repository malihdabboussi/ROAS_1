import type { Metadata } from 'next'
import { SpacesPageEntry } from './spaces-page-entry'

export const metadata: Metadata = { title: 'Spaces | ROAS' }

export default function SpacesPage() {
  return <SpacesPageEntry />
}
