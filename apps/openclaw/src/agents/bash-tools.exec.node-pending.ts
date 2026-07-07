import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import crypto from "node:crypto";
import type { ExecAsk, ExecSecurity } from "../infra/exec-approvals.js";
import type { ExecToolDefaults, ExecToolDetails } from "./bash-tools.exec.types.js";
import {
  DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS,
  DEFAULT_APPROVAL_TIMEOUT_MS,
  createApprovalSlug,
  emitExecSystemEvent,
} from "./bash-tools.exec-runtime.js";
import { callGatewayTool } from "./tools/gateway.js";

export type ExecNodeInvokeParamsBuilder = (
  approvedByAsk: boolean,
  approvalDecision: "allow-once" | "allow-always" | null,
  runId?: string,
) => Record<string, unknown>;

export function runExecNodeApprovalPendingOrNull(params: {
  requiresAsk: boolean;
  nodeId: string;
  commandText: string;
  workdir: string;
  hostSecurity: ExecSecurity;
  hostAsk: ExecAsk;
  agentId: string | undefined;
  defaults: ExecToolDefaults | undefined;
  notifySessionKey: string | undefined;
  approvalRunningNoticeMs: number;
  invokeTimeoutMs: number;
  askFallback: ExecSecurity;
  warnings: string[];
  buildInvokeParams: ExecNodeInvokeParamsBuilder;
}): AgentToolResult<ExecToolDetails> | null {
  if (!params.requiresAsk) {
    return null;
  }

  const {
    nodeId,
    commandText,
    workdir,
    hostSecurity,
    hostAsk,
    agentId,
    defaults,
    notifySessionKey,
    approvalRunningNoticeMs,
    invokeTimeoutMs,
    askFallback,
    warnings,
    buildInvokeParams,
  } = params;

  const approvalId = crypto.randomUUID();
  const approvalSlug = createApprovalSlug(approvalId);
  const expiresAtMs = Date.now() + DEFAULT_APPROVAL_TIMEOUT_MS;
  const contextKey = `exec:${approvalId}`;
  const noticeSeconds = Math.max(1, Math.round(approvalRunningNoticeMs / 1000));
  const warningText = warnings.length ? `${warnings.join("\n")}\n\n` : "";

  void (async () => {
    let decision: string | null = null;
    try {
      const decisionResult = await callGatewayTool<{ decision: string }>(
        "exec.approval.request",
        { timeoutMs: DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS },
        {
          id: approvalId,
          command: commandText,
          cwd: workdir,
          host: "node",
          security: hostSecurity,
          ask: hostAsk,
          agentId,
          resolvedPath: undefined,
          sessionKey: defaults?.sessionKey,
          timeoutMs: DEFAULT_APPROVAL_TIMEOUT_MS,
        },
      );
      const decisionValue =
        decisionResult && typeof decisionResult === "object"
          ? (decisionResult as { decision?: unknown }).decision
          : undefined;
      decision = typeof decisionValue === "string" ? decisionValue : null;
    } catch {
      emitExecSystemEvent(
        `Exec denied (node=${nodeId} id=${approvalId}, approval-request-failed): ${commandText}`,
        { sessionKey: notifySessionKey, contextKey },
      );
      return;
    }

    let approvedByAsk = false;
    let approvalDecision: "allow-once" | "allow-always" | null = null;
    let deniedReason: string | null = null;

    if (decision === "deny") {
      deniedReason = "user-denied";
    } else if (!decision) {
      if (askFallback === "full") {
        approvedByAsk = true;
        approvalDecision = "allow-once";
      } else if (askFallback === "allowlist") {
        // Defer allowlist enforcement to the node host.
      } else {
        deniedReason = "approval-timeout";
      }
    } else if (decision === "allow-once") {
      approvedByAsk = true;
      approvalDecision = "allow-once";
    } else if (decision === "allow-always") {
      approvedByAsk = true;
      approvalDecision = "allow-always";
    }

    if (deniedReason) {
      emitExecSystemEvent(
        `Exec denied (node=${nodeId} id=${approvalId}, ${deniedReason}): ${commandText}`,
        { sessionKey: notifySessionKey, contextKey },
      );
      return;
    }

    let runningTimer: NodeJS.Timeout | null = null;
    if (approvalRunningNoticeMs > 0) {
      runningTimer = setTimeout(() => {
        emitExecSystemEvent(
          `Exec running (node=${nodeId} id=${approvalId}, >${noticeSeconds}s): ${commandText}`,
          { sessionKey: notifySessionKey, contextKey },
        );
      }, approvalRunningNoticeMs);
    }

    try {
      await callGatewayTool(
        "node.invoke",
        { timeoutMs: invokeTimeoutMs },
        buildInvokeParams(approvedByAsk, approvalDecision, approvalId),
      );
    } catch {
      emitExecSystemEvent(
        `Exec denied (node=${nodeId} id=${approvalId}, invoke-failed): ${commandText}`,
        { sessionKey: notifySessionKey, contextKey },
      );
    } finally {
      if (runningTimer) {
        clearTimeout(runningTimer);
      }
    }
  })();

  return {
    content: [
      {
        type: "text",
        text:
          `${warningText}Approval required (id ${approvalSlug}). ` +
          "Approve to run; updates will arrive after completion.",
      },
    ],
    details: {
      status: "approval-pending",
      approvalId,
      approvalSlug,
      expiresAtMs,
      host: "node",
      command: commandText,
      cwd: workdir,
      nodeId,
    },
  };
}
