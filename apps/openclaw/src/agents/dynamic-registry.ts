import fs from "node:fs";
import path from "node:path";
import type { OpenClawConfig } from "../config/config.js";
import { resolveStateDir } from "../config/paths.js";
import { normalizeAgentId } from "../routing/session-key.js";
import { resolveUserPath } from "../utils.js";

const CACHE_TTL_MS = 1000;
const REQUIRED_WORKSPACE_FILES = ["AGENTS.md", "ROLE.md", "SOUL.md"];
const RESERVED_DIR_NAMES = new Set(["templates", "template", ".openclaw", ".git"]);

type CacheEntry = {
  expiresAt: number;
  value: string[];
};

const registryCache = new Map<string, CacheEntry>();

function resolveAgentsBaseDir(cfg: OpenClawConfig): string {
  const envBase = (process.env.AGENTS_BASE_DIR ?? "").trim();
  if (envBase) {
    return resolveUserPath(envBase);
  }

  const defaultsWorkspace = cfg.agents?.defaults?.workspace?.trim();
  if (defaultsWorkspace) {
    const candidate = path.dirname(resolveUserPath(defaultsWorkspace));
    if (candidate) {
      return candidate;
    }
  }

  const dockerPath = "/app/agents";
  if (fs.existsSync(dockerPath)) {
    return dockerPath;
  }

  const localPath = path.join(process.cwd(), "docker", "agents");
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  return path.join(resolveStateDir(process.env), "agents");
}

function hasRequiredWorkspaceFiles(dirPath: string): boolean {
  for (const fileName of REQUIRED_WORKSPACE_FILES) {
    if (fs.existsSync(path.join(dirPath, fileName))) {
      return true;
    }
  }
  return false;
}

function isDynamicAgentDirName(name: string): boolean {
  if (!name) {
    return false;
  }
  if (RESERVED_DIR_NAMES.has(name.toLowerCase())) {
    return false;
  }
  if (name.startsWith(".")) {
    return false;
  }
  return true;
}

function listDynamicAgentIdsUncached(baseDir: string): string[] {
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const ids = new Set<string>();
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (!isDynamicAgentDirName(entry.name)) {
      continue;
    }

    const dirPath = path.join(baseDir, entry.name);
    if (!hasRequiredWorkspaceFiles(dirPath)) {
      continue;
    }

    const id = normalizeAgentId(entry.name);
    if (!id) {
      continue;
    }
    ids.add(id);
  }

  return Array.from(ids).toSorted((a, b) => a.localeCompare(b));
}

export function listDynamicAgentIds(cfg: OpenClawConfig): string[] {
  const baseDir = resolveAgentsBaseDir(cfg);
  const now = Date.now();
  const cached = registryCache.get(baseDir);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = listDynamicAgentIdsUncached(baseDir);
  registryCache.set(baseDir, { value, expiresAt: now + CACHE_TTL_MS });
  return value;
}

export function clearDynamicAgentRegistryCache(): void {
  registryCache.clear();
}
