import { DerivedEdge } from './DerivedEdge'
import { WorkflowEdge } from './WorkflowEdge'

export const edgeTypes = {
  default: WorkflowEdge,
  derived: DerivedEdge,
}
