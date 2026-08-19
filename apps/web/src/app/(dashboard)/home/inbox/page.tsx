import type { Metadata } from 'next'
import { HomeInboxWorkspace } from '@/features/home/containers/HomeInboxWorkspace'

export const metadata: Metadata = { title: 'Inbox | ROAS' }

export default function HomeInboxPage() {
  return <HomeInboxWorkspace />
}
