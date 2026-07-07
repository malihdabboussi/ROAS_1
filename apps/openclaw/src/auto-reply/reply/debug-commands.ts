import { parseSetUnsetCommand } from "./commands-setunset.js";
import { parseSlashCommandOrNull } from "./commands-slash-parse.js";

export type DebugCommand =
  | { action: "show" }
  | { action: "reset" }
  | { action: "set"; path: string; value: unknown }
  | { action: "unset"; path: string }
  | { action: "error"; message: string };

export function parseDebugCommand(raw: string): DebugCommand | null {
  const parsed = parseSlashCommandOrNull(raw, "/debug", {
    invalidMessage: "Invalid /debug syntax.",
  });
  if (!parsed) {
    return null;
  }
  if (!parsed.ok) {
    return { action: "error", message: parsed.message };
  }
  const { action, args } = parsed;

  switch (action) {
    case "show":
      return { action: "show" };
    case "reset":
      return { action: "reset" };
    case "unset":
    case "set": {
      const parsedAt30 = parseSetUnsetCommand({ slash: "/debug", action, args });
      if (parsedAt30.kind === "error") {
        return { action: "error", message: parsedAt30.message };
      }
      return parsedAt30.kind === "set"
        ? { action: "set", path: parsedAt30.path, value: parsedAt30.value }
        : { action: "unset", path: parsedAt30.path };
    }
    default:
      return {
        action: "error",
        message: "Usage: /debug show|set|unset|reset",
      };
  }
}
