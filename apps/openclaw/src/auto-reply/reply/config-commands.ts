import { parseSetUnsetCommand } from "./commands-setunset.js";
import { parseSlashCommandOrNull } from "./commands-slash-parse.js";

export type ConfigCommand =
  | { action: "show"; path?: string }
  | { action: "set"; path: string; value: unknown }
  | { action: "unset"; path: string }
  | { action: "error"; message: string };

export function parseConfigCommand(raw: string): ConfigCommand | null {
  const parsed = parseSlashCommandOrNull(raw, "/config", {
    invalidMessage: "Invalid /config syntax.",
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
      return { action: "show", path: args || undefined };
    case "get":
      return { action: "show", path: args || undefined };
    case "unset":
    case "set": {
      const parsedAt29 = parseSetUnsetCommand({ slash: "/config", action, args });
      if (parsedAt29.kind === "error") {
        return { action: "error", message: parsedAt29.message };
      }
      return parsedAt29.kind === "set"
        ? { action: "set", path: parsedAt29.path, value: parsedAt29.value }
        : { action: "unset", path: parsedAt29.path };
    }
    default:
      return {
        action: "error",
        message: "Usage: /config show|set|unset",
      };
  }
}
