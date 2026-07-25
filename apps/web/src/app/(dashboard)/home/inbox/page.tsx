import { InboxFeed } from '@/components/notifications'

export default function HomeInboxPage() {
  return (
    <main className="p-spacing-4 flex min-h-0 flex-1">
      <h1 className="sr-only">INBOX</h1>
      <InboxFeed />
    </main>
  )
}
