/**
 * Classify gateway errors for structured responses to upstream callers.
 * Keep messages short; strip paths and stack noise in sanitize.
 */
export type GatewayErrorClass = "provider_error" | "tool_error" | "internal_error";

export type ClassifiedGatewayError = {
  code: GatewayErrorClass;
  message: string;
  retryable: boolean;
};

function sanitizeMessage(raw: string): string {
  const s = raw.replace(/\s+/g, " ").trim().slice(0, 400);
  return s.length > 0 ? s : "internal error";
}

export function classifyOpenClawGatewayError(err: unknown): ClassifiedGatewayError {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : String(err);
  const lc = msg.toLowerCase();

  if (
    /\b429\b/.test(msg) ||
    /rate\s*limit|too many requests|overloaded|capacity|quota|throttl/i.test(msg) ||
    /anthropic.*5\d\d|openai.*5\d\d|provider.*5\d\d/i.test(msg)
  ) {
    return {
      code: "provider_error",
      message: sanitizeMessage(msg),
      retryable: true,
    };
  }

  if (
    /web_fetch|web_search|tool\s*execution|tool_error|invalid tool/i.test(lc) ||
    /zod|validation failed|tool input/i.test(lc)
  ) {
    return {
      code: "tool_error",
      message: sanitizeMessage(msg),
      retryable: false,
    };
  }

  return {
    code: "internal_error",
    message: sanitizeMessage(msg),
    retryable: true,
  };
}
