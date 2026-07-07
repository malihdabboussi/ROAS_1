'use client'

import type { ReadyEmployeesModalProps } from './ready-employees-modal.types'
import { ReadyEmployeesModalDesktop } from './ReadyEmployeesModalDesktop'
import { ReadyEmployeesModalMobile } from './ReadyEmployeesModalMobile'
import { useReadyEmployeesModal } from './use-ready-employees-modal'

export function ReadyEmployeesModal(props: ReadyEmployeesModalProps) {
  const { open, onClose } = props
  const state = useReadyEmployeesModal(props)

  if (!open) return null

  if (state.isMobileLib) {
    return <ReadyEmployeesModalMobile {...state} onClose={onClose} />
  }

  return <ReadyEmployeesModalDesktop {...state} onClose={onClose} />
}
