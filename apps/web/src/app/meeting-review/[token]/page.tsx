import type { Metadata } from 'next'
import { PublicMeetingFollowUpReviewPage } from '@/features/home/components/PublicMeetingFollowUpReviewPage'

export const metadata: Metadata = { title: 'Meeting Follow-Up Review | ROAS' }

export default async function MeetingReviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <PublicMeetingFollowUpReviewPage token={token} />
}
