import { pageGraderStringValue, type PageGraderPackage } from './page-grader-brain-package-build'

export function pageGraderPipelineStageFromPackage(pkg: PageGraderPackage): string | null {
  return (
    pageGraderStringValue(
      pkg.client?.pipeline_stage,
      pkg.client?.status,
      pkg.client?.pipeline_status,
    ) || null
  )
}

export function pendingPageGraderExternalSource(input: {
  pkg: PageGraderPackage
  pageGraderClientId: string
  uniqueClientId: string
}) {
  return {
    page_grader: {
      client_id: input.pageGraderClientId || null,
      unique_client_id: input.uniqueClientId || null,
      package_version: pageGraderStringValue(input.pkg.envelope?.package_version) || '1',
      last_exported_at: pageGraderStringValue(input.pkg.envelope?.exported_at) || null,
      content_hash: null,
      last_sync_status: 'pending',
      pipeline_stage: pageGraderPipelineStageFromPackage(input.pkg),
      status: pageGraderStringValue(input.pkg.client?.status) || null,
    },
  }
}
