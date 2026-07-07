import { ProjectPage } from '@/features/projects/components/ProjectPage'

interface ProjectRoutePageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectRoutePage({ params }: ProjectRoutePageProps) {
  const { id } = await params
  return <ProjectPage projectId={id} />
}
