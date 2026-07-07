#!/usr/bin/env node
import module from "node:module";
import process from "node:process";
import { loadConfig, resolveGatewayPort } from "./config/config.js";
import { formatUncaughtError } from "./infra/errors.js";
import { installUnhandledRejectionHandler } from "./infra/unhandled-rejections.js";
import { enableConsoleCapture } from "./logging.js";
import {
  exitAfterOpenClawRuntimeReport,
  installVibeyErrorReporter,
} from "./observability/vibey-error-reporter.js";

type GatewayLike = {
  close: (opts?: { reason?: string; restartExpectedMs?: number | null }) => Promise<void>;
};

let lastBootMarkMs = 0;
function logBootTiming(stage: string): void {
  const nowMs = performance.now();
  const stepMs = nowMs - lastBootMarkMs;
  lastBootMarkMs = nowMs;
  console.log(
    `[gateway.boot] stage=${stage} stepMs=${stepMs.toFixed(1)} totalMs=${nowMs.toFixed(1)}`,
  );
}

enableConsoleCapture();
installVibeyErrorReporter();
installUnhandledRejectionHandler();
process.on("uncaughtException", (error) => {
  console.error("[openclaw] Uncaught exception:", formatUncaughtError(error));
  exitAfterOpenClawRuntimeReport({
    feature: "openclaw_process",
    errorCode: "OPENCLAW_UNCAUGHT_EXCEPTION",
    message: error.message,
    error,
    severity: "critical",
    context: { source: "uncaught_exception", entrypoint: "gateway-headless" },
  });
});

logBootTiming("entrypoint_ready");

if (module.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
  try {
    module.enableCompileCache();
  } catch {
    // Ignore errors.
  }
}
logBootTiming("compile_cache_checked");

const cfg = loadConfig();
logBootTiming("config_loaded");
const port = resolveGatewayPort(cfg);
logBootTiming("port_resolved");
const server: GatewayLike =
  process.env.OPENCLAW_HEADLESS_HTTP_ONLY === "1"
    ? await (async () => {
        const { startHeadlessHttpGatewayServer } =
          await import("./gateway/headless-http-server.js");
        logBootTiming("headless_http_server_module_loaded");
        return await startHeadlessHttpGatewayServer(port);
      })()
    : await (async () => {
        const { startGatewayServer } = await import("./gateway/server.js");
        logBootTiming("full_gateway_server_module_loaded");
        return await startGatewayServer(port);
      })();
logBootTiming("server_started");

let closing = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    if (closing) {
      return;
    }
    closing = true;
    void server
      .close({ reason: `signal:${signal}` })
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
  });
}
