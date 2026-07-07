export type BrainNodeTransferScopeResolution =
  | { type: 'campaign'; campaignId: string }
  | { type: 'brain'; brainId: string; agentId: string | null }

export interface BrainNodeTransferExtractedRecords {
  memories: Array<Record<string, unknown>>
  snapshots: Array<Record<string, unknown>>
  skSources: Array<Record<string, unknown>>
  skEntries: Array<Record<string, unknown>>
  campaignNodes: Array<Record<string, unknown>>
  sourceSkSourceId: string | null
}
