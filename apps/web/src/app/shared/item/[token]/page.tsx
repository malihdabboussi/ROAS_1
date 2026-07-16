import type { Metadata } from 'next'
import { SharedItemView } from '@/features/spaces/components/shared/SharedItemView'

export const metadata: Metadata = {
  title: 'Shared Item | ROAS',
}

export default async function SharedItemPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <SharedItemView token={token} />
}
