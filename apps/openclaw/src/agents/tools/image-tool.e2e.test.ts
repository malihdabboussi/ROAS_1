import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import { fetchRemoteMedia } from "../../media/fetch.js";
import { createOpenClawCodingTools } from "../pi-tools.js";
import { createHostSandboxFsBridge } from "../test-helpers/host-sandbox-fs-bridge.js";
import { __testing, createImageTool, resolveImageModelConfigForTool } from "./image-tool.js";

vi.mock("../../media/fetch.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../media/fetch.js")>();
  return {
    ...actual,
    fetchRemoteMedia: vi.fn(async () => ({
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/woAAn8B9FD5fHAAAAAASUVORK5CYII=",
        "base64",
      ),
      contentType: "image/png",
      fileName: "type4-01-cover.png",
    })),
  };
});

async function writeAuthProfiles(agentDir: string, profiles: unknown) {
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(
    path.join(agentDir, "auth-profiles.json"),
    `${JSON.stringify(profiles, null, 2)}\n`,
    "utf8",
  );
}

const ONE_PIXEL_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/woAAn8B9FD5fHAAAAAASUVORK5CYII=";

async function withTempWorkspacePng(
  cb: (args: { workspaceDir: string; imagePath: string }) => Promise<void>,
) {
  const workspaceParent = await fs.mkdtemp(path.join(process.cwd(), ".openclaw-workspace-image-"));
  try {
    const workspaceDir = path.join(workspaceParent, "workspace");
    await fs.mkdir(workspaceDir, { recursive: true });
    const imagePath = path.join(workspaceDir, "photo.png");
    await fs.writeFile(imagePath, Buffer.from(ONE_PIXEL_PNG_B64, "base64"));
    await cb({ workspaceDir, imagePath });
  } finally {
    await fs.rm(workspaceParent, { recursive: true, force: true });
  }
}

function stubMinimaxOkFetch() {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers(),
    json: async () => ({
      content: "ok",
      base_resp: { status_code: 0, status_msg: "" },
    }),
  });
  // @ts-expect-error partial global
  global.fetch = fetch;
  vi.stubEnv("MINIMAX_API_KEY", "minimax-test");
  return fetch;
}

function createMinimaxImageConfig(): OpenClawConfig {
  return {
    agents: {
      defaults: {
        model: { primary: "minimax/MiniMax-M2.1" },
        imageModel: { primary: "minimax/MiniMax-VL-01" },
      },
    },
  };
}

async function writeSkillImageManifest(
  agentDir: string,
  entries: Array<{
    skill_key: string;
    file_path: string;
    content_type: string;
    description: string;
    storage_url: string;
  }>,
) {
  const manifestPath = path.join(agentDir, "skills", "carousel-designer", "references");
  await fs.mkdir(manifestPath, { recursive: true });
  await fs.writeFile(
    path.join(manifestPath, "images.json"),
    `${JSON.stringify(entries, null, 2)}\n`,
    "utf8",
  );
}

describe("image tool implicit imageModel config", () => {
  const priorFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("ANTHROPIC_OAUTH_TOKEN", "");
    vi.stubEnv("MINIMAX_API_KEY", "");
    vi.stubEnv("ZAI_API_KEY", "");
    vi.stubEnv("Z_AI_API_KEY", "");
    // Avoid implicit Copilot provider discovery hitting the network in tests.
    vi.stubEnv("COPILOT_GITHUB_TOKEN", "");
    vi.stubEnv("GH_TOKEN", "");
    vi.stubEnv("GITHUB_TOKEN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // @ts-expect-error global fetch cleanup
    global.fetch = priorFetch;
  });

  it("stays disabled without auth when no pairing is possible", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    const cfg: OpenClawConfig = {
      agents: { defaults: { model: { primary: "openai/gpt-5.2" } } },
    };
    expect(resolveImageModelConfigForTool({ cfg, agentDir })).toBeNull();
    expect(createImageTool({ config: cfg, agentDir })).toBeNull();
  });

  it("pairs minimax primary with MiniMax-VL-01 (and fallbacks) when auth exists", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    vi.stubEnv("MINIMAX_API_KEY", "minimax-test");
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-test");
    const cfg: OpenClawConfig = {
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.1" } } },
    };
    expect(resolveImageModelConfigForTool({ cfg, agentDir })).toEqual({
      primary: "minimax/MiniMax-VL-01",
      fallbacks: ["openai/gpt-5-mini", "anthropic/claude-opus-4-5"],
    });
    expect(createImageTool({ config: cfg, agentDir })).not.toBeNull();
  });

  it("pairs zai primary with glm-4.6v (and fallbacks) when auth exists", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    vi.stubEnv("ZAI_API_KEY", "zai-test");
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-test");
    const cfg: OpenClawConfig = {
      agents: { defaults: { model: { primary: "zai/glm-4.7" } } },
    };
    expect(resolveImageModelConfigForTool({ cfg, agentDir })).toEqual({
      primary: "zai/glm-4.6v",
      fallbacks: ["openai/gpt-5-mini", "anthropic/claude-opus-4-5"],
    });
    expect(createImageTool({ config: cfg, agentDir })).not.toBeNull();
  });

  it("pairs a custom provider when it declares an image-capable model", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    await writeAuthProfiles(agentDir, {
      version: 1,
      profiles: {
        "acme:default": { type: "api_key", provider: "acme", key: "sk-test" },
      },
    });
    const cfg: OpenClawConfig = {
      agents: { defaults: { model: { primary: "acme/text-1" } } },
      models: {
        providers: {
          acme: {
            models: [
              { id: "text-1", input: ["text"] },
              { id: "vision-1", input: ["text", "image"] },
            ],
          },
        },
      },
    };
    expect(resolveImageModelConfigForTool({ cfg, agentDir })).toEqual({
      primary: "acme/vision-1",
    });
    expect(createImageTool({ config: cfg, agentDir })).not.toBeNull();
  });

  it("prefers explicit agents.defaults.imageModel", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.1" },
          imageModel: { primary: "openai/gpt-5-mini" },
        },
      },
    };
    expect(resolveImageModelConfigForTool({ cfg, agentDir })).toEqual({
      primary: "openai/gpt-5-mini",
    });
  });

  it("keeps image tool available when primary model supports images (for explicit requests)", async () => {
    // When the primary model supports images, we still keep the tool available
    // because images are auto-injected into prompts. The tool description is
    // adjusted via modelHasVision to discourage redundant usage.
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          model: { primary: "acme/vision-1" },
          imageModel: { primary: "openai/gpt-5-mini" },
        },
      },
      models: {
        providers: {
          acme: {
            models: [{ id: "vision-1", input: ["text", "image"] }],
          },
        },
      },
    };
    // Tool should still be available for explicit image analysis requests
    expect(resolveImageModelConfigForTool({ cfg, agentDir })).toEqual({
      primary: "openai/gpt-5-mini",
    });
    const tool = createImageTool({ config: cfg, agentDir, modelHasVision: true });
    expect(tool).not.toBeNull();
    expect(tool?.description).toContain("Only use this tool when images were NOT already provided");
  });

  it("allows workspace images outside default local media roots", async () => {
    await withTempWorkspacePng(async ({ workspaceDir, imagePath }) => {
      const fetch = stubMinimaxOkFetch();
      const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
      try {
        const cfg = createMinimaxImageConfig();

        const withoutWorkspace = createImageTool({ config: cfg, agentDir });
        expect(withoutWorkspace).not.toBeNull();
        if (!withoutWorkspace) {
          throw new Error("expected image tool");
        }
        await expect(
          withoutWorkspace.execute("t0", {
            prompt: "Describe the image.",
            image: imagePath,
          }),
        ).rejects.toThrow(/Local media path is not under an allowed directory/i);

        const withWorkspace = createImageTool({ config: cfg, agentDir, workspaceDir });
        expect(withWorkspace).not.toBeNull();
        if (!withWorkspace) {
          throw new Error("expected image tool");
        }

        await expect(
          withWorkspace.execute("t1", {
            prompt: "Describe the image.",
            image: imagePath,
          }),
        ).resolves.toMatchObject({
          content: [{ type: "text", text: "ok" }],
        });

        expect(fetch).toHaveBeenCalledTimes(1);
      } finally {
        await fs.rm(agentDir, { recursive: true, force: true });
      }
    });
  });

  it("allows workspace images via createOpenClawCodingTools default workspace root", async () => {
    await withTempWorkspacePng(async ({ imagePath }) => {
      const fetch = stubMinimaxOkFetch();
      const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-"));
      try {
        const cfg = createMinimaxImageConfig();

        const tools = createOpenClawCodingTools({ config: cfg, agentDir });
        const tool = tools.find((candidate) => candidate.name === "image");
        expect(tool).not.toBeNull();
        if (!tool) {
          throw new Error("expected image tool");
        }

        await expect(
          tool.execute("t1", {
            prompt: "Describe the image.",
            image: imagePath,
          }),
        ).resolves.toMatchObject({
          content: [{ type: "text", text: "ok" }],
        });

        expect(fetch).toHaveBeenCalledTimes(1);
      } finally {
        await fs.rm(agentDir, { recursive: true, force: true });
      }
    });
  });

  it("sandboxes image paths like the read tool", async () => {
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-sandbox-"));
    const agentDir = path.join(stateDir, "agent");
    const sandboxRoot = path.join(stateDir, "sandbox");
    await fs.mkdir(agentDir, { recursive: true });
    await fs.mkdir(sandboxRoot, { recursive: true });
    await fs.writeFile(path.join(sandboxRoot, "img.png"), "fake", "utf8");
    const sandbox = { root: sandboxRoot, bridge: createHostSandboxFsBridge(sandboxRoot) };

    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    const cfg: OpenClawConfig = {
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.1" } } },
    };
    const tool = createImageTool({ config: cfg, agentDir, sandbox });
    expect(tool).not.toBeNull();
    if (!tool) {
      throw new Error("expected image tool");
    }

    await expect(tool.execute("t1", { image: "https://example.com/a.png" })).rejects.toThrow(
      /Sandboxed image tool does not allow remote URLs/i,
    );

    await expect(tool.execute("t2", { image: "../escape.png" })).rejects.toThrow(
      /escapes sandbox root/i,
    );
  });

  it("rewrites inbound absolute paths into sandbox media/inbound", async () => {
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-image-sandbox-"));
    const agentDir = path.join(stateDir, "agent");
    const sandboxRoot = path.join(stateDir, "sandbox");
    await fs.mkdir(agentDir, { recursive: true });
    await fs.mkdir(path.join(sandboxRoot, "media", "inbound"), {
      recursive: true,
    });
    const pngB64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/woAAn8B9FD5fHAAAAAASUVORK5CYII=";
    await fs.writeFile(
      path.join(sandboxRoot, "media", "inbound", "photo.png"),
      Buffer.from(pngB64, "base64"),
    );

    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => ({
        content: "ok",
        base_resp: { status_code: 0, status_msg: "" },
      }),
    });
    // @ts-expect-error partial global
    global.fetch = fetch;
    vi.stubEnv("MINIMAX_API_KEY", "minimax-test");

    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.1" },
          imageModel: { primary: "minimax/MiniMax-VL-01" },
        },
      },
    };
    const sandbox = { root: sandboxRoot, bridge: createHostSandboxFsBridge(sandboxRoot) };
    const tool = createImageTool({ config: cfg, agentDir, sandbox });
    expect(tool).not.toBeNull();
    if (!tool) {
      throw new Error("expected image tool");
    }

    const res = await tool.execute("t1", {
      prompt: "Describe the image.",
      image: "@/Users/steipete/.openclaw/media/inbound/photo.png",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect((res.details as { rewrittenFrom?: string }).rewrittenFrom).toContain("photo.png");
  });
});

describe("image tool data URL support", () => {
  it("decodes base64 image data URLs", () => {
    const pngB64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/woAAn8B9FD5fHAAAAAASUVORK5CYII=";
    const out = __testing.decodeDataUrl(`data:image/png;base64,${pngB64}`);
    expect(out.kind).toBe("image");
    expect(out.mimeType).toBe("image/png");
    expect(out.buffer.length).toBeGreaterThan(0);
  });

  it("rejects non-image data URLs", () => {
    expect(() => __testing.decodeDataUrl("data:text/plain;base64,SGVsbG8=")).toThrow(
      /Unsupported data URL type/i,
    );
  });
});

describe("image tool skill image references", () => {
  const priorFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("MINIMAX_API_KEY", "minimax-test");
    vi.stubEnv("COPILOT_GITHUB_TOKEN", "");
    vi.stubEnv("GH_TOKEN", "");
    vi.stubEnv("GITHUB_TOKEN", "");
    vi.mocked(fetchRemoteMedia).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // @ts-expect-error global fetch cleanup
    global.fetch = priorFetch;
  });

  it("resolves skill:// references through the manifest and caches fetched bytes", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-skill-image-"));
    try {
      await writeSkillImageManifest(agentDir, [
        {
          skill_key: "carousel-designer",
          file_path: "references/type4-01-cover.png",
          content_type: "image/png",
          description: "Type 4 Cover",
          storage_url:
            "https://abc.supabase.co/storage/v1/object/public/skill-assets/type4-01-cover.png",
        },
      ]);
      const fetch = vi.fn(async () => {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          headers: new Headers(),
          json: async () => ({
            content: "ok",
            base_resp: { status_code: 0, status_msg: "" },
          }),
        };
      });
      // @ts-expect-error partial global
      global.fetch = fetch;

      const tool = createImageTool({
        config: createMinimaxImageConfig(),
        agentDir,
      });
      expect(tool).not.toBeNull();
      if (!tool) {
        throw new Error("expected image tool");
      }

      await expect(
        tool.execute("t1", {
          prompt: "Describe the layout.",
          image: "skill://carousel-designer/references/type4-01-cover.png",
        }),
      ).resolves.toMatchObject({
        content: [{ type: "text", text: "ok" }],
      });
      await expect(
        tool.execute("t2", {
          prompt: "Describe it again.",
          image: "skill://carousel-designer/references/type4-01-cover.png",
        }),
      ).resolves.toMatchObject({
        content: [{ type: "text", text: "ok" }],
      });

      expect(fetchRemoteMedia).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      await fs.rm(agentDir, { recursive: true, force: true });
    }
  });

  it("returns clear errors for missing skill image manifests", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-skill-image-"));
    try {
      const tool = createImageTool({ config: createMinimaxImageConfig(), agentDir });
      expect(tool).not.toBeNull();
      if (!tool) {
        throw new Error("expected image tool");
      }
      await expect(
        tool.execute("t1", {
          image: "skill://carousel-designer/references/missing.png",
        }),
      ).rejects.toThrow(/Missing skill image manifest/i);
    } finally {
      await fs.rm(agentDir, { recursive: true, force: true });
    }
  });

  it("falls back to DB-backed skill image manifests", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-skill-image-"));
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: `${JSON.stringify(
            [
              {
                skill_key: "carousel-designer",
                file_path: "references/type4-01-cover.png",
                content_type: "image/png",
                description: "Type 4 Cover",
                storage_url:
                  "https://abc.supabase.co/storage/v1/object/public/skill-assets/type4-01-cover.png",
              },
            ],
            null,
            2,
          )}\n`,
          content_type: "application/json",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    // @ts-expect-error partial global
    global.fetch = fetch;
    try {
      const manifest = await __testing.readSkillImageManifest({
        agentDir,
        skillKey: "carousel-designer",
        dbSkillResolver: {
          backendUrl: "http://agent-api.local",
          sessionKey: "agent:vibey:vibey-user-conversation",
        },
      });

      expect(manifest).toEqual([
        {
          skill_key: "carousel-designer",
          file_path: "references/type4-01-cover.png",
          content_type: "image/png",
          description: "Type 4 Cover",
          storage_url:
            "https://abc.supabase.co/storage/v1/object/public/skill-assets/type4-01-cover.png",
        },
      ]);
      expect(fetch).toHaveBeenCalledWith(
        "http://agent-api.local/api/agents/runtime-skills/read",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            skill_key: "carousel-designer",
            path: "references/images.json",
          }),
        }),
      );
    } finally {
      await fs.rm(agentDir, { recursive: true, force: true });
    }
  });

  it("returns clear errors for missing manifest image paths", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-skill-image-"));
    try {
      await writeSkillImageManifest(agentDir, [
        {
          skill_key: "carousel-designer",
          file_path: "references/type4-01-cover.png",
          content_type: "image/png",
          description: "Type 4 Cover",
          storage_url:
            "https://abc.supabase.co/storage/v1/object/public/skill-assets/type4-01-cover.png",
        },
      ]);
      const tool = createImageTool({ config: createMinimaxImageConfig(), agentDir });
      expect(tool).not.toBeNull();
      if (!tool) {
        throw new Error("expected image tool");
      }
      await expect(
        tool.execute("t1", {
          image: "skill://carousel-designer/references/missing.png",
        }),
      ).rejects.toThrow(/Skill image reference not found/i);
    } finally {
      await fs.rm(agentDir, { recursive: true, force: true });
    }
  });

  it("rejects non-image manifest entries", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-skill-image-"));
    try {
      await writeSkillImageManifest(agentDir, [
        {
          skill_key: "carousel-designer",
          file_path: "references/readme.txt",
          content_type: "text/plain",
          description: "Text",
          storage_url: "https://abc.supabase.co/storage/v1/object/public/skill-assets/readme.txt",
        },
      ]);
      const tool = createImageTool({ config: createMinimaxImageConfig(), agentDir });
      expect(tool).not.toBeNull();
      if (!tool) {
        throw new Error("expected image tool");
      }
      await expect(
        tool.execute("t1", {
          image: "skill://carousel-designer/references/readme.txt",
        }),
      ).rejects.toThrow(/not an image/i);
    } finally {
      await fs.rm(agentDir, { recursive: true, force: true });
    }
  });

  it("rejects non-Supabase skill image URLs", async () => {
    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-skill-image-"));
    try {
      await writeSkillImageManifest(agentDir, [
        {
          skill_key: "carousel-designer",
          file_path: "references/type4-01-cover.png",
          content_type: "image/png",
          description: "Type 4 Cover",
          storage_url: "https://example.com/type4-01-cover.png",
        },
      ]);
      const tool = createImageTool({ config: createMinimaxImageConfig(), agentDir });
      expect(tool).not.toBeNull();
      if (!tool) {
        throw new Error("expected image tool");
      }
      await expect(
        tool.execute("t1", {
          image: "skill://carousel-designer/references/type4-01-cover.png",
        }),
      ).rejects.toThrow(/Supabase Storage/i);
    } finally {
      await fs.rm(agentDir, { recursive: true, force: true });
    }
  });
});

describe("image tool MiniMax VLM routing", () => {
  const pngB64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/woAAn8B9FD5fHAAAAAASUVORK5CYII=";
  const priorFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("MINIMAX_API_KEY", "");
    vi.stubEnv("COPILOT_GITHUB_TOKEN", "");
    vi.stubEnv("GH_TOKEN", "");
    vi.stubEnv("GITHUB_TOKEN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // @ts-expect-error global fetch cleanup
    global.fetch = priorFetch;
  });

  it("calls /v1/coding_plan/vlm for minimax image models", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => ({
        content: "ok",
        base_resp: { status_code: 0, status_msg: "" },
      }),
    });
    // @ts-expect-error partial global
    global.fetch = fetch;

    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-minimax-vlm-"));
    vi.stubEnv("MINIMAX_API_KEY", "minimax-test");
    const cfg: OpenClawConfig = {
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.1" } } },
    };
    const tool = createImageTool({ config: cfg, agentDir });
    expect(tool).not.toBeNull();
    if (!tool) {
      throw new Error("expected image tool");
    }

    const res = await tool.execute("t1", {
      prompt: "Describe the image.",
      image: `data:image/png;base64,${pngB64}`,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://api.minimax.io/v1/coding_plan/vlm");
    expect(init?.method).toBe("POST");
    expect(String((init?.headers as Record<string, string>)?.Authorization)).toBe(
      "Bearer minimax-test",
    );
    expect(String(init?.body)).toContain('"prompt":"Describe the image."');
    expect(String(init?.body)).toContain('"image_url":"data:image/png;base64,');

    const text = res.content?.find((b) => b.type === "text")?.text ?? "";
    expect(text).toBe("ok");
  });

  it("surfaces MiniMax API errors from /v1/coding_plan/vlm", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: async () => ({
        content: "",
        base_resp: { status_code: 1004, status_msg: "bad key" },
      }),
    });
    // @ts-expect-error partial global
    global.fetch = fetch;

    const agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-minimax-vlm-"));
    vi.stubEnv("MINIMAX_API_KEY", "minimax-test");
    const cfg: OpenClawConfig = {
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.1" } } },
    };
    const tool = createImageTool({ config: cfg, agentDir });
    expect(tool).not.toBeNull();
    if (!tool) {
      throw new Error("expected image tool");
    }

    await expect(
      tool.execute("t1", {
        prompt: "Describe the image.",
        image: `data:image/png;base64,${pngB64}`,
      }),
    ).rejects.toThrow(/MiniMax VLM API error/i);
  });
});

describe("image tool response validation", () => {
  it("caps image-tool max tokens by model capability", () => {
    expect(__testing.resolveImageToolMaxTokens(4000)).toBe(4000);
  });

  it("keeps requested image-tool max tokens when model capability is higher", () => {
    expect(__testing.resolveImageToolMaxTokens(8192)).toBe(4096);
  });

  it("falls back to requested image-tool max tokens when model capability is missing", () => {
    expect(__testing.resolveImageToolMaxTokens(undefined)).toBe(4096);
  });

  it("rejects image-model responses with no final text", () => {
    expect(() =>
      __testing.coerceImageAssistantText({
        provider: "openai",
        model: "gpt-5-mini",
        message: {
          role: "assistant",
          api: "openai-responses",
          provider: "openai",
          model: "gpt-5-mini",
          stopReason: "stop",
          timestamp: Date.now(),
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              total: 0,
            },
          },
          content: [{ type: "thinking", thinking: "hmm" }],
        },
      }),
    ).toThrow(/returned no text/i);
  });

  it("surfaces provider errors from image-model responses", () => {
    expect(() =>
      __testing.coerceImageAssistantText({
        provider: "openai",
        model: "gpt-5-mini",
        message: {
          role: "assistant",
          api: "openai-responses",
          provider: "openai",
          model: "gpt-5-mini",
          stopReason: "error",
          errorMessage: "boom",
          timestamp: Date.now(),
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
              total: 0,
            },
          },
          content: [],
        },
      }),
    ).toThrow(/boom/i);
  });

  it("returns trimmed text from image-model responses", () => {
    const text = __testing.coerceImageAssistantText({
      provider: "anthropic",
      model: "claude-opus-4-5",
      message: {
        role: "assistant",
        api: "anthropic-messages",
        provider: "anthropic",
        model: "claude-opus-4-5",
        stopReason: "stop",
        timestamp: Date.now(),
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            total: 0,
          },
        },
        content: [{ type: "text", text: "  hello  " }],
      },
    });
    expect(text).toBe("hello");
  });
});
