import type { Metadata } from 'next'
import { DelegationDeskWorkspace } from '@/features/spaces/containers/DelegationDeskWorkspace'

export const metadata: Metadata = { title: 'Delegation Desk | ROAS' }

export default function HomeDelegationDeskPage() {
  return <DelegationDeskWorkspace />
}
