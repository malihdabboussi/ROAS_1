import { type ApiClientOptions, Bot, HttpError } from "grammy";
import type { RetryConfig } from "../infra/retry.js";
import { loadConfig } from "../config/config.js";
import { isDiagnosticFlagEnabled } from "../infra/diagnostic-flags.js";
import { formatUncaughtError } from "../infra/errors.js";
import { createTelegramRetryRunner } from "../infra/retry-policy.js";
import { redactSensitiveText } from "../logging/redact.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { type ResolvedTelegramAccount, resolveTelegramAccount } from "./accounts.js";
import { withTelegramApiErrorLogging } from "./api-logging.js";
import { resolveTelegramFetch } from "./fetch.js";
import { makeProxyFetch } from "./proxy.js";
import { wrapTelegramChatNotFoundError } from "./send-utils.js";

const diagLogger = createSubsystemLogger("telegram/diagnostic");

export function createTelegramHttpLogger(cfg: ReturnType<typeof loadConfig>) {
  const enabled = isDiagnosticFlagEnabled("telegram.http", cfg);
  if (!enabled) {
    return () => {};
  }
  return (label: string, err: unknown) => {
    if (!(err instanceof HttpError)) {
      return;
    }
    const detail = redactSensitiveText(formatUncaughtError(err.error ?? err));
    diagLogger.warn(`telegram http error (${label}): ${detail}`);
  };
}

export function resolveTelegramClientOptions(
  account: ResolvedTelegramAccount,
): ApiClientOptions | undefined {
  const proxyUrl = account.config.proxy?.trim();
  const proxyFetch = proxyUrl ? makeProxyFetch(proxyUrl) : undefined;
  const fetchImpl = resolveTelegramFetch(proxyFetch, {
    network: account.config.network,
  });
  const timeoutSeconds =
    typeof account.config.timeoutSeconds === "number" &&
    Number.isFinite(account.config.timeoutSeconds)
      ? Math.max(1, Math.floor(account.config.timeoutSeconds))
      : undefined;
  return fetchImpl || timeoutSeconds
    ? {
        ...(fetchImpl ? { fetch: fetchImpl as unknown as ApiClientOptions["fetch"] } : {}),
        ...(timeoutSeconds ? { timeoutSeconds } : {}),
      }
    : undefined;
}

export function resolveToken(
  explicit: string | undefined,
  params: { accountId: string; token: string },
) {
  if (explicit?.trim()) {
    return explicit.trim();
  }
  if (!params.token) {
    throw new Error(
      `Telegram bot token missing for account "${params.accountId}" (set channels.telegram.accounts.${params.accountId}.botToken/tokenFile or TELEGRAM_BOT_TOKEN for default).`,
    );
  }
  return params.token.trim();
}

export type TelegramApiContext = {
  cfg: ReturnType<typeof loadConfig>;
  account: ResolvedTelegramAccount;
  api: Bot["api"];
};

export function resolveTelegramApiContext(opts: {
  token?: string;
  accountId?: string;
  api?: Bot["api"];
  cfg?: ReturnType<typeof loadConfig>;
}): TelegramApiContext {
  const cfg = opts.cfg ?? loadConfig();
  const account = resolveTelegramAccount({
    cfg,
    accountId: opts.accountId,
  });
  const token = resolveToken(opts.token, account);
  const client = resolveTelegramClientOptions(account);
  const api = opts.api ?? new Bot(token, client ? { client } : undefined).api;
  return { cfg, account, api };
}

export type TelegramRequestWithDiag = <T>(
  fn: () => Promise<T>,
  label?: string,
  options?: { shouldLog?: (err: unknown) => boolean },
) => Promise<T>;

export function createTelegramRequestWithDiag(params: {
  cfg: ReturnType<typeof loadConfig>;
  account: ResolvedTelegramAccount;
  retry?: RetryConfig;
  verbose?: boolean;
  shouldRetry?: (err: unknown) => boolean;
  useApiErrorLogging?: boolean;
}): TelegramRequestWithDiag {
  const request = createTelegramRetryRunner({
    retry: params.retry,
    configRetry: params.account.config.retry,
    verbose: params.verbose,
    ...(params.shouldRetry ? { shouldRetry: params.shouldRetry } : {}),
  });
  const logHttpError = createTelegramHttpLogger(params.cfg);
  return <T>(
    fn: () => Promise<T>,
    label?: string,
    options?: { shouldLog?: (err: unknown) => boolean },
  ) => {
    const runRequest = () => request(fn, label);
    const call =
      params.useApiErrorLogging === false
        ? runRequest()
        : withTelegramApiErrorLogging({
            operation: label ?? "request",
            fn: runRequest,
            ...(options?.shouldLog ? { shouldLog: options.shouldLog } : {}),
          });
    return call.catch((err) => {
      logHttpError(label ?? "request", err);
      throw err;
    });
  };
}

export function createRequestWithChatNotFound(params: {
  requestWithDiag: TelegramRequestWithDiag;
  chatId: string;
  input: string;
}) {
  return async <T>(fn: () => Promise<T>, label: string) =>
    params.requestWithDiag(fn, label).catch((err) => {
      throw wrapTelegramChatNotFoundError(err, {
        chatId: params.chatId,
        input: params.input,
      });
    });
}
