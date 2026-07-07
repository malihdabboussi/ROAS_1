import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listDynamicAgentIds: vi.fn(),
}));

vi.mock("./dynamic-registry.js", () => ({
  listDynamicAgentIds: mocks.listDynamicAgentIds,
}));

const { listAgentIds, resolveAgentWorkspaceDir } = await import("./agent-scope.js");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("listAgentIds", () => {
  it("merges default + static + dynamic ids deterministically", () => {
    mocks.listDynamicAgentIds.mockReturnValue(["designer_2", "manager"]);
    const cfg = {
      agents: {
        list: [{ id: "manager" }, { id: "hr" }],
      },
    };

    const ids = listAgentIds(cfg as Parameters<typeof listAgentIds>[0]);
    expect(ids).toEqual(["manager", "hr", "designer_2"]);
  });
});

describe("resolveAgentWorkspaceDir", () => {
  it("expands AGENTS_BASE_DIR workspace templates inside OpenClaw", () => {
    vi.stubEnv("AGENTS_BASE_DIR", "/app/agents");

    const workspace = resolveAgentWorkspaceDir(
      {
        agents: {
          list: [
            {
              id: "org-19847dc5-a29a-4684-87d0-4cf6560baa10-vibey",
              workspace: "${AGENTS_BASE_DIR}/orgs/19847dc5-a29a-4684-87d0-4cf6560baa10/vibey",
            },
          ],
        },
      } as Parameters<typeof resolveAgentWorkspaceDir>[0],
      "org-19847dc5-a29a-4684-87d0-4cf6560baa10-vibey",
    );

    expect(workspace).toBe(
      path.join("/app/agents", "orgs", "19847dc5-a29a-4684-87d0-4cf6560baa10", "vibey"),
    );
  });
});
