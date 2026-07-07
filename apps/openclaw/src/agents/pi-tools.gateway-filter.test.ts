import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePluginTools } from "../plugins/tools.js";
import { __testing } from "./pi-tools.js";

type MockRegistryToolEntry = {
  pluginId: string;
  optional: boolean;
  source: string;
  factory: (ctx: unknown) => unknown;
};

const loadOpenClawPluginsMock = vi.fn();

vi.mock("../plugins/loader.js", () => ({
  loadOpenClawPlugins: (params: unknown) => loadOpenClawPluginsMock(params),
}));

function makeTool(name: string, actions?: string[]) {
  return {
    name,
    description: `${name} tool`,
    parameters: {
      type: "object",
      properties: actions
        ? {
            action: {
              type: "string",
              enum: actions,
            },
          }
        : {},
    },
    async execute() {
      return { content: [{ type: "text", text: "ok" }] };
    },
  };
}

function createContext() {
  return {
    config: {
      plugins: {
        enabled: true,
        allow: ["gmail", "notion"],
        load: { paths: ["/tmp/plugin.js"] },
      },
    },
    workspaceDir: "/tmp",
  };
}

function setRegistry(entries: MockRegistryToolEntry[]) {
  loadOpenClawPluginsMock.mockReturnValue({
    tools: entries,
    diagnostics: [],
  });
}

describe("gateway tool filters", () => {
  beforeEach(() => {
    loadOpenClawPluginsMock.mockReset();
  });

  it("filters optional plugin tools by enabled toolkit id", () => {
    setRegistry([
      {
        pluginId: "gmail",
        optional: true,
        source: "/tmp/gmail.js",
        factory: () => makeTool("gmail_send"),
      },
      {
        pluginId: "notion",
        optional: true,
        source: "/tmp/notion.js",
        factory: () => makeTool("notion_search"),
      },
    ]);

    const pluginTools = resolvePluginTools({
      context: createContext() as never,
      toolAllowlist: ["group:plugins"],
    });
    const filtered = __testing.filterEnabledToolkitTools({
      tools: pluginTools as never,
      enabledToolkits: ["gmail"],
    });

    expect(filtered.map((tool) => tool.name)).toEqual(["gmail_send"]);
  });

  it("removes disabled native actions from vibey_backend action enum", () => {
    const [tool] = __testing.filterDisabledNativeActions({
      tools: [
        makeTool("vibey_backend", ["search_memory", "search_sk_entries", "get_campaign"]) as never,
      ],
      disabledNativeActions: ["search_memory", "get_campaign"],
    });

    expect(
      (
        (tool as Record<string, unknown>).parameters as {
          properties: { action: { enum: string[] } };
        }
      ).properties.action.enum.toSorted(),
    ).toEqual(["search_sk_entries"]);
  });
});
