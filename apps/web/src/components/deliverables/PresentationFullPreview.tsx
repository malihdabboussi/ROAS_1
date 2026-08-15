'use client'

import { PresentationFullModeShell } from '@/features/studio/components/preview/PresentationFullModeShell'
import { PresentationPreview } from '@/features/studio/components/preview/PresentationPreview'

export function PresentationFullPreview({
  presentationId,
  name,
}: {
  presentationId: string
  name: string
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PresentationFullModeShell
        presentationId={presentationId}
        name={name}
        renderPreview={({
          mode,
          activeSlideIndex,
          onElementSelect,
          onSlideChange,
          onDrawingEvent,
        }) => (
          <PresentationPreview
            presentationId={presentationId}
            hideToolbar
            hideSandpackToolbar
            editMode={mode}
            activeSlideIndex={activeSlideIndex}
            onElementSelect={onElementSelect}
            onSlideChange={onSlideChange}
            onDrawingEvent={onDrawingEvent}
          />
        )}
      />
    </div>
  )
}
