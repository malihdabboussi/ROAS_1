'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { CANVA_MESSAGES, openCanvaDesignFile } from '@/lib/canva'
import { createSpaceDocCanvaFile } from './export-space-doc'

export function useOpenSpaceDocInCanva(options: {
  canExport: boolean
  title: string
  docBody: string
  visualHtml?: string | null
  onOpening?: () => void
}) {
  const [openingCanva, setOpeningCanva] = useState(false)
  const { canExport, title, docBody, visualHtml, onOpening } = options

  const openInCanva = useCallback(async () => {
    if (!canExport || openingCanva) return
    setOpeningCanva(true)
    onOpening?.()
    try {
      const result = await openCanvaDesignFile({
        title,
        createFile: () =>
          createSpaceDocCanvaFile({
            title,
            docBody,
            visualHtml,
          }),
      })
      if (result.status === 'opened') toast.success(CANVA_MESSAGES.OPENING)
      else toast.message(CANVA_MESSAGES.CONNECTING)
    } catch {
      toast.error(CANVA_MESSAGES.IMPORT_FAILED)
    } finally {
      setOpeningCanva(false)
    }
  }, [canExport, docBody, onOpening, openingCanva, title, visualHtml])

  return { openingCanva, openInCanva }
}
