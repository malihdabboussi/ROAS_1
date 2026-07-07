export function buildIntegrationUsageExample(
  service: string,
  actionSlug: string,
  parameters: Record<string, unknown>,
): Record<string, unknown> {
  const exampleParams: Record<string, string> = {}
  for (const [key, schema] of Object.entries(parameters)) {
    const s = schema && typeof schema === 'object' ? (schema as Record<string, unknown>) : {}
    exampleParams[key] = s.type === 'string' ? `<${key}>` : `<${key}>`
  }

  return {
    action: 'use_integration',
    data: {
      service,
      integration_action: actionSlug,
      params: exampleParams,
    },
  }
}
