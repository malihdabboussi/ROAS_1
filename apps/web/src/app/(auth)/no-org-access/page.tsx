import type { Metadata } from 'next'
import { NoOrgAccessContent } from './NoOrgAccessContent'

export const metadata: Metadata = {
  title: 'No Organization Access | ROAS',
}

export default function NoOrgAccessPage() {
  return <NoOrgAccessContent />
}
