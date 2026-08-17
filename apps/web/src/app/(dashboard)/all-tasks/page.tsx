import type { Metadata } from 'next'
import { AllTasksWorkspace } from './_components/AllTasksWorkspace'

export const metadata: Metadata = {
  title: 'All Tasks | ROAS',
}

export default function AllTasksPage() {
  return <AllTasksWorkspace />
}
