import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { MessageReference } from '../../types'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'

interface UseChatInputAttachmentRemovalOptions {
  setAttachedArtifacts: Dispatch<SetStateAction<AttachedArtifact[]>>
  setAttachedReferences: Dispatch<SetStateAction<MessageReference[]>>
}

export function useChatInputAttachmentRemoval({
  setAttachedArtifacts,
  setAttachedReferences,
}: UseChatInputAttachmentRemovalOptions) {
  const handleArtifactRemove = useCallback(
    (id: string) => {
      setAttachedArtifacts((prev) => prev.filter((artifact) => artifact.id !== id))
      setAttachedReferences((prev) =>
        prev.filter((reference) => {
          return (
            reference.id !== id ||
            (reference.kind !== 'artifact' && reference.kind !== 'conversation')
          )
        }),
      )
    },
    [setAttachedArtifacts, setAttachedReferences],
  )

  const handleReferenceRemove = useCallback(
    (ref: MessageReference) => {
      setAttachedReferences((prev) =>
        prev.filter((reference) => !(reference.id === ref.id && reference.kind === ref.kind)),
      )
    },
    [setAttachedReferences],
  )

  return {
    handleArtifactRemove,
    handleReferenceRemove,
  }
}
