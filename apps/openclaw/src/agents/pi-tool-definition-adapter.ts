import type {
  AgentTool,
  AgentToolResult,
  AgentToolUpdateCallback,
} from "@mariozechner/pi-agent-core";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { ClientToolDefinition } from "./pi-embedded-runner/run/params.js";
import { logDebug, logError } from "../logger.js";
import { getGlobalHookRunner } from "../plugins/hook-runner-global.js";
import { validateJsonSchemaValue } from "../plugins/schema-validator.js";
import { isPlainObject } from "../utils.js";
import {
  consumeAdjustedParamsForToolCall,
  isToolWrappedWithBeforeToolCallHook,
  runBeforeToolCallHook,
} from "./pi-tools.before-tool-call.js";
import { classifyToolFailure } from "./platform-failure.js";
import { normalizeToolName } from "./tool-policy.js";
import { jsonResult } from "./tools/common.js";
import {
  preflightWorkflowToolCall,
  recordWorkflowToolResult,
  type WorkflowCircuitContext,
} from "./workflow-circuit-breaker.js";

// oxlint-disable-next-line typescript/no-explicit-any
type AnyAgentTool = AgentTool<any, unknown>;

type ToolExecuteArgsCurrent = [
  string,
  unknown,
  AgentToolUpdateCallback<unknown> | undefined,
  unknown,
  AbortSignal | undefined,
];
type ToolExecuteArgsLegacy = [
  string,
  unknown,
  AbortSignal | undefined,
  AgentToolUpdateCallback<unknown> | undefined,
  unknown,
];
type ToolExecuteArgs = ToolDefinition["execute"] extends (...args: infer P) => unknown
  ? P
  : ToolExecuteArgsCurrent;
type ToolExecuteArgsAny = ToolExecuteArgs | ToolExecuteArgsLegacy | ToolExecuteArgsCurrent;
type JsonSchemaObject = Record<string, unknown>;
export type ToolDefinitionAdapterOptions = {
  workflowCircuit?: WorkflowCircuitContext;
};

function isAbortSignal(value: unknown): value is AbortSignal {
  return typeof value === "object" && value !== null && "aborted" in value;
}

function isLegacyToolExecuteArgs(args: ToolExecuteArgsAny): args is ToolExecuteArgsLegacy {
  const third = args[2];
  const fourth = args[3];
  return isAbortSignal(third) || typeof fourth === "function";
}

function describeToolExecutionError(err: unknown): {
  message: string;
  stack?: string;
} {
  if (err instanceof Error) {
    const message = err.message?.trim() ? err.message : String(err);
    return { message, stack: err.stack };
  }
  return { message: String(err) };
}

function isSchemaObject(value: unknown): value is JsonSchemaObject {
  return isPlainObject(value);
}

function schemaHasType(schema: JsonSchemaObject, type: "object" | "array"): boolean {
  const rawType = schema.type;
  if (rawType === type) {
    return true;
  }
  return Array.isArray(rawType) && rawType.includes(type);
}

function withStringType(schema: JsonSchemaObject): JsonSchemaObject {
  const rawType = schema.type;
  if (rawType === "string" || (Array.isArray(rawType) && rawType.includes("string"))) {
    return schema;
  }
  if (Array.isArray(rawType)) {
    return { ...schema, type: [...rawType, "string"] };
  }
  if (typeof rawType === "string") {
    return { ...schema, type: [rawType, "string"] };
  }
  return schema;
}

function makeJsonStringCoercibleSchema<T>(schema: T, depth = 0): T {
  if (!isSchemaObject(schema)) {
    return schema;
  }

  const next: JsonSchemaObject = { ...schema };

  if (isSchemaObject(next.properties)) {
    next.properties = Object.fromEntries(
      Object.entries(next.properties).map(([key, value]) => [
        key,
        makeJsonStringCoercibleSchema(value, depth + 1),
      ]),
    );
  }
  if (isSchemaObject(next.items)) {
    next.items = makeJsonStringCoercibleSchema(next.items, depth + 1);
  }
  if (isSchemaObject(next.additionalProperties)) {
    next.additionalProperties = makeJsonStringCoercibleSchema(next.additionalProperties, depth + 1);
  }
  for (const key of ["anyOf", "oneOf", "allOf"] as const) {
    if (Array.isArray(next[key])) {
      next[key] = next[key].map((entry) => makeJsonStringCoercibleSchema(entry, depth + 1));
    }
  }

  if (depth > 0 && (schemaHasType(next, "object") || schemaHasType(next, "array"))) {
    return withStringType(next) as T;
  }
  return next as T;
}

function parseJsonStringForSchema(value: unknown, schema: JsonSchemaObject): unknown {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return value;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (schemaHasType(schema, "object") && isPlainObject(parsed)) {
      return parsed;
    }
    if (schemaHasType(schema, "array") && Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return value;
  }
  return value;
}

function coerceJsonStringValue(value: unknown, schema: unknown): unknown {
  if (!isSchemaObject(schema)) {
    return value;
  }

  const parsed = parseJsonStringForSchema(value, schema);
  if (isPlainObject(parsed) && isSchemaObject(schema.properties)) {
    let changed = parsed !== value;
    const next: Record<string, unknown> = { ...parsed };
    for (const [key, childSchema] of Object.entries(schema.properties)) {
      if (!(key in next)) {
        continue;
      }
      const childValue = coerceJsonStringValue(next[key], childSchema);
      if (childValue !== next[key]) {
        next[key] = childValue;
        changed = true;
      }
    }
    return changed ? next : parsed;
  }

  if (Array.isArray(parsed) && isSchemaObject(schema.items)) {
    let changed = parsed !== value;
    const next = parsed.map((item) => {
      const childValue = coerceJsonStringValue(item, schema.items);
      if (childValue !== item) {
        changed = true;
      }
      return childValue;
    });
    return changed ? next : parsed;
  }

  return parsed;
}

function coerceAndValidateToolParams(params: unknown, schema: unknown, toolName: string): unknown {
  const coerced = coerceJsonStringValue(params, schema);
  if (!isSchemaObject(schema)) {
    return coerced;
  }
  const validation = validateJsonSchemaValue({
    schema,
    cacheKey: `tool:${toolName}:original-params`,
    value: coerced,
  });
  if (!validation.ok) {
    throw new Error(
      `Validation failed for tool "${toolName}":\n  - ${validation.errors.join("\n  - ")}`,
    );
  }
  return coerced;
}

function splitToolExecuteArgs(args: ToolExecuteArgsAny): {
  toolCallId: string;
  params: unknown;
  onUpdate: AgentToolUpdateCallback<unknown> | undefined;
  signal: AbortSignal | undefined;
} {
  if (isLegacyToolExecuteArgs(args)) {
    const [toolCallId, params, signal, onUpdate] = args;
    return {
      toolCallId,
      params,
      onUpdate,
      signal,
    };
  }
  const [toolCallId, params, onUpdate, _ctx, signal] = args;
  return {
    toolCallId,
    params,
    onUpdate,
    signal,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractReturnedFailureMessage(details: Record<string, unknown>): string {
  if (typeof details.error === "string" && details.error.trim()) return details.error.trim();
  if (typeof details.message === "string" && details.message.trim()) return details.message.trim();
  if (typeof details.status === "string" && details.status.trim()) return details.status.trim();
  return "Tool returned an error";
}

function isReturnedToolFailure(details: Record<string, unknown>): boolean {
  const status = typeof details.status === "string" ? details.status.toLowerCase() : "";
  return (
    details.success === false ||
    details.ok === false ||
    status === "error" ||
    status === "forbidden" ||
    status === "timeout"
  );
}

function hasFullToolErrorContract(details: Record<string, unknown>): boolean {
  return (
    typeof details.error_code === "string" &&
    typeof details.error_class === "string" &&
    typeof details.agent_instruction === "string" &&
    details.retry_policy !== null &&
    typeof details.retry_policy === "object" &&
    details.user_explanation !== null &&
    typeof details.user_explanation === "object" &&
    Array.isArray(details.forbidden_user_framing)
  );
}

function normalizeReturnedToolFailureResult(
  result: AgentToolResult<unknown>,
  normalizedName: string,
): AgentToolResult<unknown> {
  const details = asRecord(result.details);
  if (!details || !isReturnedToolFailure(details)) return result;
  if (hasFullToolErrorContract(details)) return result;

  const status = typeof details.status === "string" ? details.status.trim().toLowerCase() : "";
  const message = extractReturnedFailureMessage(details);
  const classificationText = status && status !== "error" ? `${status}: ${message}` : message;
  const failure = classifyToolFailure({ errorText: classificationText });
  return jsonResult({
    ...details,
    status: typeof details.status === "string" ? details.status : "error",
    tool: typeof details.tool === "string" ? details.tool : normalizedName,
    ...failure,
    error: message,
  });
}

export function toToolDefinitions(
  tools: AnyAgentTool[],
  options: ToolDefinitionAdapterOptions = {},
): ToolDefinition[] {
  return tools.map((tool) => {
    const name = tool.name || "tool";
    const normalizedName = normalizeToolName(name);
    const beforeHookWrapped = isToolWrappedWithBeforeToolCallHook(tool);
    const originalParameters = tool.parameters;
    return {
      name,
      label: tool.label ?? name,
      description: tool.description ?? "",
      parameters: makeJsonStringCoercibleSchema(originalParameters),
      execute: async (...args: ToolExecuteArgs): Promise<AgentToolResult<unknown>> => {
        const { toolCallId, params, onUpdate, signal } = splitToolExecuteArgs(args);
        let executeParams = params;
        try {
          executeParams = coerceAndValidateToolParams(params, originalParameters, name);
          if (!beforeHookWrapped) {
            const hookOutcome = await runBeforeToolCallHook({
              toolName: name,
              params: executeParams,
              toolCallId,
            });
            if (hookOutcome.blocked) {
              throw new Error(hookOutcome.reason);
            }
            executeParams = coerceAndValidateToolParams(
              hookOutcome.params,
              originalParameters,
              name,
            );
          }
          if (options.workflowCircuit) {
            const circuit = preflightWorkflowToolCall({
              ...options.workflowCircuit,
              toolName: normalizedName,
              params: executeParams,
              toolCallId,
            });
            if (!circuit.allowed) {
              return circuit.result;
            }
          }
          const rawResult = await tool.execute(toolCallId, executeParams, signal, onUpdate);
          const result = normalizeReturnedToolFailureResult(rawResult, normalizedName);
          const afterParams = beforeHookWrapped
            ? (consumeAdjustedParamsForToolCall(toolCallId) ?? executeParams)
            : executeParams;

          // Call after_tool_call hook
          const hookRunner = getGlobalHookRunner();
          if (hookRunner?.hasHooks("after_tool_call")) {
            try {
              await hookRunner.runAfterToolCall(
                {
                  toolName: name,
                  params: isPlainObject(afterParams) ? afterParams : {},
                  result,
                },
                { toolName: name },
              );
            } catch (hookErr) {
              logDebug(
                `after_tool_call hook failed: tool=${normalizedName} error=${String(hookErr)}`,
              );
            }
          }

          if (options.workflowCircuit) {
            recordWorkflowToolResult(
              {
                ...options.workflowCircuit,
                toolName: normalizedName,
                params: afterParams,
                toolCallId,
              },
              result,
            );
          }

          return result;
        } catch (err) {
          if (signal?.aborted) {
            throw err;
          }
          const errName =
            err && typeof err === "object" && "name" in err
              ? String((err as { name?: unknown }).name)
              : "";
          if (errName === "AbortError") {
            throw err;
          }
          if (beforeHookWrapped) {
            consumeAdjustedParamsForToolCall(toolCallId);
          }
          const described = describeToolExecutionError(err);
          if (described.stack && described.stack !== described.message) {
            logDebug(`tools: ${normalizedName} failed stack:\n${described.stack}`);
          }
          logError(`[tools] ${normalizedName} failed: ${described.message}`);

          const failure = classifyToolFailure({ errorText: described.message });
          const errorResult = jsonResult({
            status: "error",
            tool: normalizedName,
            ...failure,
          });

          if (options.workflowCircuit) {
            recordWorkflowToolResult(
              {
                ...options.workflowCircuit,
                toolName: normalizedName,
                params: executeParams,
                toolCallId,
              },
              errorResult,
            );
          }

          // Call after_tool_call hook for errors too
          const hookRunner = getGlobalHookRunner();
          if (hookRunner?.hasHooks("after_tool_call")) {
            try {
              await hookRunner.runAfterToolCall(
                {
                  toolName: normalizedName,
                  params: isPlainObject(params) ? params : {},
                  error: described.message,
                },
                { toolName: normalizedName },
              );
            } catch (hookErr) {
              logDebug(
                `after_tool_call hook failed: tool=${normalizedName} error=${String(hookErr)}`,
              );
            }
          }

          return errorResult;
        }
      },
    } satisfies ToolDefinition;
  });
}

// Convert client tools (OpenResponses hosted tools) to ToolDefinition format
// These tools are intercepted to return a "pending" result instead of executing
export function toClientToolDefinitions(
  tools: ClientToolDefinition[],
  onClientToolCall?: (
    toolName: string,
    params: Record<string, unknown>,
    toolCallId: string,
  ) => void,
  hookContext?: { agentId?: string; sessionKey?: string },
): ToolDefinition[] {
  return tools.map((tool) => {
    const func = tool.function;
    const originalParameters = func.parameters;
    return {
      name: func.name,
      label: func.name,
      description: func.description ?? "",
      // oxlint-disable-next-line typescript/no-explicit-any
      parameters: makeJsonStringCoercibleSchema(originalParameters) as any,
      execute: async (...args: ToolExecuteArgs): Promise<AgentToolResult<unknown>> => {
        const { toolCallId, params } = splitToolExecuteArgs(args);
        const executeParams = coerceAndValidateToolParams(params, originalParameters, func.name);
        const outcome = await runBeforeToolCallHook({
          toolName: func.name,
          params: executeParams,
          toolCallId,
          ctx: hookContext,
        });
        if (outcome.blocked) {
          throw new Error(outcome.reason);
        }
        const adjustedParams = coerceAndValidateToolParams(
          outcome.params,
          originalParameters,
          func.name,
        );
        const paramsRecord = isPlainObject(adjustedParams) ? adjustedParams : {};
        if (hookContext) {
          const circuit = preflightWorkflowToolCall({
            ...hookContext,
            toolName: func.name,
            params: paramsRecord,
            toolCallId,
          });
          if (!circuit.allowed) {
            return circuit.result;
          }
        }
        if (onClientToolCall) {
          onClientToolCall(func.name, paramsRecord, toolCallId);
        }
        return jsonResult({
          status: "pending",
          tool: func.name,
          message: "Tool execution delegated to client",
        });
      },
    } satisfies ToolDefinition;
  });
}
