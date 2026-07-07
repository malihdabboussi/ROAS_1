import type { ExecElevatedDefaults, ExecToolDefaults } from "./bash-tools.exec.types.js";
import { logInfo } from "../logger.js";
import { truncateMiddle } from "./bash-tools.shared.js";

export function resolveElevatedMode(
  paramsElevated: boolean | undefined,
  elevatedDefaults: ExecElevatedDefaults | undefined,
): { elevatedMode: "full" | "ask" | "off"; elevatedRequested: boolean } {
  const elevatedAllowed = Boolean(elevatedDefaults?.enabled && elevatedDefaults.allowed);
  const elevatedDefaultMode =
    elevatedDefaults?.defaultLevel === "full"
      ? "full"
      : elevatedDefaults?.defaultLevel === "ask"
        ? "ask"
        : elevatedDefaults?.defaultLevel === "on"
          ? "ask"
          : "off";
  const effectiveDefaultMode = elevatedAllowed ? elevatedDefaultMode : "off";
  const elevatedMode =
    typeof paramsElevated === "boolean"
      ? paramsElevated
        ? elevatedDefaultMode === "full"
          ? "full"
          : "ask"
        : "off"
      : effectiveDefaultMode;
  const elevatedRequested = elevatedMode !== "off";
  return { elevatedMode, elevatedRequested };
}

export function assertExecElevatedGates(params: {
  elevatedRequested: boolean;
  elevatedDefaults: ExecElevatedDefaults | undefined;
  defaults: ExecToolDefaults | undefined;
}): void {
  const { elevatedRequested, elevatedDefaults, defaults } = params;
  if (!elevatedRequested) {
    return;
  }
  if (!elevatedDefaults?.enabled || !elevatedDefaults.allowed) {
    const runtime = defaults?.sandbox ? "sandboxed" : "direct";
    const gates: string[] = [];
    const contextParts: string[] = [];
    const provider = defaults?.messageProvider?.trim();
    const sessionKey = defaults?.sessionKey?.trim();
    if (provider) {
      contextParts.push(`provider=${provider}`);
    }
    if (sessionKey) {
      contextParts.push(`session=${sessionKey}`);
    }
    if (!elevatedDefaults?.enabled) {
      gates.push("enabled (tools.elevated.enabled / agents.list[].tools.elevated.enabled)");
    } else {
      gates.push(
        "allowFrom (tools.elevated.allowFrom.<provider> / agents.list[].tools.elevated.allowFrom.<provider>)",
      );
    }
    throw new Error(
      [
        `elevated is not available right now (runtime=${runtime}).`,
        `Failing gates: ${gates.join(", ")}`,
        contextParts.length > 0 ? `Context: ${contextParts.join(" ")}` : undefined,
        "Fix-it keys:",
        "- tools.elevated.enabled",
        "- tools.elevated.allowFrom.<provider>",
        "- agents.list[].tools.elevated.enabled",
        "- agents.list[].tools.elevated.allowFrom.<provider>",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

export function logExecElevatedIfRequested(elevatedRequested: boolean, command: string): void {
  if (elevatedRequested) {
    logInfo(`exec: elevated command ${truncateMiddle(command, 120)}`);
  }
}
