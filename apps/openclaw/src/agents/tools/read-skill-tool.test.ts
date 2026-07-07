import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createReadSkillTool } from "./read-skill-tool.js";

async function makeDiskSkill() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "read-skill-"));
  const skillDir = path.join(root, "skills", "demo-skill");
  await fs.mkdir(path.join(skillDir, "references"), { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    "---\nname: demo-skill\ndescription: Demo\n---\n\n# Demo\n",
    "utf8",
  );
  await fs.writeFile(path.join(skillDir, "references", "example.md"), "# Example\n", "utf8");
  return {
    root,
    snapshot: {
      prompt: "",
      skills: [{ name: "demo-skill" }],
      resolvedSkills: [
        {
          name: "demo-skill",
          description: "Demo",
          filePath: path.join(skillDir, "SKILL.md"),
          baseDir: skillDir,
          source: "test",
        },
      ],
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("read_skill tool", () => {
  it("reads a disk skill main SKILL.md", async () => {
    const { snapshot } = await makeDiskSkill();
    const tool = createReadSkillTool({ skillsSnapshot: snapshot });

    const result = await tool.execute("call-1", { id: "disk:demo-skill" });

    expect(result.content?.[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("# Demo"),
    });
    expect(result.details).toMatchObject({ id: "disk:demo-skill", source: "disk" });
  });

  it("reads a disk skill relative resource", async () => {
    const { snapshot } = await makeDiskSkill();
    const tool = createReadSkillTool({ skillsSnapshot: snapshot });

    const result = await tool.execute("call-1", {
      id: "disk:demo-skill",
      path: "references/example.md",
    });

    expect(result.content?.[0]).toMatchObject({ type: "text", text: "# Example\n" });
  });

  it("rejects unknown IDs and path traversal", async () => {
    const { snapshot } = await makeDiskSkill();
    const tool = createReadSkillTool({ skillsSnapshot: snapshot });

    await expect(tool.execute("call-1", { id: "disk:missing" })).rejects.toThrow(
      /Unknown skill id/,
    );
    await expect(
      tool.execute("call-2", { id: "disk:demo-skill", path: "../outside.md" }),
    ).rejects.toThrow(/Unsafe skill resource path/);
  });

  it("calls the internal DB skill endpoint for db IDs", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          skill_key: "db-skill",
          content: "# DB Skill\n",
          content_type: "text/markdown",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const tool = createReadSkillTool({
      backendUrl: "http://agent-api.local/",
      sessionKey: "agent:vibey:vibey-user-conversation",
    });

    const result = await tool.execute("call-1", {
      id: "db:db-skill",
      path: "references/example.md",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://agent-api.local/api/agents/runtime-skills/read",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-openclaw-internal": "true",
          "x-session-key": "agent:vibey:vibey-user-conversation",
        }),
        body: JSON.stringify({
          skill_key: "db-skill",
          path: "references/example.md",
        }),
      }),
    );
    expect(result.content?.[0]).toMatchObject({ type: "text", text: "# DB Skill\n" });
  });
});
