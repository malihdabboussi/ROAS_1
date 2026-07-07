export const FLOW_USER_TEMPLATE_NAME_PREFIX = 'Template · '

export function isUserFlowTemplate(flow: { name: string }): boolean {
  return flow.name.startsWith(FLOW_USER_TEMPLATE_NAME_PREFIX)
}

export function userFlowTemplateDisplayName(name: string): string {
  return name.startsWith(FLOW_USER_TEMPLATE_NAME_PREFIX)
    ? name.slice(FLOW_USER_TEMPLATE_NAME_PREFIX.length)
    : name
}
