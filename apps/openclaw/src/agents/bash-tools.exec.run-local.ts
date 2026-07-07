import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { ExecToolDefaults, ExecToolDetails } from "./bash-tools.exec.types.js";
import type { BashSandboxConfig } from "./bash-tools.shared.js";
import { markBackgrounded } from "./bash-process-registry.js";
import { runExecProcess } from "./bash-tools.exec-runtime.js";

export type ExecRunLocalParams = {
  params: {
    command: string;
    pty?: boolean;
  };
  defaults: ExecToolDefaults | undefined;
  workdir: string;
  env: Record<string, string>;
  sandbox: BashSandboxConfig | undefined;
  containerWorkdir: string | null | undefined;
  warnings: string[];
  maxOutput: number;
  pendingMaxOutput: number;
  notifyOnExit: boolean;
  notifyOnExitEmptySuccess: boolean;
  notifySessionKey: string | undefined;
  execCommandOverride: string | undefined;
  allowBackground: boolean;
  yieldWindow: number | null;
  effectiveTimeout: number;
  signal: AbortSignal | undefined;
  onUpdate?: (partialResult: AgentToolResult<ExecToolDetails>) => void;
};

export function runExecToolLocalWithYield(
  ctx: ExecRunLocalParams,
): Promise<AgentToolResult<ExecToolDetails>> {
  const {
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
  } = ctx;

  const getWarningText = () => (warnings.length ? `${warnings.join("\n")}\n\n` : "");
  const usePty = params.pty === true && !sandbox;

  return runExecProcess({
    command: params.command,
    execCommand: execCommandOverride,
    workdir,
    env,
    sandbox,
    containerWorkdir,
    usePty,
    warnings,
    maxOutput,
    pendingMaxOutput,
    notifyOnExit,
    notifyOnExitEmptySuccess,
    scopeKey: defaults?.scopeKey,
    sessionKey: notifySessionKey,
    timeoutSec: effectiveTimeout,
    onUpdate,
  }).then((run) => {
    let yielded = false;
    let yieldTimer: NodeJS.Timeout | null = null;

    const onAbortSignal = () => {
      if (yielded || run.session.backgrounded) {
        return;
      }
      run.kill();
    };

    if (signal?.aborted) {
      onAbortSignal();
    } else if (signal) {
      signal.addEventListener("abort", onAbortSignal, { once: true });
    }

    return new Promise<AgentToolResult<ExecToolDetails>>((resolve, reject) => {
      const resolveRunning = () =>
        resolve({
          content: [
            {
              type: "text",
              text: `${getWarningText()}Command still running (session ${run.session.id}, pid ${
                run.session.pid ?? "n/a"
              }). Use process (list/poll/log/write/kill/clear/remove) for follow-up.`,
            },
          ],
          details: {
            status: "running",
            sessionId: run.session.id,
            pid: run.session.pid ?? undefined,
            startedAt: run.startedAt,
            cwd: run.session.cwd,
            tail: run.session.tail,
          },
        });

      const onYieldNow = () => {
        if (yieldTimer) {
          clearTimeout(yieldTimer);
        }
        if (yielded) {
          return;
        }
        yielded = true;
        markBackgrounded(run.session);
        resolveRunning();
      };

      if (allowBackground && yieldWindow !== null) {
        if (yieldWindow === 0) {
          onYieldNow();
        } else {
          yieldTimer = setTimeout(() => {
            if (yielded) {
              return;
            }
            yielded = true;
            markBackgrounded(run.session);
            resolveRunning();
          }, yieldWindow);
        }
      }

      run.promise
        .then((outcome) => {
          if (yieldTimer) {
            clearTimeout(yieldTimer);
          }
          if (yielded || run.session.backgrounded) {
            return;
          }
          if (outcome.status === "failed") {
            reject(new Error(outcome.reason ?? "Command failed."));
            return;
          }
          resolve({
            content: [
              {
                type: "text",
                text: `${getWarningText()}${outcome.aggregated || "(no output)"}`,
              },
            ],
            details: {
              status: "completed",
              exitCode: outcome.exitCode ?? 0,
              durationMs: outcome.durationMs,
              aggregated: outcome.aggregated,
              cwd: run.session.cwd,
            },
          });
        })
        .catch((err) => {
          if (yieldTimer) {
            clearTimeout(yieldTimer);
          }
          if (yielded || run.session.backgrounded) {
            return;
          }
          reject(err as Error);
        });
    });
  });
}
