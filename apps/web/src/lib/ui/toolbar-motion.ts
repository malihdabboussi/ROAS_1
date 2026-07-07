export const TOOLBAR_DOCK_SLOT_SPRING = {
  type: 'spring' as const,
  stiffness: 460,
  damping: 40,
  mass: 0.78,
}

export const ARTIFACT_SLIDE_PREVIEW_TOOLBAR_MOTION = {
  duration: 0.22,
  ease: [0.33, 1, 0.68, 1] as [number, number, number, number],
}
