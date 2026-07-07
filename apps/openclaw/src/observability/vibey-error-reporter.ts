import process from "node:process";
import { formatUncaughtError } from "../infra/errors.js";
import { registerUnhandledRejectionObserver } from "../infra/unhandled-rejections.js";
import { registerLogTransport, type LogTransportRecord } from "../logging/logger.js";

type OpenClawReportSeverity = "error" | "warn" | "critical";

export type VibeyObservabilityConfig = {
  url: string;
  token: string;
  timeoutMs: number;
};

export type OpenClawErrorReportInput = {
  feature: string;
  errorCode: string;
  message?: string;
  error?: unknown;
  severity?: OpenClawReportSeverity;
  context?: Record<string, unknown>;
  stack?: string | null;
};

const DEFAULT_TIMEOUT_MS = 1500;
const recentReports = new Map<string, number>();
let installed = false;

function text(value: unknown, max = 256): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, max) : null;
}

function positiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string") {
      return record.message;
    }
    if (typeof record.error === "string") {
      return record.error;
    }
  }
  return String(error ?? "Unknown OpenClaw error");
}

function errorStack(error: unknown): string | null {
  return error instanceof Error && error.stack ? error.stack : null;
}

function sanitizeContext(input: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(input ?? {}).slice(0, 32)) {
    const key = rawKey.slice(0, 80);
    if (typeof value === "string") {
      out[key] = value.slice(0, 1000);
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    } else if (typeof value === "boolean") {
      out[key] = value;
    } else if (value === null) {
      out[key] = null;
    }
  }
  return out;
}

function readLogLevel(record: LogTransportRecord): string | null {
  const meta = record._meta && typeof record._meta === "object" ? record._meta : null;
  const metaLevel =
    meta && "logLevelName" in meta ? text((meta as Record<string, unknown>).logLevelName, 32) : null;
  return (
    metaLevel ??
    text(record.logLevelName, 32) ??
    text(record.level, 32) ??
    text(record.severity, 32)
  )?.toLowerCase() ?? null;
}

function logRecordMessage(record: LogTransportRecord): string {
  const parts: string[] = [];
  for (const key of Object.keys(record).sort((a, b) => Number(a) - Number(b))) {
    if (!/^\d+$/u.test(key)) {
      continue;
    }
    const value = record[key];
    if (typeof value === "string") {
      parts.push(value);
    } else if (value instanceof Error) {
      parts.push(value.stack ?? value.message);
    } else if (value !== undefined) {
      parts.push(String(value));
    }
  }
  return parts.join(" ").slice(0, 4000) || "OpenClaw error log";
}

function shouldReportLogRecord(record: LogTransportRecord): boolean {
  const level = readLogLevel(record);
  return level === "error" || level === "fatal";
}

function dedupeKey(payload: ReturnType<typeof formatOpenClawErrorPayload>): string {
  return `${payload.error_code}:${payload.message}:${payload.stack ?? ""}`.slice(0, 1000);
}

function shouldSend(payload: ReturnType<typeof formatOpenClawErrorPayload>): boolean {
  const key = dedupeKey(payload);
  const now = Date.now();
  const last = recentReports.get(key) ?? 0;
  if (now - last < 60_000) {
    return false;
  }
  recentReports.set(key, now);
  for (const [entryKey, seenAt] of recentReports) {
    if (now - seenAt > 60_000) {
      recentReports.delete(entryKey);
    }
  }
  return true;
}

export function resolveVibeyObservabilityConfig(
  env: NodeJS.ProcessEnv = process.env,
): VibeyObservabilityConfig | null {
  const url = text(env.VIBEY_OBSERVABILITY_URL, 1000);
  const token = text(env.VIBEY_OBSERVABILITY_TOKEN, 1000);
  if (!url || !token) {
    return null;
  }
  return {
    url,
    token,
    timeoutMs: positiveInt(env.VIBEY_OBSERVABILITY_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  };
}

export function formatOpenClawErrorPayload(input: OpenClawErrorReportInput) {
  const stack = input.stack ?? errorStack(input.error);
  return {
    severity: input.severity ?? "error",
    feature: text(input.feature, 120) ?? "openclaw_runtime",
    error_code: text(input.errorCode, 120) ?? "OPENCLAW_RUNTIME_ERROR",
    message: text(input.message, 4000) ?? errorMessage(input.error).slice(0, 4000),
    stack,
    request_id: text(process.env.OPENCLAW_REQUEST_ID ?? process.env.VIBEY_REQUEST_ID, 256),
    trace_id: text(process.env.OPENCLAW_TRACE_ID ?? process.env.VIBEY_TRACE_ID, 128),
    message_id: text(process.env.OPENCLAW_MESSAGE_ID ?? process.env.VIBEY_MESSAGE_ID, 128),
    run_id: text(process.env.OPENCLAW_RUN_ID ?? process.env.VIBEY_RUN_ID, 256),
    conversation_id: text(
      process.env.OPENCLAW_CONVERSATION_ID ?? process.env.VIBEY_CONVERSATION_ID,
      128,
    ),
    commit_sha: text(process.env.VIBEY_COMMIT_SHA ?? process.env.GITHUB_SHA, 80),
    release_id: text(process.env.VIBEY_RELEASE_ID ?? process.env.RAILWAY_DEPLOYMENT_ID, 160),
    build_id: text(process.env.VIBEY_BUILD_ID, 160),
    context: {
      pid: process.pid,
      openclaw_profile: process.env.OPENCLAW_PROFILE ?? null,
      headless: process.env.OPENCLAW_HEADLESS ?? null,
      ...sanitizeContext(input.context),
    },
  };
}

export async function sendOpenClawErrorReport(
  input: OpenClawErrorReportInput,
  config: VibeyObservabilityConfig | null = resolveVibeyObservabilityConfig(),
): Promise<boolean> {
  if (!config) {
    return false;
  }
  const payload = formatOpenClawErrorPayload(input);
  if (!shouldSend(payload)) {
    return false;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  timer.unref?.();
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": config.token,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function reportOpenClawRuntimeError(input: OpenClawErrorReportInput): Promise<boolean> {
  return sendOpenClawErrorReport(input);
}

export function exitAfterOpenClawRuntimeReport(
  input: OpenClawErrorReportInput,
  code = 1,
): void {
  const config = resolveVibeyObservabilityConfig();
  if (!config) {
    process.exit(code);
    return;
  }

  let exited = false;
  const finish = () => {
    if (exited) {
      return;
    }
    exited = true;
    process.exit(code);
  };
  const timer = setTimeout(finish, config.timeoutMs + 100);
  timer.unref?.();
  void sendOpenClawErrorReport(input, config).finally(() => {
    clearTimeout(timer);
    finish();
  });
}

export function installVibeyErrorReporter(): void {
  const config = resolveVibeyObservabilityConfig();
  if (!config || installed) {
    return;
  }
  installed = true;

  registerLogTransport((record) => {
    if (!shouldReportLogRecord(record)) {
      return;
    }
    void sendOpenClawErrorReport(
      {
        feature: "openclaw_log",
        errorCode:
          readLogLevel(record) === "fatal" ? "OPENCLAW_FATAL_LOG" : "OPENCLAW_ERROR_LOG",
        message: logRecordMessage(record),
        severity: readLogLevel(record) === "fatal" ? "critical" : "error",
        context: { source: "log_transport" },
      },
      config,
    );
  });

  registerUnhandledRejectionObserver((reason, disposition) =>
    sendOpenClawErrorReport(
      {
        feature: "openclaw_process",
        errorCode: `OPENCLAW_UNHANDLED_REJECTION_${disposition.toUpperCase()}`,
        message: errorMessage(reason),
        error: reason,
        severity:
          disposition === "fatal" || disposition === "config" || disposition === "unhandled"
            ? "critical"
            : "error",
        context: {
          source: "unhandled_rejection",
          disposition,
          formatted: formatUncaughtError(reason),
        },
      },
      config,
    ),
  );
}
