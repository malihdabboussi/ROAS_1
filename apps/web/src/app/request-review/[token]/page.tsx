import type { Metadata } from 'next'
import { WorkRequestReviewPage } from '@/features/work-requests'

export const metadata: Metadata = {
  title: 'Service Request Review | ROAS',
}

export default async function RequestReviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <WorkRequestReviewPage token={token} />
}
