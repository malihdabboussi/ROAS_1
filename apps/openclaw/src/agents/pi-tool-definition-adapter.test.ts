import type { AgentTool } from "@mariozechner/pi-agent-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toClientToolDefinitions, toToolDefinitions } from "./pi-tool-definition-adapter.js";
import { classifyToolFailure } from "./platform-failure.js";
import { jsonResult } from "./tools/common.js";
import {
  recordWorkflowToolResult,
  resetWorkflowCircuitsForTests,
} from "./workflow-circuit-breaker.js";

describe("toToolDefinitions", () => {
  beforeEach(() => {
    resetWorkflowCircuitsForTests();
  });

  it("accepts JSON strings for object fields and executes with parsed objects", async () => {
    const execute = vi.fn(async (_id: string, params: unknown) => ({
      content: [{ type: "text" as const, text: "ok" }],
      details: params,
    }));
    const tool = {
      name: "campaign_capability",
      description: "test",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string" },
          data: {
            type: "object",
            properties: {
              target_agent_key: { type: "string" },
              task_description: { type: "string" },
            },
            required: ["target_agent_key", "task_description"],
            additionalProperties: true,
          },
          prompt: { type: "string" },
        },
        required: ["action", "data"],
        additionalProperties: false,
      },
      execute,
    } satisfies AgentTool<Record<string, unknown>, unknown>;

    const [definition] = toToolDefinitions([tool]);

    expect(definition.parameters).toMatchObject({
      properties: {
        data: {
          type: ["object", "string"],
        },
        prompt: {
          type: "string",
        },
      },
    });

    const result = await definition.execute("call-1", {
      action: "delegate_to_agent",
      data: JSON.stringify({
        target_agent_key: "lux",
        task_description: "Build the brand board",
      }),
      prompt: '{"keep":"as string"}',
    });

    expect(result.details).toEqual({
      action: "delegate_to_agent",
      data: {
        target_agent_key: "lux",
        task_description: "Build the brand board",
      },
      prompt: '{"keep":"as string"}',
    });
    expect(execute).toHaveBeenCalledWith(
      "call-1",
      {
        action: "delegate_to_agent",
        data: {
          target_agent_key: "lux",
          task_description: "Build the brand board",
        },
        prompt: '{"keep":"as string"}',
      },
      undefined,
      undefined,
    );
  });

  it("returns a validation error when JSON string coercion does not match the schema", async () => {
    const tool = {
      name: "campaign_capability",
      description: "test",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string" },
          data: { type: "object", additionalProperties: true },
        },
        required: ["action", "data"],
        additionalProperties: false,
      },
      execute: vi.fn(async () => ({
        content: [{ type: "text" as const, text: "ok" }],
      })),
    } satisfies AgentTool<Record<string, unknown>, unknown>;

    const [definition] = toToolDefinitions([tool]);
    const result = await definition.execute("call-1", {
      action: "delegate_to_agent",
      data: "[1,2,3]",
    });

    expect(result.details).toMatchObject({
      status: "error",
      tool: "campaign_capability",
      success: false,
      error_code: "TOOL_VALIDATION_ERROR",
      error_class: "validation_error",
      reliability: "probable",
      effect_state: "failed_before_effect",
      retry_policy: {
        mode: "retry_with_corrected_payload",
        max_attempts: 1,
        stop_after_same_error: true,
      },
      correction: {
        summary: "Correct the missing or invalid tool input before retrying.",
      },
      user_explanation: {
        intent: "ask_for_missing_input",
        sentence: "I need one more detail to complete that step.",
      },
      forbidden_user_framing: expect.arrayContaining(["platform error", "internal issue"]),
    });
    expect(String((result.details as { error?: unknown }).error)).toContain(
      'Validation failed for tool "campaign_capability"',
    );
    const details = result.details as {
      agent_instruction?: unknown;
      user_explanation?: { sentence?: unknown };
    };
    expect(typeof details.agent_instruction).toBe("string");
    expect(String(details.user_explanation?.sentence)).not.toMatch(/platform|internal/i);
    expect(tool.execute).not.toHaveBeenCalled();
  });

  it("normalizes returned error-shaped tool results into the same contract", async () => {
    const tool = {
      name: "sessions_send",
      description: "test",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: true,
      },
      execute: vi.fn(async () => ({
        content: [{ type: "text" as const, text: '{"status":"error"}' }],
        details: {
          runId: "run-1",
          status: "error",
          error: "Session not visible from this sandboxed agent session.",
        },
      })),
    } satisfies AgentTool<Record<string, unknown>, unknown>;

    const [definition] = toToolDefinitions([tool]);
    const result = await definition.execute("call-2", {});

    expect(result.details).toMatchObject({
      runId: "run-1",
      status: "error",
      tool: "sessions_send",
      success: false,
      error: "Session not visible from this sandboxed agent session.",
      error_code: "TOOL_ACCESS_BLOCKED",
      error_class: "permission_denied",
      retry_policy: {
        mode: "do_not_retry_needs_user_action",
        max_attempts: 0,
        stop_after_same_error: true,
      },
      user_explanation: {
        intent: "explain_access_limit",
        sentence: "I could not complete that step with the current access.",
      },
    });
    const details = result.details as { user_explanation?: { sentence?: unknown } };
    expect(String(details.user_explanation?.sentence)).not.toMatch(/platform|internal/i);
  });

  it("blocks repeated non-retryable workflow calls before executing the tool again", async () => {
    const execute = vi.fn(async () => {
      throw new Error("render failed");
    });
    const tool = {
      name: "campaign_capability",
      description: "test",
      parameters: {
        type: "object",
        properties: { action: { type: "string" }, data: { type: "object" } },
        required: ["action", "data"],
        additionalProperties: true,
      },
      execute,
    } satisfies AgentTool<Record<string, unknown>, unknown>;
    const [definition] = toToolDefinitions([tool], {
      workflowCircuit: { agentId: "main", sessionKey: "conversation-1" },
    });
    const params = {
      action: "generate_visual_html",
      data: { presentation_id: "deck-1" },
    };

    const first = await definition.execute("call-1", params);
    const second = await definition.execute("call-2", params);

    expect(first.details).toMatchObject({ status: "error", error_code: "TOOL_SYSTEM_FAULT" });
    expect(second.details).toMatchObject({
      status: "error",
      error_code: "WORKFLOW_CIRCUIT_OPEN",
      error_class: "workflow_circuit_open",
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("blocks delegated client tools before handing off repeated failed payloads", async () => {
    const failure = classifyToolFailure({ errorText: "client execution failed" });
    recordWorkflowToolResult(
      {
        agentId: "main",
        sessionKey: "conversation-1",
        toolName: "web_search",
        params: { query: "same query" },
      },
      jsonResult({
        status: "error",
        tool: "web_search",
        ...failure,
      }),
    );
    const onClientToolCall = vi.fn();
    const [definition] = toClientToolDefinitions(
      [
        {
          type: "function",
          function: {
            name: "web_search",
            description: "Search",
            parameters: { type: "object", properties: { query: { type: "string" } } },
          },
        },
      ],
      onClientToolCall,
      { agentId: "main", sessionKey: "conversation-1" },
    );

    const result = await definition.execute("client-call-1", { query: "same query" });

    expect(result.details).toMatchObject({
      status: "error",
      error_code: "WORKFLOW_CIRCUIT_OPEN",
    });
    expect(onClientToolCall).not.toHaveBeenCalled();
  });
});
