import { AgencyClientRouteResolver } from '@/features/agency-clients/AgencyClientRouteResolver'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AgencyClientRouteResolver clientId={id} />
}
