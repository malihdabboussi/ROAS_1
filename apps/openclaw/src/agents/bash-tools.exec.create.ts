import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { ExecAsk, ExecHost } from "../infra/exec-approvals.js";
import type { ExecToolDefaults, ExecToolDetails } from "./bash-tools.exec.types.js";
import { maxAsk, minSecurity, resolveSafeBins } from "../infra/exec-approvals.js";
import {
  getShellPathFromLoginShell,
  resolveShellEnvFallbackTimeoutMs,
} from "../infra/shell-env.js";
import { parseAgentSessionKey, resolveAgentIdFromSessionKey } from "../routing/session-key.js";
import {
  DEFAULT_MAX_OUTPUT,
  DEFAULT_PATH,
  DEFAULT_PENDING_MAX_OUTPUT,
  applyPathPrepend,
  applyShellPath,
  execSchema,
  normalizeExecAsk,
  normalizeExecHost,
  normalizeExecSecurity,
  normalizePathPrepend,
  renderExecHostLabel,
  resolveApprovalRunningNoticeMs,
  validateHostEnv,
} from "./bash-tools.exec-runtime.js";
import {
  assertExecElevatedGates,
  logExecElevatedIfRequested,
  resolveElevatedMode,
} from "./bash-tools.exec.elevated-guard.js";
import { runExecGatewayApprovalsBranch } from "./bash-tools.exec.gateway.js";
import { runExecNodeBranch } from "./bash-tools.exec.node.js";
import { runExecToolLocalWithYield } from "./bash-tools.exec.run-local.js";
import {
  buildSandboxEnv,
  clampWithDefault,
  coerceEnv,
  readEnvInt,
  resolveSandboxWorkdir,
  resolveWorkdir,
} from "./bash-tools.shared.js";

export function createExecTool(
  defaults?: ExecToolDefaults,
  // oxlint-disable-next-line typescript/no-explicit-any
): AgentTool<any, ExecToolDetails> {
  const defaultBackgroundMs = clampWithDefault(
    defaults?.backgroundMs ?? readEnvInt("PI_BASH_YIELD_MS"),
    10_000,
    10,
    120_000,
  );
  const allowBackground = defaults?.allowBackground ?? true;
  const defaultTimeoutSec =
    typeof defaults?.timeoutSec === "number" && defaults.timeoutSec > 0
      ? defaults.timeoutSec
      : 1800;
  const defaultPathPrepend = normalizePathPrepend(defaults?.pathPrepend);
  const safeBins = resolveSafeBins(defaults?.safeBins);
  const notifyOnExit = defaults?.notifyOnExit !== false;
  const notifyOnExitEmptySuccess = defaults?.notifyOnExitEmptySuccess === true;
  const notifySessionKey = defaults?.sessionKey?.trim() || undefined;
  const approvalRunningNoticeMs = resolveApprovalRunningNoticeMs(defaults?.approvalRunningNoticeMs);
  const parsedAgentSession = parseAgentSessionKey(defaults?.sessionKey);
  const agentId =
    defaults?.agentId ??
    (parsedAgentSession ? resolveAgentIdFromSessionKey(defaults?.sessionKey) : undefined);

  return {
    name: "exec",
    label: "exec",
    description:
      "Execute shell commands with background continuation. Use yieldMs/background to continue later via process tool. Use pty=true for TTY-required commands (terminal UIs, coding agents).",
    parameters: execSchema,
    execute: async (_toolCallId, args, signal, onUpdate) => {
      const params = args as {
        command: string;
        workdir?: string;
        env?: Record<string, string>;
        yieldMs?: number;
        background?: boolean;
        timeout?: number;
        pty?: boolean;
        elevated?: boolean;
        host?: string;
        security?: string;
        ask?: string;
        node?: string;
      };

      if (!params.command) {
        throw new Error("Provide a command to start.");
      }

      const maxOutput = DEFAULT_MAX_OUTPUT;
      const pendingMaxOutput = DEFAULT_PENDING_MAX_OUTPUT;
      const warnings: string[] = [];
      let execCommandOverride: string | undefined;
      const backgroundRequested = params.background === true;
      const yieldRequested = typeof params.yieldMs === "number";
      if (!allowBackground && (backgroundRequested || yieldRequested)) {
        warnings.push("Warning: background execution is disabled; running synchronously.");
      }
      const yieldWindow = allowBackground
        ? backgroundRequested
          ? 0
          : clampWithDefault(
              params.yieldMs ?? defaultBackgroundMs,
              defaultBackgroundMs,
              10,
              120_000,
            )
        : null;
      const elevatedDefaults = defaults?.elevated;
      const { elevatedMode, elevatedRequested } = resolveElevatedMode(
        params.elevated,
        elevatedDefaults,
      );
      assertExecElevatedGates({ elevatedRequested, elevatedDefaults, defaults });
      logExecElevatedIfRequested(elevatedRequested, params.command);
      const configuredHost = defaults?.host ?? "sandbox";
      const requestedHost = normalizeExecHost(params.host) ?? null;
      let host: ExecHost = requestedHost ?? configuredHost;
      if (!elevatedRequested && requestedHost && requestedHost !== configuredHost) {
        throw new Error(
          `exec host not allowed (requested ${renderExecHostLabel(requestedHost)}; ` +
            `configure tools.exec.host=${renderExecHostLabel(configuredHost)} to allow).`,
        );
      }
      if (elevatedRequested) {
        host = "gateway";
      }

      const configuredSecurity = defaults?.security ?? (host === "sandbox" ? "deny" : "allowlist");
      const requestedSecurity = normalizeExecSecurity(params.security);
      let security = minSecurity(configuredSecurity, requestedSecurity ?? configuredSecurity);
      if (elevatedRequested && elevatedMode === "full") {
        security = "full";
      }
      const configuredAsk = defaults?.ask ?? "on-miss";
      const requestedAsk = normalizeExecAsk(params.ask);
      let ask: ExecAsk = maxAsk(configuredAsk, requestedAsk ?? configuredAsk);
      const bypassApprovals = elevatedRequested && elevatedMode === "full";
      if (bypassApprovals) {
        ask = "off";
      }

      const sandbox = host === "sandbox" ? defaults?.sandbox : undefined;
      const rawWorkdir = params.workdir?.trim() || defaults?.cwd || process.cwd();
      let workdir = rawWorkdir;
      let containerWorkdir = sandbox?.containerWorkdir;
      if (sandbox) {
        const resolved = await resolveSandboxWorkdir({
          workdir: rawWorkdir,
          sandbox,
          warnings,
        });
        workdir = resolved.hostWorkdir;
        containerWorkdir = resolved.containerWorkdir;
      } else {
        workdir = resolveWorkdir(rawWorkdir, warnings);
      }

      const baseEnv = coerceEnv(process.env);

      if (host !== "sandbox" && params.env) {
        validateHostEnv(params.env);
      }

      const mergedEnv = params.env ? { ...baseEnv, ...params.env } : baseEnv;

      const env = sandbox
        ? buildSandboxEnv({
            defaultPath: DEFAULT_PATH,
            paramsEnv: params.env,
            sandboxEnv: sandbox.env,
            containerWorkdir: containerWorkdir ?? sandbox.containerWorkdir,
          })
        : mergedEnv;

      if (!sandbox && host === "gateway" && !params.env?.PATH) {
        const shellPath = getShellPathFromLoginShell({
          env: process.env,
          timeoutMs: resolveShellEnvFallbackTimeoutMs(process.env),
        });
        applyShellPath(env, shellPath);
      }

      if (host === "node" && defaultPathPrepend.length > 0) {
        warnings.push(
          "Warning: tools.exec.pathPrepend is ignored for host=node. Configure PATH on the node host/service instead.",
        );
      } else {
        applyPathPrepend(env, defaultPathPrepend);
      }

      if (host === "node") {
        return runExecNodeBranch({
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
        });
      }

      if (host === "gateway" && !bypassApprovals) {
        const gatewayOutcome = await runExecGatewayApprovalsBranch({
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
        });
        if (gatewayOutcome.kind === "return") {
          return gatewayOutcome.result;
        }
        execCommandOverride = gatewayOutcome.execCommandOverride;
      }

      const effectiveTimeout =
        typeof params.timeout === "number" ? params.timeout : defaultTimeoutSec;

      return runExecToolLocalWithYield({
        params,
        defaults,
        workdir,
        env,
        sandbox,
        containerWorkdir,
        warnings,
        maxOutput,
        pendingMaxOutput,
        notifyOnExit,
        notifyOnExitEmptySuccess,
        notifySessionKey,
        execCommandOverride,
        allowBackground,
        yieldWindow,
        effectiveTimeout,
        signal,
        onUpdate,
      });
    },
  };
}

export const execTool = createExecTool();
