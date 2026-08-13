import { AgencyClientDetailPage } from '@/features/agency-clients/AgencyClientDetailPage'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AgencyClientDetailPage clientId={id} />
}
