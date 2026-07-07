import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { extractToolFailureEnvelope, type PlatformFailureEnvelope } from "./platform-failure.js";
import { normalizeToolName } from "./tool-policy.js";
import { jsonResult } from "./tools/common.js";
import {
  buildWorkflowPayloadFingerprint,
  resolveVerifiedRecoveryOptions,
  resolveWorkflowClass,
  resolveWorkflowToolAction,
  type VerifiedRecoveryOption,
  type WorkflowClass,
} from "./workflow-circuit-classifier.js";

export type WorkflowCircuitState = "closed" | "warning" | "open" | "half_open";

export type WorkflowCircuitContext = {
  conversationId?: string;
  agentId?: string;
  sessionKey?: string;
};

type WorkflowCircuitToolCall = WorkflowCircuitContext & {
  toolName: string;
  action?: string;
  params?: unknown;
  toolCallId?: string;
};

export type WorkflowCircuitOpenContract = PlatformFailureEnvelope & {
  workflow_circuit: {
    state: "open";
    reason: string;
    workflow_class: WorkflowClass;
    tool_name: string;
    action?: string;
    payload_fingerprint: string;
  };
  verified_recovery_options: VerifiedRecoveryOption[];
};

type FailureRecord = {
  blocksEquivalentPayload: boolean;
  failureFingerprint: string;
  payloadFingerprint: string;
};

type CircuitEntry = {
  state: WorkflowCircuitState;
  failures: FailureRecord[];
  openedReason?: string;
  halfOpenAttemptUsed?: boolean;
  updatedAt: number;
};

const CIRCUIT_TTL_MS = 30 * 60 * 1000;
const MAX_FAILURES_PER_WORKFLOW = 4;
const SAME_ERROR_OPEN_THRESHOLD = 3;
const circuits = new Map<string, CircuitEntry>();

function blocksEquivalentPayload(failure: PlatformFailureEnvelope): boolean {
  return (
    failure.retry_policy.max_attempts === 0 ||
    failure.retry_policy.mode.startsWith("do_not_retry") ||
    failure.retry_policy.mode === "retry_with_corrected_payload"
  );
}

function normalizeIdentity(context: WorkflowCircuitContext) {
  const conversationId =
    context.conversationId?.trim() || context.sessionKey?.trim() || "unknown_conversation";
  const agentId = context.agentId?.trim() || "unknown_agent";
  return { conversationId, agentId };
}

function getCircuitKey(context: WorkflowCircuitContext, workflowClass: WorkflowClass): string {
  const identity = normalizeIdentity(context);
  return `${identity.conversationId}|${identity.agentId}|${workflowClass}`;
}

function pruneExpired(now: number) {
  for (const [key, entry] of circuits) {
    if (now - entry.updatedAt > CIRCUIT_TTL_MS) {
      circuits.delete(key);
    }
  }
}

function userSentence(workflowClass: WorkflowClass): string {
  if (workflowClass === "presentation_render" || workflowClass === "artifact_export") {
    return "This export path is not working from chat right now. I can still help with verified alternatives.";
  }
  if (workflowClass === "artifact_publish" || workflowClass === "message_delivery") {
    return "This delivery path is not working from chat right now. I can still help with verified alternatives.";
  }
  return "This workflow is not working from chat right now. I can continue with work that does not depend on it or ask you to choose another verified path.";
}

function buildOpenContract(params: {
  call: WorkflowCircuitToolCall;
  reason: string;
  workflowClass: WorkflowClass;
  payloadFingerprint: string;
}): WorkflowCircuitOpenContract {
  const toolName = normalizeToolName(params.call.toolName || "tool");
  const action = resolveWorkflowToolAction(params.call);
  const sentence = userSentence(params.workflowClass);
  return {
    class: "SYSTEM_FAULT",
    retryable: false,
    retryBudget: 0,
    userMessageKey: "tool.system_fault",
    businessNextStepType: "defer",
    success: false,
    error: `Workflow circuit open for ${params.workflowClass}: ${params.reason}`,
    error_code: "WORKFLOW_CIRCUIT_OPEN",
    error_class: "workflow_circuit_open",
    reliability: "high_confidence",
    effect_state: "failed_before_effect",
    retry_policy: {
      mode: "do_not_retry_needs_user_action",
      max_attempts: 0,
      stop_after_same_error: true,
      reason: "Repeated or non-recoverable failures already occurred in this workflow class.",
    },
    correction: {
      summary: "Stop tool calls for this workflow class and move to a verified recovery option.",
    },
    fallback: null,
    agent_diagnosis:
      "The workflow circuit breaker blocked another equivalent or adjacent tool attempt.",
    agent_instruction:
      "Stop using tools for this workflow class. Do not try adjacent workarounds in the same class. Explain the limitation with user_explanation.sentence, offer only verified_recovery_options, and ask the user to choose when a recovery has tradeoffs.",
    user_explanation: {
      intent: "offer_verified_recovery_options",
      sentence,
    },
    forbidden_user_framing: [
      "platform error",
      "platform problem",
      "platform rendering issue",
      "infrastructure issue",
      "backend problem",
      "internal issue",
    ],
    observability: {
      fingerprint: `openclaw.workflow_circuit.${params.workflowClass}.${params.reason}`,
      report_level: "warn",
    },
    workflow_circuit: {
      state: "open",
      reason: params.reason,
      workflow_class: params.workflowClass,
      tool_name: toolName,
      action,
      payload_fingerprint: params.payloadFingerprint,
    },
    verified_recovery_options: resolveVerifiedRecoveryOptions(params.workflowClass),
  };
}

function openResult(contract: WorkflowCircuitOpenContract): AgentToolResult<unknown> {
  return jsonResult({
    status: "error",
    tool: contract.workflow_circuit.tool_name,
    ...contract,
  });
}

function openEntry(entry: CircuitEntry, reason: string, now: number) {
  entry.state = "open";
  entry.openedReason = reason;
  entry.updatedAt = now;
}

export function preflightWorkflowToolCall(call: WorkflowCircuitToolCall):
  | {
      allowed: true;
      state: WorkflowCircuitState;
      workflowClass: WorkflowClass;
      payloadFingerprint: string;
    }
  | {
      allowed: false;
      contract: WorkflowCircuitOpenContract;
      result: AgentToolResult<unknown>;
      state: "open";
      workflowClass: WorkflowClass;
      payloadFingerprint: string;
    } {
  const now = Date.now();
  pruneExpired(now);
  const workflowClass = resolveWorkflowClass(call);
  const payloadFingerprint = buildWorkflowPayloadFingerprint(call);
  const key = getCircuitKey(call, workflowClass);
  const entry = circuits.get(key);
  const block = (reason: string) => {
    const contract = buildOpenContract({ call, reason, workflowClass, payloadFingerprint });
    return {
      allowed: false as const,
      contract,
      result: openResult(contract),
      state: "open" as const,
      workflowClass,
      payloadFingerprint,
    };
  };
  if (!entry) return { allowed: true, state: "closed", workflowClass, payloadFingerprint };
  entry.updatedAt = now;
  if (entry.state === "open") {
    return block(entry.openedReason ?? "workflow_circuit_open");
  }
  if (entry.state === "half_open") {
    if (entry.halfOpenAttemptUsed) {
      openEntry(entry, "half_open_attempt_already_used", now);
      return block("half_open_attempt_already_used");
    }
    entry.halfOpenAttemptUsed = true;
    return { allowed: true, state: "half_open", workflowClass, payloadFingerprint };
  }
  const equivalentPayloadRepeat = entry.failures.some(
    (failure) =>
      failure.blocksEquivalentPayload && failure.payloadFingerprint === payloadFingerprint,
  );
  if (equivalentPayloadRepeat) {
    openEntry(entry, "non_retryable_equivalent_repeat", now);
    return block("non_retryable_equivalent_repeat");
  }
  return { allowed: true, state: entry.state, workflowClass, payloadFingerprint };
}

export function recordWorkflowToolResult(
  call: WorkflowCircuitToolCall,
  result: unknown,
): { state: WorkflowCircuitState; workflowClass: WorkflowClass } {
  const now = Date.now();
  pruneExpired(now);
  const workflowClass = resolveWorkflowClass(call);
  const key = getCircuitKey(call, workflowClass);
  const failure = extractToolFailureEnvelope(result);
  if (!failure) {
    circuits.delete(key);
    return { state: "closed", workflowClass };
  }

  const entry = circuits.get(key) ?? { state: "closed", failures: [], updatedAt: now };
  const failureFingerprint = failure.observability.fingerprint;
  const payloadFingerprint = buildWorkflowPayloadFingerprint(call);
  entry.failures.push({
    blocksEquivalentPayload: blocksEquivalentPayload(failure),
    failureFingerprint,
    payloadFingerprint,
  });
  entry.failures = entry.failures.slice(-12);
  const sameErrorCount = entry.failures.filter(
    (record) => record.failureFingerprint === failureFingerprint,
  ).length;
  const samePayloadCount = entry.failures.filter(
    (record) => record.payloadFingerprint === payloadFingerprint,
  ).length;

  if (entry.state === "half_open") {
    openEntry(entry, "half_open_recovery_failed", now);
  } else if (entry.failures.length >= MAX_FAILURES_PER_WORKFLOW) {
    openEntry(entry, "workflow_failure_budget_exceeded", now);
  } else if (sameErrorCount >= SAME_ERROR_OPEN_THRESHOLD) {
    openEntry(entry, "same_error_repeat", now);
  } else if (samePayloadCount >= 2 && blocksEquivalentPayload(failure)) {
    openEntry(entry, "non_retryable_equivalent_repeat", now);
  } else {
    entry.state = "warning";
    entry.updatedAt = now;
  }
  circuits.set(key, entry);
  return { state: entry.state, workflowClass };
}

export function resetWorkflowCircuitForUserAction(
  context: WorkflowCircuitContext,
  workflowClass?: WorkflowClass,
) {
  const now = Date.now();
  for (const [key, entry] of circuits) {
    const expectedPrefix = `${normalizeIdentity(context).conversationId}|${normalizeIdentity(context).agentId}|`;
    if (!key.startsWith(expectedPrefix)) continue;
    if (workflowClass && !key.endsWith(`|${workflowClass}`)) continue;
    entry.state = "half_open";
    entry.halfOpenAttemptUsed = false;
    entry.updatedAt = now;
  }
}

export function isWorkflowCircuitOpenFailure(failure: PlatformFailureEnvelope): boolean {
  return failure.error_code === "WORKFLOW_CIRCUIT_OPEN";
}

export function resetWorkflowCircuitsForTests() {
  circuits.clear();
}
