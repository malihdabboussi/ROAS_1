import { type Api, type Context, complete, type Model } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { OpenClawConfig } from "../../config/config.js";
import type { SandboxFsBridge } from "../sandbox/fs-bridge.js";
import type { AnyAgentTool } from "./common.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { resolveUserPath } from "../../utils.js";
import { getDefaultLocalRoots, loadWebMedia } from "../../web/media.js";
import { ensureAuthProfileStore, listProfilesForProvider } from "../auth-profiles.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../defaults.js";
import { minimaxUnderstandImage } from "../minimax-vlm.js";
import { getApiKeyForModel, requireApiKey, resolveEnvApiKey } from "../model-auth.js";
import { runWithImageModelFallback } from "../model-fallback.js";
import { resolveConfiguredModelRef } from "../model-selection.js";
import { ensureOpenClawModelsJson } from "../models-config.js";
import { discoverAuthStorage, discoverModels } from "../pi-model-discovery.js";
import { normalizeWorkspaceDir } from "../workspace-dir.js";
import {
  coerceImageAssistantText,
  coerceImageModelConfig,
  decodeDataUrl,
  type ImageModelConfig,
  resolveProviderVisionModelFromConfig,
} from "./image-tool.helpers.js";

const DEFAULT_PROMPT = "Describe the image.";
const ANTHROPIC_IMAGE_PRIMARY = "anthropic/claude-opus-4-6";
const ANTHROPIC_IMAGE_FALLBACK = "anthropic/claude-opus-4-5";
const DEFAULT_MAX_IMAGES = 20;
const skillImageLog = createSubsystemLogger("agents/tools/image");

type SkillImageManifestEntry = {
  skill_key: string;
  file_path: string;
  content_type: string;
  description: string;
  storage_url: string;
};

type SkillImageCacheMetadata = {
  storage_url: string;
  content_type: string;
  byte_size: number;
  fetched_at: string;
};

type DbSkillResolverConfig = {
  backendUrl?: string;
  sessionKey?: string;
};

export const __testing = {
  decodeDataUrl,
  coerceImageAssistantText,
  resolveImageToolMaxTokens,
  parseSkillImageReference,
  validateSupabaseStoragePublicObjectUrl,
  readSkillImageManifest,
} as const;

function resolveImageToolMaxTokens(modelMaxTokens: number | undefined, requestedMaxTokens = 4096) {
  if (
    typeof modelMaxTokens !== "number" ||
    !Number.isFinite(modelMaxTokens) ||
    modelMaxTokens <= 0
  ) {
    return requestedMaxTokens;
  }
  return Math.min(requestedMaxTokens, modelMaxTokens);
}

function resolveDefaultModelRef(cfg?: OpenClawConfig): {
  provider: string;
  model: string;
} {
  if (cfg) {
    const resolved = resolveConfiguredModelRef({
      cfg,
      defaultProvider: DEFAULT_PROVIDER,
      defaultModel: DEFAULT_MODEL,
    });
    return { provider: resolved.provider, model: resolved.model };
  }
  return { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL };
}

function hasAuthForProvider(params: { provider: string; agentDir: string }): boolean {
  if (resolveEnvApiKey(params.provider)?.apiKey) {
    return true;
  }
  const store = ensureAuthProfileStore(params.agentDir, {
    allowKeychainPrompt: false,
  });
  return listProfilesForProvider(store, params.provider).length > 0;
}

/**
 * Resolve the effective image model config for the `image` tool.
 *
 * - Prefer explicit config (`agents.defaults.imageModel`).
 * - Otherwise, try to "pair" the primary model with an image-capable model:
 *   - same provider (best effort)
 *   - fall back to OpenAI/Anthropic when available
 */
export function resolveImageModelConfigForTool(params: {
  cfg?: OpenClawConfig;
  agentDir: string;
}): ImageModelConfig | null {
  // Note: We intentionally do NOT gate based on primarySupportsImages here.
  // Even when the primary model supports images, we keep the tool available
  // because images are auto-injected into prompts (see attempt.ts detectAndLoadPromptImages).
  // The tool description is adjusted via modelHasVision to discourage redundant usage.
  const explicit = coerceImageModelConfig(params.cfg);
  if (explicit.primary?.trim() || (explicit.fallbacks?.length ?? 0) > 0) {
    return explicit;
  }

  const primary = resolveDefaultModelRef(params.cfg);
  const openaiOk = hasAuthForProvider({
    provider: "openai",
    agentDir: params.agentDir,
  });
  const anthropicOk = hasAuthForProvider({
    provider: "anthropic",
    agentDir: params.agentDir,
  });

  const fallbacks: string[] = [];
  const addFallback = (modelRef: string | null) => {
    const ref = (modelRef ?? "").trim();
    if (!ref) {
      return;
    }
    if (fallbacks.includes(ref)) {
      return;
    }
    fallbacks.push(ref);
  };

  const providerVisionFromConfig = resolveProviderVisionModelFromConfig({
    cfg: params.cfg,
    provider: primary.provider,
  });
  const providerOk = hasAuthForProvider({
    provider: primary.provider,
    agentDir: params.agentDir,
  });

  let preferred: string | null = null;

  // MiniMax users: always try the canonical vision model first when auth exists.
  if (primary.provider === "minimax" && providerOk) {
    preferred = "minimax/MiniMax-VL-01";
  } else if (providerOk && providerVisionFromConfig) {
    preferred = providerVisionFromConfig;
  } else if (primary.provider === "zai" && providerOk) {
    preferred = "zai/glm-4.6v";
  } else if (primary.provider === "openai" && openaiOk) {
    preferred = "openai/gpt-5-mini";
  } else if (primary.provider === "anthropic" && anthropicOk) {
    preferred = ANTHROPIC_IMAGE_PRIMARY;
  }

  if (preferred?.trim()) {
    if (openaiOk) {
      addFallback("openai/gpt-5-mini");
    }
    if (anthropicOk) {
      addFallback(ANTHROPIC_IMAGE_FALLBACK);
    }
    // Don't duplicate primary in fallbacks.
    const pruned = fallbacks.filter((ref) => ref !== preferred);
    return {
      primary: preferred,
      ...(pruned.length > 0 ? { fallbacks: pruned } : {}),
    };
  }

  // Cross-provider fallback when we can't pair with the primary provider.
  if (openaiOk) {
    if (anthropicOk) {
      addFallback(ANTHROPIC_IMAGE_FALLBACK);
    }
    return {
      primary: "openai/gpt-5-mini",
      ...(fallbacks.length ? { fallbacks } : {}),
    };
  }
  if (anthropicOk) {
    return {
      primary: ANTHROPIC_IMAGE_PRIMARY,
      fallbacks: [ANTHROPIC_IMAGE_FALLBACK],
    };
  }

  return null;
}

function pickMaxBytes(cfg?: OpenClawConfig, maxBytesMb?: number): number | undefined {
  if (typeof maxBytesMb === "number" && Number.isFinite(maxBytesMb) && maxBytesMb > 0) {
    return Math.floor(maxBytesMb * 1024 * 1024);
  }
  const configured = cfg?.agents?.defaults?.mediaMaxMb;
  if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
    return Math.floor(configured * 1024 * 1024);
  }
  return undefined;
}

function toSkillDirName(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "skill";
}

function parseSkillImageReference(imageRaw: string): { skillKey: string; filePath: string } {
  let parsed: URL;
  try {
    parsed = new URL(imageRaw);
  } catch {
    throw new Error(`Invalid skill image reference: ${imageRaw}`);
  }
  if (parsed.protocol !== "skill:" || !parsed.hostname || !parsed.pathname) {
    throw new Error(`Invalid skill image reference: ${imageRaw}`);
  }
  const filePath = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (!filePath || filePath.split(/[\\/]/).includes("..") || path.isAbsolute(filePath)) {
    throw new Error(`Invalid skill image path: ${filePath || imageRaw}`);
  }
  return {
    skillKey: decodeURIComponent(parsed.hostname),
    filePath,
  };
}

function validateSupabaseStoragePublicObjectUrl(storageUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(storageUrl);
  } catch {
    throw new Error("Skill image storage_url is not a valid URL.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Skill image storage_url must use https.");
  }
  if (!parsed.hostname.endsWith(".supabase.co")) {
    throw new Error("Skill image storage_url must point to Supabase Storage.");
  }
  if (!parsed.pathname.startsWith("/storage/v1/object/public/")) {
    throw new Error("Skill image storage_url must point to a public Supabase Storage object.");
  }
  return parsed;
}

function coerceSkillImageManifestEntry(value: unknown): SkillImageManifestEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.skill_key !== "string" ||
    typeof row.file_path !== "string" ||
    typeof row.content_type !== "string" ||
    typeof row.description !== "string" ||
    typeof row.storage_url !== "string"
  ) {
    return null;
  }
  return {
    skill_key: row.skill_key,
    file_path: row.file_path,
    content_type: row.content_type,
    description: row.description,
    storage_url: row.storage_url,
  };
}

async function readSkillImageManifest(params: {
  agentDir: string;
  skillKey: string;
  dbSkillResolver?: DbSkillResolverConfig;
}): Promise<SkillImageManifestEntry[]> {
  const manifestPath = path.join(
    params.agentDir,
    "skills",
    toSkillDirName(params.skillKey),
    "references",
    "images.json",
  );
  let raw: string;
  try {
    raw = await fs.readFile(manifestPath, "utf8");
  } catch (err) {
    const backendUrl = params.dbSkillResolver?.backendUrl?.trim().replace(/\/+$/, "");
    const sessionKey = params.dbSkillResolver?.sessionKey?.trim();
    if (!backendUrl || !sessionKey) {
      const msg = (err as Error).message;
      throw new Error(
        `Missing skill image manifest for ${params.skillKey}: ${manifestPath} (${msg})`,
        { cause: err },
      );
    }
    const response = await fetch(`${backendUrl}/api/agents/runtime-skills/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-openclaw-internal": "true",
        "x-session-key": sessionKey,
      },
      body: JSON.stringify({
        skill_key: params.skillKey,
        path: "references/images.json",
      }),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(
        `Missing skill image manifest for ${params.skillKey}: DB fallback failed (${response.status}) ${body.slice(0, 200)}`,
        { cause: err },
      );
    }
    try {
      const parsedBody = JSON.parse(body) as { content?: unknown };
      raw = typeof parsedBody.content === "string" ? parsedBody.content : "";
    } catch (parseErr) {
      throw new Error(`Invalid DB skill image manifest response for ${params.skillKey}.`, {
        cause: parseErr,
      });
    }
    if (!raw) {
      throw new Error(`DB skill image manifest for ${params.skillKey} returned no content.`, {
        cause: err,
      });
    }
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const msg = (err as Error).message;
    throw new Error(`Invalid skill image manifest for ${params.skillKey}: ${msg}`, { cause: err });
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid skill image manifest for ${params.skillKey}: expected array.`);
  }
  return parsed
    .map(coerceSkillImageManifestEntry)
    .filter((entry): entry is SkillImageManifestEntry => Boolean(entry));
}

async function loadSkillImageReference(params: {
  agentDir: string;
  imageRaw: string;
  maxBytes?: number;
  dbSkillResolver?: DbSkillResolverConfig;
}): Promise<{
  base64: string;
  mimeType: string;
  resolvedImage: string;
  cacheHit: boolean;
  byteSize: number;
}> {
  const ref = parseSkillImageReference(params.imageRaw);
  const manifest = await readSkillImageManifest({
    agentDir: params.agentDir,
    skillKey: ref.skillKey,
    dbSkillResolver: params.dbSkillResolver,
  });
  const entry = manifest.find((candidate) => candidate.file_path === ref.filePath);
  if (!entry) {
    throw new Error(`Skill image reference not found: ${params.imageRaw}`);
  }
  if (!entry.content_type.startsWith("image/")) {
    throw new Error(`Skill image reference is not an image: ${entry.content_type}`);
  }
  validateSupabaseStoragePublicObjectUrl(entry.storage_url);

  const hash = crypto.createHash("sha256").update(entry.storage_url).digest("hex");
  const cacheDir = path.join(params.agentDir, ".cache", "skill-images");
  const binPath = path.join(cacheDir, `${hash}.bin`);
  const metaPath = path.join(cacheDir, `${hash}.json`);
  try {
    const [buffer, metaRaw] = await Promise.all([
      fs.readFile(binPath),
      fs.readFile(metaPath, "utf8"),
    ]);
    const meta = JSON.parse(metaRaw) as Partial<SkillImageCacheMetadata>;
    if (
      meta.storage_url === entry.storage_url &&
      typeof meta.content_type === "string" &&
      meta.content_type.startsWith("image/") &&
      meta.byte_size === buffer.byteLength
    ) {
      skillImageLog.info("skill_image_reference_loaded", {
        skillKey: ref.skillKey,
        filePath: ref.filePath,
        cache: "hit",
        byteSize: buffer.byteLength,
        contentType: meta.content_type,
      });
      return {
        base64: buffer.toString("base64"),
        mimeType: meta.content_type,
        resolvedImage: params.imageRaw,
        cacheHit: true,
        byteSize: buffer.byteLength,
      };
    }
  } catch {
    // Cache misses and stale metadata both fall through to an on-demand fetch.
  }

  const media = await loadWebMedia(entry.storage_url, { maxBytes: params.maxBytes });
  if (media.kind !== "image") {
    throw new Error(`Unsupported skill image media type: ${media.kind}`);
  }
  const mimeType = media.contentType ?? entry.content_type;
  if (!mimeType.startsWith("image/")) {
    throw new Error(`Skill image fetch returned non-image content type: ${mimeType}`);
  }

  await fs.mkdir(cacheDir, { recursive: true });
  await Promise.all([
    fs.writeFile(binPath, media.buffer),
    fs.writeFile(
      metaPath,
      `${JSON.stringify(
        {
          storage_url: entry.storage_url,
          content_type: mimeType,
          byte_size: media.buffer.byteLength,
          fetched_at: new Date().toISOString(),
        } satisfies SkillImageCacheMetadata,
        null,
        2,
      )}\n`,
      "utf8",
    ),
  ]);
  skillImageLog.info("skill_image_reference_loaded", {
    skillKey: ref.skillKey,
    filePath: ref.filePath,
    cache: "miss",
    byteSize: media.buffer.byteLength,
    contentType: mimeType,
  });
  return {
    base64: media.buffer.toString("base64"),
    mimeType,
    resolvedImage: params.imageRaw,
    cacheHit: false,
    byteSize: media.buffer.byteLength,
  };
}

function buildImageContext(
  prompt: string,
  images: Array<{ base64: string; mimeType: string }>,
): Context {
  const content: Array<
    { type: "text"; text: string } | { type: "image"; data: string; mimeType: string }
  > = [{ type: "text", text: prompt }];
  for (const img of images) {
    content.push({ type: "image", data: img.base64, mimeType: img.mimeType });
  }
  return {
    messages: [
      {
        role: "user",
        content,
        timestamp: Date.now(),
      },
    ],
  };
}

type ImageSandboxConfig = {
  root: string;
  bridge: SandboxFsBridge;
};

async function resolveSandboxedImagePath(params: {
  sandbox: ImageSandboxConfig;
  imagePath: string;
}): Promise<{ resolved: string; rewrittenFrom?: string }> {
  const normalize = (p: string) => (p.startsWith("file://") ? p.slice("file://".length) : p);
  const filePath = normalize(params.imagePath);
  try {
    const resolved = params.sandbox.bridge.resolvePath({
      filePath,
      cwd: params.sandbox.root,
    });
    return { resolved: resolved.hostPath };
  } catch (err) {
    const name = path.basename(filePath);
    const candidateRel = path.join("media", "inbound", name);
    try {
      const stat = await params.sandbox.bridge.stat({
        filePath: candidateRel,
        cwd: params.sandbox.root,
      });
      if (!stat) {
        throw err;
      }
    } catch {
      throw err;
    }
    const out = params.sandbox.bridge.resolvePath({
      filePath: candidateRel,
      cwd: params.sandbox.root,
    });
    return { resolved: out.hostPath, rewrittenFrom: filePath };
  }
}

async function runImagePrompt(params: {
  cfg?: OpenClawConfig;
  agentDir: string;
  imageModelConfig: ImageModelConfig;
  modelOverride?: string;
  prompt: string;
  images: Array<{ base64: string; mimeType: string }>;
}): Promise<{
  text: string;
  provider: string;
  model: string;
  attempts: Array<{ provider: string; model: string; error: string }>;
}> {
  const effectiveCfg: OpenClawConfig | undefined = params.cfg
    ? {
        ...params.cfg,
        agents: {
          ...params.cfg.agents,
          defaults: {
            ...params.cfg.agents?.defaults,
            imageModel: params.imageModelConfig,
          },
        },
      }
    : undefined;

  await ensureOpenClawModelsJson(effectiveCfg, params.agentDir);
  const authStorage = discoverAuthStorage(params.agentDir);
  const modelRegistry = discoverModels(authStorage, params.agentDir);

  const result = await runWithImageModelFallback({
    cfg: effectiveCfg,
    modelOverride: params.modelOverride,
    run: async (provider, modelId) => {
      const model = modelRegistry.find(provider, modelId) as Model<Api> | null;
      if (!model) {
        throw new Error(`Unknown model: ${provider}/${modelId}`);
      }
      if (!model.input?.includes("image")) {
        throw new Error(`Model does not support images: ${provider}/${modelId}`);
      }
      const apiKeyInfo = await getApiKeyForModel({
        model,
        cfg: effectiveCfg,
        agentDir: params.agentDir,
      });
      const apiKey = requireApiKey(apiKeyInfo, model.provider);
      authStorage.setRuntimeApiKey(model.provider, apiKey);

      // MiniMax VLM only supports a single image; use the first one.
      if (model.provider === "minimax") {
        const first = params.images[0];
        const imageDataUrl = `data:${first.mimeType};base64,${first.base64}`;
        const text = await minimaxUnderstandImage({
          apiKey,
          prompt: params.prompt,
          imageDataUrl,
          modelBaseUrl: model.baseUrl,
        });
        return { text, provider: model.provider, model: model.id };
      }

      const context = buildImageContext(params.prompt, params.images);
      const message = await complete(model, context, {
        apiKey,
        maxTokens: resolveImageToolMaxTokens(model.maxTokens),
      });
      const text = coerceImageAssistantText({
        message,
        provider: model.provider,
        model: model.id,
      });
      return { text, provider: model.provider, model: model.id };
    },
  });

  return {
    text: result.result.text,
    provider: result.result.provider,
    model: result.result.model,
    attempts: result.attempts.map((attempt) => ({
      provider: attempt.provider,
      model: attempt.model,
      error: attempt.error,
    })),
  };
}

export function createImageTool(options?: {
  config?: OpenClawConfig;
  agentDir?: string;
  workspaceDir?: string;
  sandbox?: ImageSandboxConfig;
  /** If true, the model has native vision capability and images in the prompt are auto-injected */
  modelHasVision?: boolean;
  dbSkillResolver?: DbSkillResolverConfig;
}): AnyAgentTool | null {
  const agentDir = options?.agentDir?.trim();
  if (!agentDir) {
    const explicit = coerceImageModelConfig(options?.config);
    if (explicit.primary?.trim() || (explicit.fallbacks?.length ?? 0) > 0) {
      throw new Error("createImageTool requires agentDir when enabled");
    }
    return null;
  }
  const imageModelConfig = resolveImageModelConfigForTool({
    cfg: options?.config,
    agentDir,
  });
  if (!imageModelConfig) {
    return null;
  }

  // If model has native vision, images in the prompt are auto-injected
  // so this tool is only needed when image wasn't provided in the prompt
  const description = options?.modelHasVision
    ? "Analyze one or more images with a vision model. Pass a single image path/URL, skill:// reference, or an array of up to 20. Only use this tool when images were NOT already provided in the user's message. Images mentioned in the prompt are automatically visible to you."
    : "Analyze one or more images with the configured image model (agents.defaults.imageModel). Pass a single image path/URL, skill:// reference, or an array of up to 20. Provide a prompt describing what to analyze.";

  const localRoots = (() => {
    const roots = getDefaultLocalRoots();
    const workspaceDir = normalizeWorkspaceDir(options?.workspaceDir);
    if (!workspaceDir) {
      return roots;
    }
    return Array.from(new Set([...roots, workspaceDir]));
  })();

  return {
    label: "Image",
    name: "image",
    description,
    parameters: Type.Object({
      prompt: Type.Optional(Type.String()),
      image: Type.Union([Type.String(), Type.Array(Type.String())]),
      model: Type.Optional(Type.String()),
      maxBytesMb: Type.Optional(Type.Number()),
      maxImages: Type.Optional(Type.Number()),
    }),
    execute: async (_toolCallId, args) => {
      const record = args && typeof args === "object" ? (args as Record<string, unknown>) : {};

      // MARK: - Normalize image input (string | string[])
      const rawImageInput = record.image;
      const imageInputs: string[] = (() => {
        if (typeof rawImageInput === "string") {
          return [rawImageInput];
        }
        if (Array.isArray(rawImageInput)) {
          return rawImageInput.filter((v): v is string => typeof v === "string");
        }
        return [];
      })();
      if (imageInputs.length === 0) {
        throw new Error("image required");
      }

      // MARK: - Enforce max images cap
      const maxImagesRaw = typeof record.maxImages === "number" ? record.maxImages : undefined;
      const maxImages =
        typeof maxImagesRaw === "number" && Number.isFinite(maxImagesRaw) && maxImagesRaw > 0
          ? Math.floor(maxImagesRaw)
          : DEFAULT_MAX_IMAGES;
      if (imageInputs.length > maxImages) {
        return {
          content: [
            {
              type: "text",
              text: `Too many images: ${imageInputs.length} provided, maximum is ${maxImages}. Please reduce the number of images.`,
            },
          ],
          details: { error: "too_many_images", count: imageInputs.length, max: maxImages },
        };
      }

      const promptRaw =
        typeof record.prompt === "string" && record.prompt.trim()
          ? record.prompt.trim()
          : DEFAULT_PROMPT;
      const modelOverride =
        typeof record.model === "string" && record.model.trim() ? record.model.trim() : undefined;
      const maxBytesMb = typeof record.maxBytesMb === "number" ? record.maxBytesMb : undefined;
      const maxBytes = pickMaxBytes(options?.config, maxBytesMb);

      const sandboxConfig =
        options?.sandbox && options?.sandbox.root.trim()
          ? { root: options.sandbox.root.trim(), bridge: options.sandbox.bridge }
          : null;

      // MARK: - Load and resolve each image
      const loadedImages: Array<{
        base64: string;
        mimeType: string;
        resolvedImage: string;
        rewrittenFrom?: string;
      }> = [];

      for (const imageRawInput of imageInputs) {
        const trimmed = imageRawInput.trim();
        const imageRaw = trimmed.startsWith("@") ? trimmed.slice(1).trim() : trimmed;
        if (!imageRaw) {
          throw new Error("image required (empty string in array)");
        }

        // The tool accepts file paths, file/data URLs, or http(s) URLs. In some
        // agent/model contexts, images can be referenced as pseudo-URIs like
        // `image:0` (e.g. "first image in the prompt"). We don't have access to a
        // shared image registry here, so fail gracefully instead of attempting to
        // `fs.readFile("image:0")` and producing a noisy ENOENT.
        const looksLikeWindowsDrivePath = /^[a-zA-Z]:[\\/]/.test(imageRaw);
        const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(imageRaw);
        const isFileUrl = /^file:/i.test(imageRaw);
        const isHttpUrl = /^https?:\/\//i.test(imageRaw);
        const isDataUrl = /^data:/i.test(imageRaw);
        const isSkillUrl = /^skill:\/\//i.test(imageRaw);
        if (
          hasScheme &&
          !looksLikeWindowsDrivePath &&
          !isFileUrl &&
          !isHttpUrl &&
          !isDataUrl &&
          !isSkillUrl
        ) {
          return {
            content: [
              {
                type: "text",
                text: `Unsupported image reference: ${imageRawInput}. Use a file path, a file:// URL, a data: URL, a skill:// reference, or an http(s) URL.`,
              },
            ],
            details: {
              error: "unsupported_image_reference",
              image: imageRawInput,
            },
          };
        }

        if (sandboxConfig && isHttpUrl) {
          throw new Error("Sandboxed image tool does not allow remote URLs.");
        }

        if (isSkillUrl) {
          const skillImage = await loadSkillImageReference({
            agentDir,
            imageRaw,
            maxBytes,
            dbSkillResolver: options?.dbSkillResolver,
          });
          loadedImages.push({
            base64: skillImage.base64,
            mimeType: skillImage.mimeType,
            resolvedImage: skillImage.resolvedImage,
          });
          continue;
        }

        const resolvedImage = (() => {
          if (sandboxConfig) {
            return imageRaw;
          }
          if (imageRaw.startsWith("~")) {
            return resolveUserPath(imageRaw);
          }
          return imageRaw;
        })();
        const resolvedPathInfo: { resolved: string; rewrittenFrom?: string } = isDataUrl
          ? { resolved: "" }
          : sandboxConfig
            ? await resolveSandboxedImagePath({
                sandbox: sandboxConfig,
                imagePath: resolvedImage,
              })
            : {
                resolved: resolvedImage.startsWith("file://")
                  ? resolvedImage.slice("file://".length)
                  : resolvedImage,
              };
        const resolvedPath = isDataUrl ? null : resolvedPathInfo.resolved;

        const media = isDataUrl
          ? decodeDataUrl(resolvedImage)
          : sandboxConfig
            ? await loadWebMedia(resolvedPath ?? resolvedImage, {
                maxBytes,
                sandboxValidated: true,
                readFile: (filePath) =>
                  sandboxConfig.bridge.readFile({ filePath, cwd: sandboxConfig.root }),
              })
            : await loadWebMedia(resolvedPath ?? resolvedImage, {
                maxBytes,
                localRoots,
              });
        if (media.kind !== "image") {
          throw new Error(`Unsupported media type: ${media.kind}`);
        }

        const mimeType =
          ("contentType" in media && media.contentType) ||
          ("mimeType" in media && media.mimeType) ||
          "image/png";
        const base64 = media.buffer.toString("base64");
        loadedImages.push({
          base64,
          mimeType,
          resolvedImage,
          ...(resolvedPathInfo.rewrittenFrom
            ? { rewrittenFrom: resolvedPathInfo.rewrittenFrom }
            : {}),
        });
      }

      // MARK: - Run image prompt with all loaded images
      const result = await runImagePrompt({
        cfg: options?.config,
        agentDir,
        imageModelConfig,
        modelOverride,
        prompt: promptRaw,
        images: loadedImages.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
      });

      const imageDetails =
        loadedImages.length === 1
          ? {
              image: loadedImages[0].resolvedImage,
              ...(loadedImages[0].rewrittenFrom
                ? { rewrittenFrom: loadedImages[0].rewrittenFrom }
                : {}),
            }
          : {
              images: loadedImages.map((img) => ({
                image: img.resolvedImage,
                ...(img.rewrittenFrom ? { rewrittenFrom: img.rewrittenFrom } : {}),
              })),
            };

      return {
        content: [{ type: "text", text: result.text }],
        details: {
          model: `${result.provider}/${result.model}`,
          ...imageDetails,
          attempts: result.attempts,
        },
      };
    },
  };
}
