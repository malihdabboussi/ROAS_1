import { beforeEach, describe, expect, it } from "vitest";
import { classifyToolFailure } from "./platform-failure.js";
import { jsonResult } from "./tools/common.js";
import {
  preflightWorkflowToolCall,
  recordWorkflowToolResult,
  resetWorkflowCircuitForUserAction,
  resetWorkflowCircuitsForTests,
  type WorkflowCircuitContext,
} from "./workflow-circuit-breaker.js";

const context: WorkflowCircuitContext = {
  agentId: "agent-main",
  sessionKey: "conversation-1",
};

function failureResult(tool: string, errorText: string, fingerprint?: string) {
  const failure = classifyToolFailure({ errorText });
  return jsonResult({
    status: "error",
    tool,
    ...failure,
    observability: {
      ...failure.observability,
      fingerprint: fingerprint ?? failure.observability.fingerprint,
    },
  });
}

describe("workflow circuit breaker", () => {
  beforeEach(() => {
    resetWorkflowCircuitsForTests();
  });

  it("blocks an equivalent payload after a non-retryable failure", () => {
    const call = {
      ...context,
      toolName: "campaign_capability",
      params: { action: "generate_visual_html", data: { presentation_id: "deck-1" } },
    };

    expect(preflightWorkflowToolCall(call).allowed).toBe(true);
    recordWorkflowToolResult(call, failureResult("campaign_capability", "render failed"));

    const blocked = preflightWorkflowToolCall(call);

    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.workflowClass).toBe("presentation_render");
      expect(blocked.contract.error_code).toBe("WORKFLOW_CIRCUIT_OPEN");
      expect(blocked.contract.workflow_circuit.reason).toBe("non_retryable_equivalent_repeat");
      expect(blocked.contract.fallback).toBeNull();
      expect(blocked.contract.verified_recovery_options.length).toBeGreaterThan(0);
      expect(blocked.contract.user_explanation.sentence).not.toMatch(/platform|backend/i);
    }
  });

  it("allows a corrected payload while the workflow is only warning", () => {
    const failedCall = {
      ...context,
      toolName: "campaign_capability",
      params: { action: "generate_visual_html", data: { presentation_id: "deck-1" } },
    };
    recordWorkflowToolResult(failedCall, failureResult("campaign_capability", "render failed"));

    const corrected = preflightWorkflowToolCall({
      ...failedCall,
      params: { action: "generate_visual_html", data: { presentation_id: "deck-2" } },
    });

    expect(corrected.allowed).toBe(true);
    expect(corrected.state).toBe("warning");
  });

  it("blocks unchanged payloads after retry-with-corrected-payload failures", () => {
    const call = {
      ...context,
      toolName: "browser",
      params: { action: "navigate" },
    };

    recordWorkflowToolResult(call, failureResult("browser", "url required"));

    const corrected = preflightWorkflowToolCall({
      ...call,
      params: { action: "navigate", url: "https://example.com" },
    });
    const blocked = preflightWorkflowToolCall(call);

    expect(corrected.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
  });

  it("opens after adjacent failures in the same workflow class", () => {
    const calls = [
      { action: "generate_visual_html", data: { deck: "a" } },
      { action: "show_presentation_file", data: { deck: "a" } },
      { action: "update_presentation", data: { deck: "a" } },
      { action: "create_presentation", data: { deck: "a" } },
    ].map((params) => ({
      ...context,
      toolName: "campaign_capability",
      params,
    }));

    calls.forEach((call, index) => {
      expect(preflightWorkflowToolCall(call).allowed).toBe(true);
      recordWorkflowToolResult(
        call,
        failureResult("campaign_capability", `temporary failure ${index}`, `test.${index}`),
      );
    });

    const blocked = preflightWorkflowToolCall({
      ...context,
      toolName: "campaign_capability",
      params: { action: "generate_visual_html", data: { deck: "b" } },
    });

    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.contract.workflow_circuit.reason).toBe("workflow_failure_budget_exceeded");
    }
  });

  it("allows one half-open recovery attempt after user action", () => {
    const call = {
      ...context,
      toolName: "campaign_capability",
      params: { action: "generate_visual_html", data: { presentation_id: "deck-1" } },
    };
    recordWorkflowToolResult(call, failureResult("campaign_capability", "render failed"));
    expect(preflightWorkflowToolCall(call).allowed).toBe(false);

    resetWorkflowCircuitForUserAction(context, "presentation_render");
    const recovery = {
      ...call,
      params: { action: "generate_visual_html", data: { presentation_id: "deck-2" } },
    };
    const halfOpen = preflightWorkflowToolCall(recovery);
    expect(halfOpen.allowed).toBe(true);
    expect(halfOpen.state).toBe("half_open");

    recordWorkflowToolResult(recovery, failureResult("campaign_capability", "render failed again"));
    const blocked = preflightWorkflowToolCall(recovery);

    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.contract.workflow_circuit.reason).toBe("half_open_recovery_failed");
    }
  });

  it("does not let failed agent-brain reads open the campaign-brain circuit", () => {
    const agentFail = {
      ...context,
      toolName: "campaign_capability",
      params: { action: "search_agent_brain", data: { query: "offer", brain_id: "missing" } },
    };
    for (let i = 0; i < 4; i += 1) {
      recordWorkflowToolResult(
        agentFail,
        failureResult("campaign_capability", `agent brain missing ${i}`, `agent.${i}`),
      );
    }

    const agentBlocked = preflightWorkflowToolCall(agentFail);
    expect(agentBlocked.allowed).toBe(false);
    if (!agentBlocked.allowed) {
      expect(agentBlocked.workflowClass).toBe("brain_agent_read");
    }

    const campaignRead = preflightWorkflowToolCall({
      ...context,
      toolName: "campaign_capability",
      params: {
        action: "search_campaign_brain",
        data: { query: "offer pricing", campaign_id: "impact" },
      },
    });
    expect(campaignRead.allowed).toBe(true);
    expect(campaignRead.workflowClass).toBe("brain_campaign_read");
  });
});
