import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { agentCommand, getFreePort, installGatewayTestHooks } from "./test-helpers.js";

installGatewayTestHooks({ scope: "suite" });

let server: Awaited<ReturnType<typeof startServer>>;
let port: number;

beforeAll(async () => {
  port = await getFreePort();
  server = await startServer(port);
});

afterAll(async () => {
  await server.close({ reason: "rbac filter suite done" });
});

async function startServer(targetPort: number) {
  const { startGatewayServer } = await import("./server.js");
  return await startGatewayServer(targetPort, {
    host: "127.0.0.1",
    auth: { mode: "token", token: "secret" },
    controlUiEnabled: false,
    openResponsesEnabled: true,
  });
}

async function postResponses(body: unknown) {
  return await fetch(`http://127.0.0.1:${port}/v1/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer secret",
    },
    body: JSON.stringify(body),
  });
}

describe("OpenResponses RBAC filter fields", () => {
  it("disables both client and native tools when tool_choice is none", async () => {
    agentCommand.mockReset();
    agentCommand.mockResolvedValueOnce({ payloads: [{ text: "ok" }] } as never);

    const res = await postResponses({
      model: "openclaw",
      input: "analyze the supplied data only",
      tools: [
        {
          type: "function",
          function: { name: "search_external_context", description: "Search context" },
        },
      ],
      tool_choice: "none",
    });

    expect(res.status).toBe(200);
    await res.text();
    const [opts] = agentCommand.mock.calls[0] ?? [];
    expect((opts as { clientTools?: unknown[] } | undefined)?.clientTools).toBeUndefined();
    expect((opts as { disableTools?: boolean } | undefined)?.disableTools).toBe(true);
  });

  it("passes enabled_toolkits and disabled_native_actions into agent command", async () => {
    agentCommand.mockReset();
    agentCommand.mockResolvedValueOnce({ payloads: [{ text: "ok" }] } as never);

    const res = await postResponses({
      model: "openclaw",
      input: "hi",
      enabled_toolkits: ["gmail"],
      disabled_native_actions: ["search_memory", "get_campaign"],
    });

    expect(res.status).toBe(200);
    await res.text();
    const [opts] = agentCommand.mock.calls[0] ?? [];
    expect((opts as { enabledToolkits?: string[] } | undefined)?.enabledToolkits).toEqual([
      "gmail",
    ]);
    expect(
      (opts as { disabledNativeActions?: string[] } | undefined)?.disabledNativeActions,
    ).toEqual(["search_memory", "get_campaign"]);
  });
});
