import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAgentIds: vi.fn(),
  resolveDefaultAgentId: vi.fn(),
  resolveAgentWorkspaceDir: vi.fn(),
}));

vi.mock("../agents/agent-scope.js", () => ({
  listAgentIds: mocks.listAgentIds,
  resolveDefaultAgentId: mocks.resolveDefaultAgentId,
  resolveAgentWorkspaceDir: mocks.resolveAgentWorkspaceDir,
}));

const { listAgentsForGateway } = await import("./session-utils.js");

describe("listAgentsForGateway", () => {
  it("includes runtime dynamic agent ids beyond static config list", () => {
    mocks.resolveDefaultAgentId.mockReturnValue("manager");
    mocks.listAgentIds.mockReturnValue(["manager", "hr", "new_hire"]);
    mocks.resolveAgentWorkspaceDir.mockReturnValue("/tmp/agent");

    const result = listAgentsForGateway({
      session: { mainKey: "main", scope: "per-sender" },
      agents: {
        list: [
          { id: "manager", name: "Manager" },
          { id: "hr", name: "HR" },
        ],
      },
    } as unknown);

    expect(result.agents.map((a) => a.id)).toEqual(["manager", "hr", "new_hire", "main"]);
  });
});
