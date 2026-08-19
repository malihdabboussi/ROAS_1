import type { Metadata } from 'next'
import { AgencyClientRouteResolver } from '@/features/agency-clients/AgencyClientRouteResolver'

export const metadata: Metadata = { title: 'Client | ROAS' }

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AgencyClientRouteResolver clientId={id} />
}
