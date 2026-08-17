import type { Metadata } from 'next'
import { ProgramsIndex } from './_components/ProgramsIndex'

export const metadata: Metadata = {
  title: 'Programs | ROAS',
}

export default function ProgramsPage() {
  return <ProgramsIndex />
}
