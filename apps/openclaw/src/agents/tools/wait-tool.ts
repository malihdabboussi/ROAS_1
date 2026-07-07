import type { AgentToolResult, AgentToolUpdateCallback } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "./common.js";

const MAX_SECONDS = 120;
const MIN_SECONDS = 1;
const HEARTBEAT_INTERVAL_MS = 10_000;

const WaitToolSchema = Type.Object({
  seconds: Type.Number({
    description: "Seconds to wait (1-120). Chain multiple calls for longer waits.",
    minimum: MIN_SECONDS,
    maximum: MAX_SECONDS,
  }),
  reason: Type.Optional(
    Type.String({
      description: "Why waiting — shown in UI timeline (e.g. 'Video rendering')",
    }),
  ),
});

export function createWaitTool(): AnyAgentTool {
  return {
    label: "Wait",
    name: "wait",
    description: `Pause execution for N seconds before continuing. Use to poll async jobs (e.g. wait 30s then check video status). Max ${MAX_SECONDS}s per call; chain multiple calls for longer waits. Emits periodic heartbeats to keep the connection alive.`,
    parameters: WaitToolSchema,
    execute: async (
      _toolCallId: string,
      args: { seconds?: number; reason?: string },
      signal?: AbortSignal,
      onUpdate?: AgentToolUpdateCallback,
    ): Promise<AgentToolResult<unknown>> => {
      const raw = typeof args.seconds === "number" ? args.seconds : 30;
      const seconds = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(raw)));
      const reason = typeof args.reason === "string" ? args.reason.trim() : "";
      const totalMs = seconds * 1000;
      const startedAt = Date.now();

      const emitProgress = () => {
        if (!onUpdate) {
          return;
        }
        const elapsedMs = Date.now() - startedAt;
        const elapsedSec = Math.round(elapsedMs / 1000);
        onUpdate({
          content: [{ type: "text", text: `Waiting... ${elapsedSec}s / ${seconds}s` }],
          details: {
            elapsed_seconds: elapsedSec,
            total_seconds: seconds,
            ...(reason ? { reason } : {}),
          },
        });
      };

      let elapsed = 0;
      while (elapsed < totalMs) {
        if (signal?.aborted) {
          const actualSeconds = Math.round((Date.now() - startedAt) / 1000);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ waited_seconds: actualSeconds, aborted: true }, null, 2),
              },
            ],
            details: { waited_seconds: actualSeconds, aborted: true },
          };
        }

        const remaining = totalMs - elapsed;
        const chunk = Math.min(HEARTBEAT_INTERVAL_MS, remaining);

        await new Promise<void>((resolve, _reject) => {
          const timer = setTimeout(resolve, chunk);
          if (signal) {
            const onAbort = () => {
              clearTimeout(timer);
              resolve();
            };
            signal.addEventListener("abort", onAbort, { once: true });
          }
        });

        elapsed += chunk;
        emitProgress();
      }

      const actualSeconds = Math.round((Date.now() - startedAt) / 1000);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ waited_seconds: actualSeconds, resumed: true }, null, 2),
          },
        ],
        details: { waited_seconds: actualSeconds, resumed: true },
      };
    },
  };
}
