export const BRAIN_TRAIN_MODAL_EVENT = 'brain-train-modal'
export const BRAIN_QUEUE_REFRESH_EVENT = 'brain-queue-refresh'

export type BrainTrainModalDetail = {
  scopeId?: string
}

export function dispatchBrainTrainModal(detail?: BrainTrainModalDetail): void {
  window.dispatchEvent(new CustomEvent<BrainTrainModalDetail>(BRAIN_TRAIN_MODAL_EVENT, { detail }))
}

export function dispatchBrainQueueRefresh(): void {
  window.dispatchEvent(new CustomEvent(BRAIN_QUEUE_REFRESH_EVENT))
}
