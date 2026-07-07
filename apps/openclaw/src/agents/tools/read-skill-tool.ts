import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { Type } from "@sinclair/typebox";
import fs from "node:fs/promises";
import path from "node:path";
import type { SkillSnapshot } from "../skills.js";
import { DB_SKILL_ID_PREFIX, DISK_SKILL_ID_PREFIX, buildDiskSkillId } from "../skills/types.js";
import { type AnyAgentTool, ToolInputError, readStringParam } from "./common.js";

const READ_DB_SKILL_PATH = "/api/agents/runtime-skills/read";

const ReadSkillToolSchema = Type.Object({
  id: Type.String({
    description: "Skill id from <available_skills>, e.g. disk:meticulously or db:brand-voice.",
  }),
  path: Type.Optional(
    Type.String({
      description:
        "Optional relative resource path inside that skill, e.g. references/examples.md.",
    }),
  ),
});

function normalizeRelativeSkillPath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || trimmed.includes("\0") || trimmed.includes("\\")) {
    throw new ToolInputError("Unsafe skill resource path.");
  }
  if (path.isAbsolute(trimmed)) {
    throw new ToolInputError("Unsafe skill resource path.");
  }
  const normalized = path.posix.normalize(trimmed);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../")) {
    throw new ToolInputError("Unsafe skill resource path.");
  }
  return normalized;
}

function resolvePathWithin(baseDir: string, relativePath: string): string {
  const safePath = normalizeRelativeSkillPath(relativePath);
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, safePath);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new ToolInputError("Unsafe skill resource path.");
  }
  return resolved;
}

function normalizeBackendUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : undefined;
}

async function readDiskSkill(params: {
  snapshot?: SkillSnapshot;
  id: string;
  resourcePath?: string;
}): Promise<AgentToolResult<unknown>> {
  const skill = params.snapshot?.resolvedSkills?.find(
    (candidate) => buildDiskSkillId(candidate.name) === params.id,
  );
  if (!skill) {
    throw new ToolInputError(`Unknown skill id: ${params.id}`);
  }

  const targetPath = params.resourcePath
    ? resolvePathWithin(skill.baseDir, params.resourcePath)
    : skill.filePath;
  const content = await fs.readFile(targetPath, "utf8");
  return {
    content: [{ type: "text", text: content }],
    details: {
      id: params.id,
      source: "disk",
      path: params.resourcePath ?? "SKILL.md",
    },
  };
}

async function readDbSkill(params: {
  backendUrl?: string;
  sessionKey?: string;
  id: string;
  resourcePath?: string;
}): Promise<AgentToolResult<unknown>> {
  const backendUrl = normalizeBackendUrl(params.backendUrl);
  if (!backendUrl) {
    throw new Error("read_skill cannot read DB skills without vibey-backend backendUrl.");
  }
  if (!params.sessionKey?.trim()) {
    throw new ToolInputError("read_skill cannot read DB skills without a session key.");
  }
  const skillKey = params.id.slice(DB_SKILL_ID_PREFIX.length).trim();
  if (!skillKey) {
    throw new ToolInputError("Invalid DB skill id.");
  }

  const response = await fetch(`${backendUrl}${READ_DB_SKILL_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-openclaw-internal": "true",
      "x-session-key": params.sessionKey,
    },
    body: JSON.stringify({
      skill_key: skillKey,
      ...(params.resourcePath ? { path: params.resourcePath } : {}),
    }),
  });
  const payload = (await response.json().catch(async () => ({
    error: await response.text().catch(() => response.statusText),
  }))) as Record<string, unknown>;

  if (!response.ok) {
    const message =
      typeof payload.message === "string"
        ? payload.message
        : typeof payload.error === "string"
          ? payload.error
          : `DB skill read failed (${response.status})`;
    throw new Error(message);
  }
  if (typeof payload.content !== "string") {
    throw new Error("DB skill read returned no content.");
  }
  return {
    content: [{ type: "text", text: payload.content }],
    details: {
      id: params.id,
      source: "db",
      skill_key: skillKey,
      path: typeof payload.path === "string" ? payload.path : (params.resourcePath ?? "SKILL.md"),
      content_type: payload.content_type,
    },
  };
}

export function createReadSkillTool(options?: {
  skillsSnapshot?: SkillSnapshot;
  backendUrl?: string;
  sessionKey?: string;
}): AnyAgentTool {
  return {
    label: "Read Skill",
    name: "read_skill",
    description:
      "Read the selected skill instructions by id from <available_skills>. Use only after choosing one skill. Optional path reads a safe relative resource belonging to the same skill.",
    parameters: ReadSkillToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args && typeof args === "object" ? (args as Record<string, unknown>) : {};
      const id = readStringParam(params, "id", { required: true });
      const rawResourcePath = readStringParam(params, "path");
      const resourcePath = rawResourcePath
        ? normalizeRelativeSkillPath(rawResourcePath)
        : undefined;

      if (id.startsWith(DISK_SKILL_ID_PREFIX)) {
        return readDiskSkill({
          snapshot: options?.skillsSnapshot,
          id,
          resourcePath,
        });
      }
      if (id.startsWith(DB_SKILL_ID_PREFIX)) {
        return readDbSkill({
          backendUrl: options?.backendUrl,
          sessionKey: options?.sessionKey,
          id,
          resourcePath,
        });
      }
      throw new ToolInputError(`Unknown skill id: ${id}`);
    },
  };
}
