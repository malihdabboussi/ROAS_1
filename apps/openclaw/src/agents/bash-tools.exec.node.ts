import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import crypto from "node:crypto";
import type { ExecAsk, ExecSecurity } from "../infra/exec-approvals.js";
import type { ExecToolDefaults, ExecToolDetails } from "./bash-tools.exec.types.js";
import {
  evaluateShellAllowlist,
  maxAsk,
  minSecurity,
  requiresExecApproval,
  resolveExecApprovals,
  resolveExecApprovalsFromFile,
  type ExecApprovalsFile,
} from "../infra/exec-approvals.js";
import { buildNodeShellCommand } from "../infra/node-shell.js";
import { runExecNodeApprovalPendingOrNull } from "./bash-tools.exec.node-pending.js";
import { callGatewayTool } from "./tools/gateway.js";
import { listNodes, resolveNodeIdFromList } from "./tools/nodes-utils.js";

export type ExecNodeBranchParams = {
  defaults: ExecToolDefaults | undefined;
  params: {
    command: string;
    workdir?: string;
    env?: Record<string, string>;
    timeout?: number;
    node?: string;
    pty?: boolean;
  };
  agentId: string | undefined;
  security: ExecSecurity;
  ask: ExecAsk;
  workdir: string;
  env: Record<string, string>;
  warnings: string[];
  defaultTimeoutSec: number;
  approvalRunningNoticeMs: number;
  notifySessionKey: string | undefined;
};

export async function runExecNodeBranch(
  ctx: ExecNodeBranchParams,
): Promise<AgentToolResult<ExecToolDetails>> {
  const {
    defaults,
    params,
    agentId,
    security,
    ask,
    workdir,
    env,
    warnings,
    defaultTimeoutSec,
    approvalRunningNoticeMs,
    notifySessionKey,
  } = ctx;

  const approvals = resolveExecApprovals(agentId, { security, ask });
  const hostSecurity = minSecurity(security, approvals.agent.security);
  const hostAsk = maxAsk(ask, approvals.agent.ask);
  const askFallback = approvals.agent.askFallback;
  if (hostSecurity === "deny") {
    throw new Error("exec denied: host=node security=deny");
  }
  const boundNode = defaults?.node?.trim();
  const requestedNode = params.node?.trim();
  if (boundNode && requestedNode && boundNode !== requestedNode) {
    throw new Error(`exec node not allowed (bound to ${boundNode})`);
  }
  const nodeQuery = boundNode || requestedNode;
  const nodes = await listNodes({});
  if (nodes.length === 0) {
    throw new Error(
      "exec host=node requires a paired node (none available). This requires a companion app or node host.",
    );
  }
  let nodeId: string;
  try {
    nodeId = resolveNodeIdFromList(nodes, nodeQuery, !nodeQuery);
  } catch (err) {
    if (!nodeQuery && String(err).includes("node required")) {
      throw new Error(
        "exec host=node requires a node id when multiple nodes are available (set tools.exec.node or exec.node).",
        { cause: err },
      );
    }
    throw err;
  }
  const nodeInfo = nodes.find((entry) => entry.nodeId === nodeId);
  const supportsSystemRun = Array.isArray(nodeInfo?.commands)
    ? nodeInfo?.commands?.includes("system.run")
    : false;
  if (!supportsSystemRun) {
    throw new Error(
      "exec host=node requires a node that supports system.run (companion app or node host).",
    );
  }
  const argv = buildNodeShellCommand(params.command, nodeInfo?.platform);

  const nodeEnv = params.env ? { ...params.env } : undefined;
  const baseAllowlistEval = evaluateShellAllowlist({
    command: params.command,
    allowlist: [],
    safeBins: new Set(),
    cwd: workdir,
    env,
    platform: nodeInfo?.platform,
  });
  let analysisOk = baseAllowlistEval.analysisOk;
  let allowlistSatisfied = false;
  if (hostAsk === "on-miss" && hostSecurity === "allowlist" && analysisOk) {
    try {
      const approvalsSnapshot = await callGatewayTool<{ file: string }>(
        "exec.approvals.node.get",
        { timeoutMs: 10_000 },
        { nodeId },
      );
      const approvalsFile =
        approvalsSnapshot && typeof approvalsSnapshot === "object"
          ? approvalsSnapshot.file
          : undefined;
      if (approvalsFile && typeof approvalsFile === "object") {
        const resolved = resolveExecApprovalsFromFile({
          file: approvalsFile as ExecApprovalsFile,
          agentId,
          overrides: { security: "allowlist" },
        });
        const allowlistEval = evaluateShellAllowlist({
          command: params.command,
          allowlist: resolved.allowlist,
          safeBins: new Set(),
          cwd: workdir,
          env,
          platform: nodeInfo?.platform,
        });
        allowlistSatisfied = allowlistEval.allowlistSatisfied;
        analysisOk = allowlistEval.analysisOk;
      }
    } catch {
      // Fall back to requiring approval if node approvals cannot be fetched.
    }
  }
  const requiresAsk = requiresExecApproval({
    ask: hostAsk,
    security: hostSecurity,
    analysisOk,
    allowlistSatisfied,
  });
  const commandText = params.command;
  const invokeTimeoutMs = Math.max(
    10_000,
    (typeof params.timeout === "number" ? params.timeout : defaultTimeoutSec) * 1000 + 5_000,
  );
  const buildInvokeParams = (
    approvedByAsk: boolean,
    approvalDecision: "allow-once" | "allow-always" | null,
    runId?: string,
  ) =>
    ({
      nodeId,
      command: "system.run",
      params: {
        command: argv,
        rawCommand: params.command,
        cwd: workdir,
        env: nodeEnv,
        timeoutMs: typeof params.timeout === "number" ? params.timeout * 1000 : undefined,
        agentId,
        sessionKey: defaults?.sessionKey,
        approved: approvedByAsk,
        approvalDecision: approvalDecision ?? undefined,
        runId: runId ?? undefined,
      },
      idempotencyKey: crypto.randomUUID(),
    }) satisfies Record<string, unknown>;

  const pending = runExecNodeApprovalPendingOrNull({
    requiresAsk,
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
  });
  if (pending) {
    return pending;
  }

  const startedAt = Date.now();
  const raw = await callGatewayTool(
    "node.invoke",
    { timeoutMs: invokeTimeoutMs },
    buildInvokeParams(false, null),
  );
  const payload =
    raw && typeof raw === "object" ? (raw as { payload?: unknown }).payload : undefined;
  const payloadObj =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const stdout = typeof payloadObj.stdout === "string" ? payloadObj.stdout : "";
  const stderr = typeof payloadObj.stderr === "string" ? payloadObj.stderr : "";
  const errorText = typeof payloadObj.error === "string" ? payloadObj.error : "";
  const success = typeof payloadObj.success === "boolean" ? payloadObj.success : false;
  const exitCode = typeof payloadObj.exitCode === "number" ? payloadObj.exitCode : null;
  return {
    content: [
      {
        type: "text",
        text: stdout || stderr || errorText || "",
      },
    ],
    details: {
      status: success ? "completed" : "failed",
      exitCode,
      durationMs: Date.now() - startedAt,
      aggregated: [stdout, stderr, errorText].filter(Boolean).join("\n"),
      cwd: workdir,
    } satisfies ExecToolDetails,
  };
}
