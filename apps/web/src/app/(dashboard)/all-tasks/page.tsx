import type { Metadata } from 'next'
import { AllTasksBoard } from '@/features/all-tasks/components/AllTasksBoard'

export const metadata: Metadata = {
  title: 'All Tasks | ROAS',
}

export default function AllTasksPage() {
  return <AllTasksBoard />
}
