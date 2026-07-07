export function isDocxDeliverable(deliverable: {
  mime_type?: string | null
  file_name?: string | null
  file_url?: string | null
}): boolean {
  return (
    deliverable.mime_type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    deliverable.file_name?.toLowerCase().endsWith('.docx') === true ||
    deliverable.file_url?.toLowerCase().includes('.docx') === true
  )
}

export function isPdfDeliverable(deliverable: {
  mime_type?: string | null
  file_name?: string | null
  file_url?: string | null
}): boolean {
  return (
    deliverable.mime_type === 'application/pdf' ||
    deliverable.file_name?.toLowerCase().endsWith('.pdf') === true ||
    deliverable.file_url?.toLowerCase().includes('.pdf') === true
  )
}
