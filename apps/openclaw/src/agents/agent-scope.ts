import path from "node:path";
import type { OpenClawConfig } from "../config/config.js";
import { resolveStateDir } from "../config/paths.js";
import {
  DEFAULT_AGENT_ID,
  normalizeAgentId,
  parseAgentSessionKey,
} from "../routing/session-key.js";
import { resolveUserPath } from "../utils.js";
import { listDynamicAgentIds } from "./dynamic-registry.js";
import { normalizeSkillFilter } from "./skills/filter.js";
import { resolveDefaultAgentWorkspaceDir } from "./workspace.js";

export { resolveAgentIdFromSessionKey } from "../routing/session-key.js";

type AgentEntry = NonNullable<NonNullable<OpenClawConfig["agents"]>["list"]>[number];

type ResolvedAgentConfig = {
  name?: string;
  workspace?: string;
  agentDir?: string;
  model?: AgentEntry["model"];
  skills?: AgentEntry["skills"];
  promptMode?: AgentEntry["promptMode"];
  memorySearch?: AgentEntry["memorySearch"];
  humanDelay?: AgentEntry["humanDelay"];
  heartbeat?: AgentEntry["heartbeat"];
  identity?: AgentEntry["identity"];
  groupChat?: AgentEntry["groupChat"];
  subagents?: AgentEntry["subagents"];
  sandbox?: AgentEntry["sandbox"];
  tools?: AgentEntry["tools"];
};

let defaultAgentWarned = false;

function listAgents(cfg: OpenClawConfig): AgentEntry[] {
  const list = cfg.agents?.list;
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter((entry): entry is AgentEntry => Boolean(entry && typeof entry === "object"));
}

export function listAgentIds(cfg: OpenClawConfig): string[] {
  const seen = new Set<string>();
  const staticIds = listAgents(cfg)
    .map((entry) => normalizeAgentId(entry?.id))
    .filter(Boolean);
  const dynamicIds = listDynamicAgentIds(cfg);
  const defaultId = normalizeAgentId(resolveDefaultAgentId(cfg) || DEFAULT_AGENT_ID);
  const combined = [defaultId, ...staticIds, ...dynamicIds];
  const ids: string[] = [];
  for (const id of combined) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids.length > 0 ? ids : [DEFAULT_AGENT_ID];
}

export function resolveDefaultAgentId(cfg: OpenClawConfig): string {
  const agents = listAgents(cfg);
  if (agents.length === 0) {
    return DEFAULT_AGENT_ID;
  }
  const defaults = agents.filter((agent) => agent?.default);
  if (defaults.length > 1 && !defaultAgentWarned) {
    defaultAgentWarned = true;
    console.warn("Multiple agents marked default=true; using the first entry as default.");
  }
  const chosen = (defaults[0] ?? agents[0])?.id?.trim();
  return normalizeAgentId(chosen || DEFAULT_AGENT_ID);
}

export function resolveSessionAgentIds(params: { sessionKey?: string; config?: OpenClawConfig }): {
  defaultAgentId: string;
  sessionAgentId: string;
} {
  const defaultAgentId = resolveDefaultAgentId(params.config ?? {});
  const sessionKey = params.sessionKey?.trim();
  const normalizedSessionKey = sessionKey ? sessionKey.toLowerCase() : undefined;
  const parsed = normalizedSessionKey ? parseAgentSessionKey(normalizedSessionKey) : null;
  const sessionAgentId = parsed?.agentId ? normalizeAgentId(parsed.agentId) : defaultAgentId;
  return { defaultAgentId, sessionAgentId };
}

export function resolveSessionAgentId(params: {
  sessionKey?: string;
  config?: OpenClawConfig;
}): string {
  return resolveSessionAgentIds(params).sessionAgentId;
}

function resolveAgentEntry(cfg: OpenClawConfig, agentId: string): AgentEntry | undefined {
  const exact = listAgents(cfg).find((entry) => entry.id === agentId);
  if (exact) {
    return exact;
  }

  const id = normalizeAgentId(agentId);
  return listAgents(cfg).find((entry) => normalizeAgentId(entry.id) === id);
}

export function resolveAgentConfig(
  cfg: OpenClawConfig,
  agentId: string,
): ResolvedAgentConfig | undefined {
  const id = normalizeAgentId(agentId);
  const entry = resolveAgentEntry(cfg, id);
  if (!entry) {
    return undefined;
  }
  return {
    name: typeof entry.name === "string" ? entry.name : undefined,
    workspace: typeof entry.workspace === "string" ? entry.workspace : undefined,
    agentDir: typeof entry.agentDir === "string" ? entry.agentDir : undefined,
    model:
      typeof entry.model === "string" || (entry.model && typeof entry.model === "object")
        ? entry.model
        : undefined,
    skills: Array.isArray(entry.skills) ? entry.skills : undefined,
    promptMode: entry.promptMode,
    memorySearch: entry.memorySearch,
    humanDelay: entry.humanDelay,
    heartbeat: entry.heartbeat,
    identity: entry.identity,
    groupChat: entry.groupChat,
    subagents: typeof entry.subagents === "object" && entry.subagents ? entry.subagents : undefined,
    sandbox: entry.sandbox,
    tools: entry.tools,
  };
}

export function resolveAgentSkillsFilter(
  cfg: OpenClawConfig,
  agentId: string,
): string[] | undefined {
  return normalizeSkillFilter(resolveAgentConfig(cfg, agentId)?.skills);
}

export function resolveAgentPromptMode(
  cfg: OpenClawConfig,
  agentId: string,
): "full" | "embedded" | "platform" | "vibey" | undefined {
  const raw = resolveAgentConfig(cfg, agentId)?.promptMode;
  if (raw === "full" || raw === "embedded" || raw === "platform" || raw === "vibey") {
    return raw;
  }
  const defaultMode = cfg.agents?.defaults?.promptMode;
  if (
    defaultMode === "full" ||
    defaultMode === "embedded" ||
    defaultMode === "platform" ||
    defaultMode === "vibey"
  ) {
    return defaultMode;
  }
  return undefined;
}

export function resolveAgentModelPrimary(cfg: OpenClawConfig, agentId: string): string | undefined {
  const raw = resolveAgentConfig(cfg, agentId)?.model;
  if (!raw) {
    return undefined;
  }
  if (typeof raw === "string") {
    return raw.trim() || undefined;
  }
  const primary = raw.primary?.trim();
  return primary || undefined;
}

export function resolveAgentModelFallbacksOverride(
  cfg: OpenClawConfig,
  agentId: string,
): string[] | undefined {
  const raw = resolveAgentConfig(cfg, agentId)?.model;
  if (!raw || typeof raw === "string") {
    return undefined;
  }
  // Important: treat an explicitly provided empty array as an override to disable global fallbacks.
  if (!Object.hasOwn(raw, "fallbacks")) {
    return undefined;
  }
  return Array.isArray(raw.fallbacks) ? raw.fallbacks : undefined;
}

export function resolveEffectiveModelFallbacks(params: {
  cfg: OpenClawConfig;
  agentId: string;
  hasSessionModelOverride: boolean;
}): string[] | undefined {
  const agentFallbacksOverride = resolveAgentModelFallbacksOverride(params.cfg, params.agentId);
  if (!params.hasSessionModelOverride) {
    return agentFallbacksOverride;
  }
  const defaultFallbacks =
    typeof params.cfg.agents?.defaults?.model === "object"
      ? (params.cfg.agents.defaults.model.fallbacks ?? [])
      : [];
  return agentFallbacksOverride ?? defaultFallbacks;
}

function resolveWorkspacePathTemplate(input: string): string {
  const agentsBaseDir = process.env.AGENTS_BASE_DIR?.trim();
  if (input === "${AGENTS_BASE_DIR}") {
    return agentsBaseDir ? resolveUserPath(agentsBaseDir) : input;
  }
  if (input.startsWith("${AGENTS_BASE_DIR}/")) {
    const suffix = input.slice("${AGENTS_BASE_DIR}/".length);
    return agentsBaseDir ? path.join(resolveUserPath(agentsBaseDir), suffix) : input;
  }
  return resolveUserPath(input);
}

export function resolveAgentWorkspaceDir(cfg: OpenClawConfig, agentId: string) {
  const id = normalizeAgentId(agentId);
  const configured = resolveAgentConfig(cfg, id)?.workspace?.trim();
  if (configured) {
    return resolveWorkspacePathTemplate(configured);
  }
  const defaultAgentId = resolveDefaultAgentId(cfg);
  if (id === defaultAgentId) {
    const fallback = cfg.agents?.defaults?.workspace?.trim();
    if (fallback) {
      return resolveWorkspacePathTemplate(fallback);
    }
    return resolveDefaultAgentWorkspaceDir(process.env);
  }
  const dynamicAgentsBaseDir = (process.env.AGENTS_BASE_DIR ?? "").trim();
  if (dynamicAgentsBaseDir) {
    return path.join(resolveUserPath(dynamicAgentsBaseDir), id);
  }
  const stateDir = resolveStateDir(process.env);
  return path.join(stateDir, `workspace-${id}`);
}

export function resolveAgentDir(cfg: OpenClawConfig, agentId: string) {
  const id = normalizeAgentId(agentId);
  const configured = resolveAgentConfig(cfg, id)?.agentDir?.trim();
  if (configured) {
    return resolveUserPath(configured);
  }
  const root = resolveStateDir(process.env);
  return path.join(root, "agents", id, "agent");
}
