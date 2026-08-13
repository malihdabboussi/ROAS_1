export const QUICK_MISSIONS_OPEN_EVENT = 'vibey:open-quick-missions'

export function dispatchOpenQuickMissions(playbookKey?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(QUICK_MISSIONS_OPEN_EVENT, {
      detail: { playbookKey: playbookKey ?? null },
    }),
  )
}
