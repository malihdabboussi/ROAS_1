import type { ReactNode } from 'react'

type TaskDetailPresentationShellProps = {
  children: ReactNode
  onClose: () => void
  presentation: 'modal' | 'panel'
}

export function TaskDetailPresentationShell({
  children,
  onClose,
  presentation,
}: TaskDetailPresentationShellProps) {
  const isPanel = presentation === 'panel'

  return (
    <div
      className={
        isPanel
          ? 'flex h-full min-h-0 w-full flex-col overflow-hidden'
          : 'z-modal-content fixed inset-0 flex items-center justify-center'
      }
    >
      {!isPanel ? <div className="bg-modal-overlay absolute inset-0" onClick={onClose} /> : null}
      <div
        data-dropzone
        className={
          isPanel
            ? 'surface-card flex h-full min-h-0 w-full flex-col overflow-hidden'
            : 'surface-card border-border container-modal-task-detail rounded-spacing-4 pt-spacing-4 pb-spacing-6 pl-spacing-6 pr-spacing-6 relative z-10 flex flex-col overflow-hidden border shadow-xl'
        }
      >
        {children}
      </div>
    </div>
  )
}
