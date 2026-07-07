import { hasPlatformToolsRuntimeGuidance, PLATFORM_TOOLS_DEFAULT_MD } from '@vibey/agent-policy'

export type AgentInstructionCustomClassification =
  | 'generated_placeholder'
  | 'platform_template_copy'
  | 'user_authored_custom'
  | 'org_override'

export type AgentInstructionCustomPolicyResult = {
  classification: AgentInstructionCustomClassification
  autoRepairAllowed: boolean
  reason: string
}

const GENERATED_PLACEHOLDER_PATTERNS = [
  /^#\s*TOOLS\.md\s*\n+\s*Use tools\.?\s*$/i,
  /^Use tools\.?$/i,
  /^#\s*TOOLS\.md\s*$/i,
]

function isGeneratedPlaceholder(content: string): boolean {
  const trimmed = content.trim()
  return (
    trimmed.length === 0 || GENERATED_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed))
  )
}

function isPlatformTemplateCopy(content: string): boolean {
  return (
    content.trim() === PLATFORM_TOOLS_DEFAULT_MD.trim() || hasPlatformToolsRuntimeGuidance(content)
  )
}

export function classifyAgentInstructionCustomRow(params: {
  content: string | null | undefined
  source?: string | null
  userId?: string | null
  orgId?: string | null
}): AgentInstructionCustomPolicyResult {
  const content = params.content ?? ''

  if (params.orgId) {
    return {
      classification: 'org_override',
      autoRepairAllowed: false,
      reason: 'org_override_rows_require_explicit_review',
    }
  }

  if (params.userId) {
    return {
      classification: 'user_authored_custom',
      autoRepairAllowed: false,
      reason: 'user_custom_rows_are_preserved',
    }
  }

  if (isGeneratedPlaceholder(content)) {
    return {
      classification: 'generated_placeholder',
      autoRepairAllowed: true,
      reason: 'generated_placeholder_can_be_replaced_with_platform_tools_template',
    }
  }

  if (
    params.source === 'system' ||
    params.source === 'library' ||
    isPlatformTemplateCopy(content)
  ) {
    return {
      classification: 'platform_template_copy',
      autoRepairAllowed: true,
      reason: 'platform_template_copy_can_receive_runtime_guidance_repairs',
    }
  }

  return {
    classification: 'user_authored_custom',
    autoRepairAllowed: false,
    reason: 'custom_content_does_not_match_a_generated_template',
  }
}
