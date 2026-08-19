import type { Metadata } from 'next'
import { AgencyClientsPage } from '@/features/agency-clients/AgencyClientsPage'

export const metadata: Metadata = { title: 'Clients | ROAS' }

export default function ClientsPage() {
  return <AgencyClientsPage />
}
