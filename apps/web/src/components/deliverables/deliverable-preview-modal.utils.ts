import type { BrainOption } from '@/components/deliverables/deliverable-preview-modal.types'

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function brainOptionBadge(option: BrainOption): { label: string; className: string } {
  if (option.type === 'campaign')
    return { label: 'campaign', className: 'badge-glass-purple' }
  if (option.type === 'agent') return { label: 'agent', className: 'badge-glass-orange' }
  return { label: 'user', className: 'badge-glass-green' }
}
