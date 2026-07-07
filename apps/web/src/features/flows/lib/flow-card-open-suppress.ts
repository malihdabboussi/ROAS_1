let suppressUntil = 0
let suppressFlowId: string | null = null

/** Block card clicks that would open a flow (e.g. after delete confirm dismisses). */
export function suppressFlowCardOpen(flowId: string, ms = 600) {
  suppressFlowId = flowId
  suppressUntil = Date.now() + ms
}

export function isFlowCardOpenSuppressed(flowId: string): boolean {
  if (Date.now() > suppressUntil) {
    suppressFlowId = null
    return false
  }
  return suppressFlowId === flowId
}
