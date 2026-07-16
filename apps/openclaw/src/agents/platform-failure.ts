export type PlatformFailureClass =
  | "TRANSIENT"
  | "INPUT_INVALID"
  | "ACCESS_BLOCKED"
  | "CAPABILITY_UNAVAILABLE"
  | "SYSTEM_FAULT";

export type PlatformFailureAction = "continue" | "ask_input" | "defer" | "stop";

export type AgentToolErrorReliability = "high_confidence" | "probable" | "raw_unclassified";
export type AgentToolErrorEffectState =
  | "failed_before_effect"
  | "partial_effect"
  | "succeeded_delivery_failed"
  | "unknown_effect";
export type AgentToolRetryPolicyMode =
  | "retry_same_payload"
  | "retry_with_corrected_payload"
  | "retry_after_delay"
  | "do_not_retry_use_fallback"
  | "do_not_retry_needs_user_action"
  | "do_not_retry_terminal";

export type PlatformFailureEnvelope = {
  class: PlatformFailureClass;
  retryable: boolean;
  retryBudget: number;
  userMessageKey:
    | "tool.transient"
    | "tool.input_invalid"
    | "tool.access_blocked"
    | "tool.capability_unavailable"
    | "tool.system_fault";
  businessNextStepType: PlatformFailureAction;
  internalDetails?: string;
  success: false;
  error: string;
  error_code: string;
  error_class: string;
  reliability: AgentToolErrorReliability;
  effect_state: AgentToolErrorEffectState;
  retry_policy: {
    mode: AgentToolRetryPolicyMode;
    max_attempts: number;
    stop_after_same_error: boolean;
    reason: string;
    wait_ms?: number;
  };
  correction: {
    summary: string;
    next_tool_preference?: string[];
  };
  fallback: { summary: string; user_visible_progress?: string } | null;
  agent_diagnosis: string;
  agent_instruction: string;
  user_explanation: {
    intent: string;
    sentence: string;
  };
  forbidden_user_framing: string[];
  observability: {
    fingerprint: string;
    report_level: "info" | "warn" | "error";
  };
};

type ToolFailureParams = {
  errorText?: string;
};

type FailureSeed = Omit<
  PlatformFailureEnvelope,
  "success" | "error" | "internalDetails" | "observability"
> & {
  observability: Omit<PlatformFailureEnvelope["observability"], "fingerprint">;
};

const INPUT_INVALID_RE =
  /\b(required|missing|invalid|must be|must have|needs|requires|expected|provide either)\b/i;
const ACCESS_BLOCKED_RE =
  /\b(unauthorized|forbidden|permission denied|access denied|not allowed|denied|not visible|policy blocked|blocked by policy|auth failed)\b/i;
const TRANSIENT_RE =
  /\b(timeout|timed out|temporar(?:y|ily)|rate limit|overloaded|429|500|502|503|504|connection reset|econnreset|service unavailable)\b/i;
const CAPABILITY_UNAVAILABLE_RE =
  /\b(unknown tool|tool not (?:found|available)|not available|unsupported|unavailable|not installed|not configured)\b/i;

const FORBIDDEN_USER_FRAMING = [
  "platform error",
  "platform problem",
  "platform rendering issue",
  "infrastructure issue",
  "backend problem",
  "internal issue",
];

const FAILURE_SEEDS: Record<PlatformFailureClass, FailureSeed> = {
  INPUT_INVALID: {
    class: "INPUT_INVALID",
    retryable: false,
    retryBudget: 0,
    userMessageKey: "tool.input_invalid",
    businessNextStepType: "ask_input",
    error_code: "TOOL_VALIDATION_ERROR",
    error_class: "validation_error",
    reliability: "probable",
    effect_state: "failed_before_effect",
    retry_policy: {
      mode: "retry_with_corrected_payload",
      max_attempts: 1,
      stop_after_same_error: true,
      reason: "The tool input must be corrected before retrying.",
    },
    correction: {
      summary: "Correct the missing or invalid tool input before retrying.",
    },
    fallback: null,
    agent_diagnosis: "The tool call failed because required or valid input was missing.",
    agent_instruction:
      "Correct the tool input before retrying. Ask the user only when the missing value cannot be inferred from context.",
    user_explanation: {
      intent: "ask_for_missing_input",
      sentence: "I need one more detail to complete that step.",
    },
    forbidden_user_framing: FORBIDDEN_USER_FRAMING,
    observability: { report_level: "info" },
  },
  ACCESS_BLOCKED: {
    class: "ACCESS_BLOCKED",
    retryable: false,
    retryBudget: 0,
    userMessageKey: "tool.access_blocked",
    businessNextStepType: "defer",
    error_code: "TOOL_ACCESS_BLOCKED",
    error_class: "permission_denied",
    reliability: "probable",
    effect_state: "failed_before_effect",
    retry_policy: {
      mode: "do_not_retry_needs_user_action",
      max_attempts: 0,
      stop_after_same_error: true,
      reason: "The current user, session, or tool policy does not allow this operation.",
    },
    correction: {
      summary: "Stop this operation and explain the required access or policy change.",
    },
    fallback: null,
    agent_diagnosis: "The tool call was blocked by auth, access, or tool policy.",
    agent_instruction:
      "Do not retry the same operation. Explain the access limit plainly and continue with work that does not require that permission.",
    user_explanation: {
      intent: "explain_access_limit",
      sentence: "I could not complete that step with the current access.",
    },
    forbidden_user_framing: FORBIDDEN_USER_FRAMING,
    observability: { report_level: "warn" },
  },
  TRANSIENT: {
    class: "TRANSIENT",
    retryable: true,
    retryBudget: 2,
    userMessageKey: "tool.transient",
    businessNextStepType: "continue",
    error_code: "TOOL_TRANSIENT_FAILURE",
    error_class: "transient_backend_failure",
    reliability: "probable",
    effect_state: "unknown_effect",
    retry_policy: {
      mode: "retry_after_delay",
      max_attempts: 2,
      stop_after_same_error: true,
      wait_ms: 5000,
      reason: "A delayed retry can succeed, but repeated immediate retries reduce UX quality.",
    },
    correction: {
      summary: "Wait briefly, then retry within the retry budget or use an alternate route.",
    },
    fallback: {
      summary: "Continue with a useful alternative while the unavailable step recovers.",
      user_visible_progress: "I will continue with the next best step.",
    },
    agent_diagnosis: "The tool failed because of a transient service, network, or rate condition.",
    agent_instruction:
      "Retry only within the retry budget. If it repeats, stop retrying and continue with a useful fallback.",
    user_explanation: {
      intent: "continue_after_temporary_issue",
      sentence: "I hit a temporary issue on that step. I will continue with the next best step.",
    },
    forbidden_user_framing: FORBIDDEN_USER_FRAMING,
    observability: { report_level: "warn" },
  },
  CAPABILITY_UNAVAILABLE: {
    class: "CAPABILITY_UNAVAILABLE",
    retryable: false,
    retryBudget: 0,
    userMessageKey: "tool.capability_unavailable",
    businessNextStepType: "defer",
    error_code: "TOOL_CAPABILITY_UNAVAILABLE",
    error_class: "tool_unavailable",
    reliability: "probable",
    effect_state: "failed_before_effect",
    retry_policy: {
      mode: "do_not_retry_use_fallback",
      max_attempts: 0,
      stop_after_same_error: true,
      reason: "The selected capability is unavailable in the current runtime or policy.",
    },
    correction: {
      summary: "Choose an available tool or continue without this capability.",
    },
    fallback: {
      summary: "Use a different available path that still helps the user.",
      user_visible_progress: "I will continue with an alternative path.",
    },
    agent_diagnosis: "The requested tool or capability is not available in this runtime.",
    agent_instruction:
      "Do not retry the same unavailable tool. Pick an available alternative or explain the limitation briefly.",
    user_explanation: {
      intent: "use_alternative_capability",
      sentence: "I cannot run that step right now, so I will continue with an alternative path.",
    },
    forbidden_user_framing: FORBIDDEN_USER_FRAMING,
    observability: { report_level: "info" },
  },
  SYSTEM_FAULT: {
    class: "SYSTEM_FAULT",
    retryable: false,
    retryBudget: 0,
    userMessageKey: "tool.system_fault",
    businessNextStepType: "defer",
    error_code: "TOOL_SYSTEM_FAULT",
    error_class: "system_fault",
    reliability: "raw_unclassified",
    effect_state: "unknown_effect",
    retry_policy: {
      mode: "do_not_retry_use_fallback",
      max_attempts: 0,
      stop_after_same_error: true,
      reason: "The failure is not classified as correctable from the current tool payload.",
    },
    correction: {
      summary: "Stop this call and choose a different user-useful approach.",
    },
    fallback: {
      summary: "Use a different action path that still helps the user.",
      user_visible_progress: "I will try a different approach.",
    },
    agent_diagnosis: "The tool failed in a way that is not reliably correctable by retrying.",
    agent_instruction:
      "Do not retry the same payload. Try a different approach, and do not expose internal service labels to the user.",
    user_explanation: {
      intent: "use_alternate_approach",
      sentence: "I could not complete that step. I will try a different approach.",
    },
    forbidden_user_framing: FORBIDDEN_USER_FRAMING,
    observability: { report_level: "error" },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function classifyFailureClass(raw: string): PlatformFailureClass {
  const normalized = raw.toLowerCase();
  if (INPUT_INVALID_RE.test(normalized)) return "INPUT_INVALID";
  if (ACCESS_BLOCKED_RE.test(normalized)) return "ACCESS_BLOCKED";
  if (TRANSIENT_RE.test(normalized)) return "TRANSIENT";
  if (CAPABILITY_UNAVAILABLE_RE.test(normalized)) return "CAPABILITY_UNAVAILABLE";
  return "SYSTEM_FAULT";
}

function buildFailureEnvelope(raw: string, failureClass: PlatformFailureClass): PlatformFailureEnvelope {
  const seed = FAILURE_SEEDS[failureClass];
  const error = raw.trim() || seed.user_explanation.sentence;
  return {
    ...seed,
    success: false,
    error,
    internalDetails: error || undefined,
    observability: {
      fingerprint: `openclaw.${seed.error_code.toLowerCase()}`,
      ...seed.observability,
    },
  };
}

function legacyClassForErrorClass(errorClass: string): PlatformFailureClass {
  if (errorClass.includes("validation") || errorClass.includes("schema")) return "INPUT_INVALID";
  if (
    errorClass.includes("permission") ||
    errorClass.includes("access") ||
    errorClass.includes("auth")
  ) {
    return "ACCESS_BLOCKED";
  }
  if (
    errorClass.includes("rate") ||
    errorClass.includes("transient") ||
    errorClass.includes("unreachable")
  ) {
    return "TRANSIENT";
  }
  if (errorClass.includes("unavailable") || errorClass.includes("disconnected")) {
    return "CAPABILITY_UNAVAILABLE";
  }
  return "SYSTEM_FAULT";
}

function contractFromRecord(record: Record<string, unknown>): PlatformFailureEnvelope | null {
  if (typeof record.error_class !== "string") return null;
  const failureClass = legacyClassForErrorClass(record.error_class);
  const seed = FAILURE_SEEDS[failureClass];
  const retryPolicy = isRecord(record.retry_policy) ? record.retry_policy : seed.retry_policy;
  const userExplanation = isRecord(record.user_explanation)
    ? record.user_explanation
    : seed.user_explanation;
  const correction = isRecord(record.correction) ? record.correction : seed.correction;
  const observability = isRecord(record.observability) ? record.observability : {};
  const fallback =
    record.fallback === null || isRecord(record.fallback) ? record.fallback : seed.fallback;
  const error =
    typeof record.error === "string" && record.error.trim()
      ? record.error.trim()
      : seed.user_explanation.sentence;
  return {
    ...buildFailureEnvelope(error, failureClass),
    error,
    error_code: typeof record.error_code === "string" ? record.error_code : seed.error_code,
    error_class: record.error_class,
    reliability:
      record.reliability === "high_confidence" ||
      record.reliability === "probable" ||
      record.reliability === "raw_unclassified"
        ? record.reliability
        : seed.reliability,
    effect_state:
      typeof record.effect_state === "string"
        ? (record.effect_state as AgentToolErrorEffectState)
        : seed.effect_state,
    retry_policy: {
      ...seed.retry_policy,
      ...retryPolicy,
    } as PlatformFailureEnvelope["retry_policy"],
    correction: {
      ...seed.correction,
      ...correction,
    } as PlatformFailureEnvelope["correction"],
    fallback: fallback as PlatformFailureEnvelope["fallback"],
    agent_diagnosis:
      typeof record.agent_diagnosis === "string" ? record.agent_diagnosis : seed.agent_diagnosis,
    agent_instruction:
      typeof record.agent_instruction === "string"
        ? record.agent_instruction
        : seed.agent_instruction,
    user_explanation: {
      ...seed.user_explanation,
      ...userExplanation,
    } as PlatformFailureEnvelope["user_explanation"],
    forbidden_user_framing: Array.isArray(record.forbidden_user_framing)
      ? record.forbidden_user_framing.filter((entry): entry is string => typeof entry === "string")
      : seed.forbidden_user_framing,
    observability: {
      fingerprint:
        typeof observability.fingerprint === "string"
          ? observability.fingerprint
          : `openclaw.${String(record.error_class).toLowerCase()}`,
      report_level:
        observability.report_level === "info" ||
        observability.report_level === "warn" ||
        observability.report_level === "error"
          ? observability.report_level
          : seed.observability.report_level,
    },
    retryable:
      typeof record.retryable === "boolean"
        ? record.retryable
        : Number((retryPolicy as { max_attempts?: unknown }).max_attempts ?? seed.retryBudget) > 0,
    retryBudget: Number((retryPolicy as { max_attempts?: unknown }).max_attempts ?? seed.retryBudget),
  };
}

export function classifyToolFailure(params: ToolFailureParams): PlatformFailureEnvelope {
  const raw = (params.errorText ?? "").trim();
  return buildFailureEnvelope(raw, classifyFailureClass(raw));
}

export function extractToolFailureEnvelope(value: unknown): PlatformFailureEnvelope | null {
  if (!isRecord(value)) return null;
  const details = isRecord(value.details) ? contractFromRecord(value.details) : null;
  if (details) return details;
  const direct = contractFromRecord(value);
  if (direct) return direct;
  const content = Array.isArray(value.content) ? value.content : [];
  for (const item of content) {
    if (!isRecord(item) || typeof item.text !== "string") continue;
    try {
      const parsed = JSON.parse(item.text) as unknown;
      if (isRecord(parsed)) {
        const parsedContract = contractFromRecord(parsed);
        if (parsedContract) return parsedContract;
      }
    } catch {
      // Non-JSON text is still useful as a raw error, but not as a contract.
    }
  }
  return null;
}

export function toUserSafeFailureMessage(envelope: PlatformFailureEnvelope): string {
  return envelope.user_explanation.sentence;
}
