import type { Metadata } from 'next'
import { AdminAiUsageDashboard } from '@/features/admin-ai-usage'

export const metadata: Metadata = {
  title: 'AI Usage | ROAS',
}

export default function AdminAiUsagePage() {
  return <AdminAiUsageDashboard />
}
