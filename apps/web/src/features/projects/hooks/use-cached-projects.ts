'use client'

import { createCachedResource } from '@/lib/cache/cached-resource'
import { listProjects } from '../services/projects.service'
import type { ProjectRepo } from '../types'

const projectsResource = createCachedResource<ProjectRepo[]>(listProjects, {
  ttlMs: 60_000,
})

export const cachedProjects = {
  invalidate: () => projectsResource.invalidate(),
  reload: () => projectsResource.reload(),
  peek: () => projectsResource.peek(),
  mutate: (next: ProjectRepo[] | ((prev: ProjectRepo[] | undefined) => ProjectRepo[])) =>
    projectsResource.mutate(next),
}

export function useCachedProjects(enabled = true) {
  return projectsResource.use({ enabled })
}
