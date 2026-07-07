export const BRAIN_IMAGE_PICKER_EVENT = 'brain-image-picker'

export type BrainImagePickerAction = 'upload' | 'library' | 'generate' | 'remove'

export type BrainImagePickerDetail = {
  brainId: string
  brainLabel: string
  scopeId?: string
  action: BrainImagePickerAction
}

export function dispatchBrainImagePicker(detail: BrainImagePickerDetail): void {
  window.dispatchEvent(
    new CustomEvent<BrainImagePickerDetail>(BRAIN_IMAGE_PICKER_EVENT, { detail }),
  )
}
