import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearDynamicAgentRegistryCache, listDynamicAgentIds } from "./dynamic-registry.js";

describe("dynamic agent registry", () => {
  let tmpDir = "";
  let prevAgentsBaseDir: string | undefined;

  beforeEach(async () => {
    prevAgentsBaseDir = process.env.AGENTS_BASE_DIR;
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-agents-"));
    process.env.AGENTS_BASE_DIR = tmpDir;
    clearDynamicAgentRegistryCache();
  });

  afterEach(async () => {
    clearDynamicAgentRegistryCache();
    if (prevAgentsBaseDir === undefined) {
      delete process.env.AGENTS_BASE_DIR;
    } else {
      process.env.AGENTS_BASE_DIR = prevAgentsBaseDir;
    }
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("lists only valid dynamic agents from AGENTS_BASE_DIR", async () => {
    await fs.mkdir(path.join(tmpDir, "new_hire"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "new_hire", "ROLE.md"), "# ROLE\n", "utf-8");

    await fs.mkdir(path.join(tmpDir, "templates"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "templates", "ROLE.md"), "# ROLE\n", "utf-8");

    await fs.mkdir(path.join(tmpDir, "missing_files"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "missing_files", "README.md"), "x", "utf-8");

    const ids = listDynamicAgentIds({});
    expect(ids).toEqual(["new_hire"]);
  });

  it("returns cached value within short ttl", async () => {
    await fs.mkdir(path.join(tmpDir, "agent_a"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "agent_a", "SOUL.md"), "# SOUL\n", "utf-8");

    const first = listDynamicAgentIds({});
    expect(first).toEqual(["agent_a"]);

    await fs.mkdir(path.join(tmpDir, "agent_b"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "agent_b", "SOUL.md"), "# SOUL\n", "utf-8");

    const second = listDynamicAgentIds({});
    expect(second).toEqual(["agent_a"]);
  });
});
