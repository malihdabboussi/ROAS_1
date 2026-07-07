export const draft = (
  name: string,
  trigger: Record<string, unknown>,
  actions: Record<string, unknown>[],
): Record<string, unknown> => ({
  is_draft: true,
  name,
  enabled: false,
  trigger,
  actions,
})
