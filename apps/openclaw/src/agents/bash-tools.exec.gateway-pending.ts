import crypto from "node:crypto";
import type { ExecAsk, ExecSecurity } from "../infra/exec-approvals.js";
import type { ExecGatewayBranchOutcome, ExecToolDefaults } from "./bash-tools.exec.types.js";
import {
  addAllowlistEntry,
  recordAllowlistUse,
  type ExecAllowlistEntry,
  type ExecApprovalsFile,
  evaluateShellAllowlist,
} from "../infra/exec-approvals.js";
import { markBackgrounded, tail } from "./bash-process-registry.js";
import {
  DEFAULT_APPROVAL_REQUEST_TIMEOUT_MS,
  DEFAULT_APPROVAL_TIMEOUT_MS,
  DEFAULT_NOTIFY_TAIL_CHARS,
  DEFAULT_MAX_OUTPUT,
  DEFAULT_PENDING_MAX_OUTPUT,
  createApprovalSlug,
  emitExecSystemEvent,
  normalizeNotifyOutput,
  runExecProcess,
  type ExecProcessHandle,
} from "./bash-tools.exec-runtime.js";
import { callGatewayTool } from "./tools/gateway.js";

type AllowlistEval = ReturnType<typeof evaluateShellAllowlist>;

export function runGatewayApprovalPendingOrNull(params: {
  requiresAsk: boolean;
  allowlistEval: AllowlistEval;
  allowlistMatches: ExecAllowlistEntry[];
  approvals: { file: ExecApprovalsFile; allowlist: ExecAllowlistEntry[] };
  defaults: ExecToolDefaults | undefined;
  params: { command: string; pty?: boolean; timeout?: number };
  agentId: string | undefined;
  workdir: string;
  env: Record<string, string>;
  warnings: string[];
  hostSecurity: ExecSecurity;
  hostAsk: ExecAsk;
  askFallback: ExecSecurity;
  notifySessionKey: string | undefined;
  approvalRunningNoticeMs: number;
  defaultTimeoutSec: number;
  sandbox: ExecToolDefaults["sandbox"];
}): ExecGatewayBranchOutcome | null {
  if (!params.requiresAsk) {
    return null;
  }

  const {
    allowlistEval,
    allowlistMatches,
    approvals,
    defaults,
    params: execParams,
    agentId,
    workdir,
    env,
    warnings,
    hostSecurity,
    hostAsk,
    askFallback,
    notifySessionKey,
    approvalRunningNoticeMs,
    defaultTimeoutSec,
    sandbox,
  } = params;

  const approvalId = crypto.randomUUID();
  const approvalSlug = createApprovalSlug(approvalId);
  const expiresAtMs = Date.now() + DEFAULT_APPROVAL_TIMEOUT_MS;
  const contextKey = `exec:${approvalId}`;
  const resolvedPath = allowlistEval.segments[0]?.resolution?.resolvedPath;
  const noticeSeconds = Math.max(1, Math.round(approvalRunningNoticeMs / 1000));
  const commandText = execParams.command;
  const effectiveTimeout =
    typeof execParams.timeout === "number" ? execParams.timeout : defaultTimeoutSec;
  const warningText = warnings.length ? `${warnings.join("\n")}\n\n` : "";

  const analysisOk = allowlistEval.analysisOk;
  const allowlistSatisfied =
    hostSecurity === "allowlist" && analysisOk ? allowlistEval.allowlistSatisfied : false;

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
          host: "gateway",
          security: hostSecurity,
          ask: hostAsk,
          agentId,
          resolvedPath,
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
        `Exec denied (gateway id=${approvalId}, approval-request-failed): ${commandText}`,
        { sessionKey: notifySessionKey, contextKey },
      );
      return;
    }

    let approvedByAsk = false;
    let deniedReason: string | null = null;

    if (decision === "deny") {
      deniedReason = "user-denied";
    } else if (!decision) {
      if (askFallback === "full") {
        approvedByAsk = true;
      } else if (askFallback === "allowlist") {
        if (!analysisOk || !allowlistSatisfied) {
          deniedReason = "approval-timeout (allowlist-miss)";
        } else {
          approvedByAsk = true;
        }
      } else {
        deniedReason = "approval-timeout";
      }
    } else if (decision === "allow-once") {
      approvedByAsk = true;
    } else if (decision === "allow-always") {
      approvedByAsk = true;
      if (hostSecurity === "allowlist") {
        for (const segment of allowlistEval.segments) {
          const pattern = segment.resolution?.resolvedPath ?? "";
          if (pattern) {
            addAllowlistEntry(approvals.file, agentId, pattern);
          }
        }
      }
    }

    if (hostSecurity === "allowlist" && (!analysisOk || !allowlistSatisfied) && !approvedByAsk) {
      deniedReason = deniedReason ?? "allowlist-miss";
    }

    if (deniedReason) {
      emitExecSystemEvent(
        `Exec denied (gateway id=${approvalId}, ${deniedReason}): ${commandText}`,
        { sessionKey: notifySessionKey, contextKey },
      );
      return;
    }

    if (allowlistMatches.length > 0) {
      const seen = new Set<string>();
      for (const match of allowlistMatches) {
        if (seen.has(match.pattern)) {
          continue;
        }
        seen.add(match.pattern);
        recordAllowlistUse(approvals.file, agentId, match, commandText, resolvedPath ?? undefined);
      }
    }

    let run: ExecProcessHandle | null = null;
    try {
      run = await runExecProcess({
        command: commandText,
        workdir,
        env,
        sandbox: undefined,
        containerWorkdir: null,
        usePty: execParams.pty === true && !sandbox,
        warnings,
        maxOutput: DEFAULT_MAX_OUTPUT,
        pendingMaxOutput: DEFAULT_PENDING_MAX_OUTPUT,
        notifyOnExit: false,
        notifyOnExitEmptySuccess: false,
        scopeKey: defaults?.scopeKey,
        sessionKey: notifySessionKey,
        timeoutSec: effectiveTimeout,
      });
    } catch {
      emitExecSystemEvent(`Exec denied (gateway id=${approvalId}, spawn-failed): ${commandText}`, {
        sessionKey: notifySessionKey,
        contextKey,
      });
      return;
    }

    markBackgrounded(run.session);

    let runningTimer: NodeJS.Timeout | null = null;
    if (approvalRunningNoticeMs > 0) {
      runningTimer = setTimeout(() => {
        emitExecSystemEvent(
          `Exec running (gateway id=${approvalId}, session=${run?.session.id}, >${noticeSeconds}s): ${commandText}`,
          { sessionKey: notifySessionKey, contextKey },
        );
      }, approvalRunningNoticeMs);
    }

    const outcome = await run.promise;
    if (runningTimer) {
      clearTimeout(runningTimer);
    }
    const output = normalizeNotifyOutput(tail(outcome.aggregated || "", DEFAULT_NOTIFY_TAIL_CHARS));
    const exitLabel = outcome.timedOut ? "timeout" : `code ${outcome.exitCode ?? "?"}`;
    const summary = output
      ? `Exec finished (gateway id=${approvalId}, session=${run.session.id}, ${exitLabel})\n${output}`
      : `Exec finished (gateway id=${approvalId}, session=${run.session.id}, ${exitLabel})`;
    emitExecSystemEvent(summary, { sessionKey: notifySessionKey, contextKey });
  })();

  return {
    kind: "return",
    result: {
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
        host: "gateway",
        command: execParams.command,
        cwd: workdir,
      },
    },
  };
}
