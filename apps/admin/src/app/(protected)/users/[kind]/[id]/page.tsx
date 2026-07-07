import { notFound } from 'next/navigation'
import { AccountDetailContainer } from '@/features/users'

interface AccountDetailPageProps {
  params: Promise<{ kind: string; id: string }>
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { kind, id } = await params

  if (kind !== 'user' && kind !== 'org') {
    notFound()
  }

  return <AccountDetailContainer kind={kind} id={id} />
}
