import * as Sentry from "@sentry/node";

let gatewaySentryInited = false;

/**
 * Initialize Sentry for the OpenClaw gateway process when DSN is set.
 * Missions and Studio traces continue into OpenClaw via sentry-trace / baggage headers.
 */
export function ensureSentryGatewayInit(): boolean {
  if (gatewaySentryInited) {
    return Boolean(Sentry.getClient()?.getDsn());
  }
  gatewaySentryInited = true;
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) {
    return false;
  }
  const enabled =
    process.env.SENTRY_ENABLED === "true" ||
    process.env.NODE_ENV === "production" ||
    process.env.OPENCLAW_SENTRY === "true";
  if (!enabled) {
    return false;
  }
  Sentry.init({
    dsn,
    enabled: true,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 1),
    maxValueLength: Number(process.env.SENTRY_MAX_VALUE_LENGTH ?? 100_000),
    sendDefaultPii: false,
  });
  return true;
}
