import type { WebClient } from "@slack/web-api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadConfig } = vi.hoisted(() => ({
  loadConfig: vi.fn(() => ({
    channels: { slack: { botToken: "xoxb-config" } },
  })),
}));

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig,
  };
});

const { sendMessageSlack } = await import("./send.js");

function createSlackClientMock() {
  return {
    chat: {
      postMessage: vi.fn().mockResolvedValue({ ts: "1234.5678" }),
    },
    conversations: {
      open: vi.fn(),
    },
    files: {
      uploadV2: vi.fn(),
    },
  } as unknown as WebClient & {
    chat: { postMessage: ReturnType<typeof vi.fn> };
    conversations: { open: ReturnType<typeof vi.fn> };
    files: { uploadV2: ReturnType<typeof vi.fn> };
  };
}

describe("sendMessageSlack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadConfig.mockReturnValue({
      channels: { slack: { botToken: "xoxb-config" } },
    });
  });

  it("posts markdown tables as native Slack table blocks", async () => {
    const client = createSlackClientMock();

    await sendMessageSlack(
      "channel:C123",
      `
Intro text

| Name | Value |
| ---- | ----- |
| A    | 1     |
`.trim(),
      { client },
    );

    expect(client.chat.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "C123",
        text: expect.stringContaining("Intro text"),
        blocks: expect.arrayContaining([
          expect.objectContaining({ type: "table" }),
        ]),
      }),
    );
    expect(client.chat.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("| ---- | ----- |"),
      }),
    );
  });

  it("keeps non-table messages text-only", async () => {
    const client = createSlackClientMock();

    await sendMessageSlack("channel:C123", "**hello**", { client });

    expect(client.chat.postMessage).toHaveBeenCalledWith({
      channel: "C123",
      text: "*hello*",
      thread_ts: undefined,
    });
  });

  it("preserves native table blocks when retrying without custom identity", async () => {
    const client = createSlackClientMock();
    const missingScope = new Error("missing scope") as Error & {
      data: { error: string; needed: string };
    };
    missingScope.data = { error: "missing_scope", needed: "chat:write.customize" };
    client.chat.postMessage
      .mockRejectedValueOnce(missingScope)
      .mockResolvedValueOnce({ ts: "2345.6789" });

    await sendMessageSlack(
      "channel:C123",
      `
| Name | Value |
| ---- | ----- |
| A    | 1     |
`.trim(),
      {
        client,
        identity: { username: "Agent" },
      },
    );

    expect(client.chat.postMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        channel: "C123",
        blocks: expect.arrayContaining([expect.objectContaining({ type: "table" })]),
      }),
    );
    expect(client.chat.postMessage.mock.calls[1]?.[0]).not.toHaveProperty("username");
  });
});
