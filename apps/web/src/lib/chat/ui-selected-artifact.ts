export interface UiSelectedArtifact {
  id: string
  type: string
  label?: string
  campaign_id?: string | null
  parent?: {
    type: string
    id: string
  } | null
}
