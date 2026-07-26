import { InboxFeed } from '@/components/notifications'

export default function HomeInboxPage() {
  return (
    <main className="flex min-h-0 flex-1 overflow-hidden">
      <h1 className="sr-only">INBOX</h1>
      <InboxFeed presentation="page" />
    </main>
  )
}
