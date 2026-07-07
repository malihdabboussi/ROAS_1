import { DeliverableEntityPreviewAdapter } from '@/components/deliverables/DeliverableEntityPreviewAdapter'
import type { DeliverableEntityPreviewRenderer } from '@/components/deliverables/deliverable-preview-modal.types'

export const renderDeliverableEntityPreview: DeliverableEntityPreviewRenderer = ({
  deliverableType,
  entityId,
}) => <DeliverableEntityPreviewAdapter deliverableType={deliverableType} entityId={entityId} />
