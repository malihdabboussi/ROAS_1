import type { ExecAsk, ExecSecurity } from "../infra/exec-approvals.js";
import type { ExecGatewayBranchOutcome, ExecToolDefaults } from "./bash-tools.exec.types.js";
import {
  evaluateShellAllowlist,
  maxAsk,
  minSecurity,
  recordAllowlistUse,
  requiresExecApproval,
  resolveExecApprovals,
  resolveSafeBins,
  buildSafeBinsShellCommand,
  buildSafeShellCommand,
} from "../infra/exec-approvals.js";
import { runGatewayApprovalPendingOrNull } from "./bash-tools.exec.gateway-pending.js";

export type ExecGatewayBranchParams = {
  defaults: ExecToolDefaults | undefined;
  params: {
    command: string;
    pty?: boolean;
    timeout?: number;
  };
  agentId: string | undefined;
  security: ExecSecurity;
  ask: ExecAsk;
  workdir: string;
  env: Record<string, string>;
  warnings: string[];
  safeBins: ReturnType<typeof resolveSafeBins>;
  defaultTimeoutSec: number;
  approvalRunningNoticeMs: number;
  notifySessionKey: string | undefined;
  sandbox: ExecToolDefaults["sandbox"];
};

export async function runExecGatewayApprovalsBranch(
  ctx: ExecGatewayBranchParams,
): Promise<ExecGatewayBranchOutcome> {
  const {
    defaults,
    params,
    agentId,
    security,
    ask,
    workdir,
    env,
    warnings,
    safeBins,
    defaultTimeoutSec,
    approvalRunningNoticeMs,
    notifySessionKey,
    sandbox,
  } = ctx;

  const approvals = resolveExecApprovals(agentId, { security, ask });
  const hostSecurity = minSecurity(security, approvals.agent.security);
  const hostAsk = maxAsk(ask, approvals.agent.ask);
  const askFallback = approvals.agent.askFallback;
  if (hostSecurity === "deny") {
    throw new Error("exec denied: host=gateway security=deny");
  }
  const allowlistEval = evaluateShellAllowlist({
    command: params.command,
    allowlist: approvals.allowlist,
    safeBins,
    cwd: workdir,
    env,
    platform: process.platform,
  });
  const allowlistMatches = allowlistEval.allowlistMatches;
  const analysisOk = allowlistEval.analysisOk;
  const allowlistSatisfied =
    hostSecurity === "allowlist" && analysisOk ? allowlistEval.allowlistSatisfied : false;
  const requiresAsk = requiresExecApproval({
    ask: hostAsk,
    security: hostSecurity,
    analysisOk,
    allowlistSatisfied,
  });

  const pendingOutcome = runGatewayApprovalPendingOrNull({
    requiresAsk,
    allowlistEval,
    allowlistMatches,
    approvals,
    defaults,
    params,
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
  });
  if (pendingOutcome) {
    return pendingOutcome;
  }

  if (hostSecurity === "allowlist" && (!analysisOk || !allowlistSatisfied)) {
    throw new Error("exec denied: allowlist miss");
  }

  let execCommandOverride: string | undefined;

  if (
    hostSecurity === "allowlist" &&
    analysisOk &&
    allowlistSatisfied &&
    allowlistEval.segmentSatisfiedBy.some((by) => by === "safeBins")
  ) {
    const safe = buildSafeBinsShellCommand({
      command: params.command,
      segments: allowlistEval.segments,
      segmentSatisfiedBy: allowlistEval.segmentSatisfiedBy,
      platform: process.platform,
    });
    if (!safe.ok || !safe.command) {
      const fallback = buildSafeShellCommand({
        command: params.command,
        platform: process.platform,
      });
      if (!fallback.ok || !fallback.command) {
        throw new Error(`exec denied: safeBins sanitize failed (${safe.reason ?? "unknown"})`);
      }
      warnings.push("Warning: safeBins hardening used fallback quoting due to parser mismatch.");
      execCommandOverride = fallback.command;
    } else {
      warnings.push(
        "Warning: safeBins hardening disabled glob/variable expansion for stdin-only segments.",
      );
      execCommandOverride = safe.command;
    }
  }

  if (allowlistMatches.length > 0) {
    const seen = new Set<string>();
    for (const match of allowlistMatches) {
      if (seen.has(match.pattern)) {
        continue;
      }
      seen.add(match.pattern);
      recordAllowlistUse(
        approvals.file,
        agentId,
        match,
        params.command,
        allowlistEval.segments[0]?.resolution?.resolvedPath,
      );
    }
  }

  return { kind: "continue", execCommandOverride };
}
