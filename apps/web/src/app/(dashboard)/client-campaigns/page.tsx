import type { Metadata } from 'next'
import { ClientCampaignsPage } from '@/features/agency-clients/ClientCampaignsPage'

export const metadata: Metadata = { title: 'Client Campaigns | ROAS' }

export default function ClientCampaignsRoute() {
  return <ClientCampaignsPage />
}
