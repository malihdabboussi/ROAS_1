import type { Metadata } from 'next'
import { ProjectPage } from '@/features/projects/components/ProjectPage'

export const metadata: Metadata = { title: 'Project | ROAS' }

interface ProjectRoutePageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectRoutePage({ params }: ProjectRoutePageProps) {
  const { id } = await params
  return <ProjectPage projectId={id} />
}
