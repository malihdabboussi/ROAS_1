/**
 * OpenResponses API Zod Schemas
 *
 * Zod schemas for the OpenResponses `/v1/responses` endpoint.
 * This module is isolated from gateway imports to enable future codegen and prevent drift.
 *
 * @see https://www.open-responses.com/
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Content Parts
// ─────────────────────────────────────────────────────────────────────────────

export const InputTextContentPartSchema = z
  .object({
    type: z.literal("input_text"),
    text: z.string(),
  })
  .strict();

export const OutputTextContentPartSchema = z
  .object({
    type: z.literal("output_text"),
    text: z.string(),
  })
  .strict();

// OpenResponses Image Content: Supports URL or base64 sources
export const InputImageSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("url"),
    url: z.string().url(),
  }),
  z.object({
    type: z.literal("base64"),
    media_type: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
    data: z.string().min(1), // base64-encoded
  }),
]);

export const InputImageContentPartSchema = z
  .object({
    type: z.literal("input_image"),
    source: InputImageSourceSchema,
  })
  .strict();

// OpenResponses File Content: Supports URL or base64 sources
export const InputFileSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("url"),
    url: z.string().url(),
  }),
  z.object({
    type: z.literal("base64"),
    media_type: z.string().min(1), // MIME type
    data: z.string().min(1), // base64-encoded
    filename: z.string().optional(),
  }),
]);

export const InputFileContentPartSchema = z
  .object({
    type: z.literal("input_file"),
    source: InputFileSourceSchema,
  })
  .strict();

export const ContentPartSchema = z.discriminatedUnion("type", [
  InputTextContentPartSchema,
  OutputTextContentPartSchema,
  InputImageContentPartSchema,
  InputFileContentPartSchema,
]);

export type ContentPart = z.infer<typeof ContentPartSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Item Types (ItemParam)
// ─────────────────────────────────────────────────────────────────────────────

export const MessageItemRoleSchema = z.enum(["system", "developer", "user", "assistant"]);

export type MessageItemRole = z.infer<typeof MessageItemRoleSchema>;

export const MessageItemSchema = z
  .object({
    type: z.literal("message"),
    role: MessageItemRoleSchema,
    content: z.union([z.string(), z.array(ContentPartSchema)]),
  })
  .strict();

export const FunctionCallItemSchema = z
  .object({
    type: z.literal("function_call"),
    id: z.string().optional(),
    call_id: z.string().optional(),
    name: z.string(),
    arguments: z.string(),
  })
  .strict();

export const FunctionCallOutputItemSchema = z
  .object({
    type: z.literal("function_call_output"),
    call_id: z.string(),
    output: z.string(),
  })
  .strict();

export const ReasoningItemSchema = z
  .object({
    type: z.literal("reasoning"),
    content: z.string().optional(),
    encrypted_content: z.string().optional(),
    summary: z.string().optional(),
  })
  .strict();

export const ItemReferenceItemSchema = z
  .object({
    type: z.literal("item_reference"),
    id: z.string(),
  })
  .strict();

export const ItemParamSchema = z.discriminatedUnion("type", [
  MessageItemSchema,
  FunctionCallItemSchema,
  FunctionCallOutputItemSchema,
  ReasoningItemSchema,
  ItemReferenceItemSchema,
]);

export type ItemParam = z.infer<typeof ItemParamSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const FunctionToolDefinitionSchema = z
  .object({
    type: z.literal("function"),
    function: z.object({
      name: z.string().min(1, "Tool name cannot be empty"),
      description: z.string().optional(),
      parameters: z.record(z.string(), z.unknown()).optional(),
    }),
  })
  .strict();

// OpenResponses tool definitions match internal ToolDefinition structure
export const ToolDefinitionSchema = FunctionToolDefinitionSchema;

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Request Body
// ─────────────────────────────────────────────────────────────────────────────

export const ToolChoiceSchema = z.union([
  z.literal("auto"),
  z.literal("none"),
  z.literal("required"),
  z.object({
    type: z.literal("function"),
    function: z.object({ name: z.string() }),
  }),
]);

export const ReasoningEffortSchema = z.enum([
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);

export const VerbosityEffortSchema = z.enum(["minimal", "low", "medium", "high", "xhigh", "max"]);

export const SkillCatalogEntrySchema = z
  .object({
    id: z.string().min(1),
    skill_key: z.string().min(1),
    name: z.string(),
    description: z.string(),
  })
  .strict();

export const SkillCatalogSchema = z
  .object({
    source: z.literal("vibey_db"),
    entries: z.array(SkillCatalogEntrySchema),
  })
  .strict();

export const RuntimeCredentialSchema = z
  .object({
    provider: z.string().min(1),
    access_token: z.string().min(1),
  })
  .strict();

export const CreateResponseBodySchema = z
  .object({
    model: z.string(),
    input: z.union([z.string(), z.array(ItemParamSchema)]),
    instructions: z.string().optional(),
    tools: z.array(ToolDefinitionSchema).optional(),
    tool_choice: ToolChoiceSchema.optional(),
    stream: z.boolean().optional(),
    max_output_tokens: z.number().int().positive().optional(),
    max_tool_calls: z.number().int().positive().optional(),
    user: z.string().optional(),
    // Phase 1: ignore but accept these fields
    temperature: z.number().optional(),
    top_p: z.number().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    store: z.boolean().optional(),
    previous_response_id: z.string().optional(),
    lane: z.string().min(1).max(128).optional(),
    reasoning: z
      .object({
        effort: ReasoningEffortSchema.optional(),
        max_tokens: z.number().int().positive().optional(),
        summary: z.enum(["auto", "concise", "detailed"]).optional(),
      })
      .optional(),
    verbosity: VerbosityEffortSchema.optional(),
    context_window_tokens: z.number().int().positive().optional(),
    truncation: z.enum(["auto", "disabled"]).optional(),
    // Vibey RBAC: integration IDs the agent's team allows.
    enabled_toolkits: z.array(z.string()).optional(),
    // Vibey RBAC: native Vibey backend action names denied for this turn.
    disabled_native_actions: z.array(z.string()).optional(),
    // Vibey runtime skills: metadata only; bodies/resources are loaded lazily by read_skill.
    skill_catalog: SkillCatalogSchema.optional(),
    // Vibey gateway runtime auth: per-request provider token, never persisted by OpenClaw.
    runtime_credentials: z.array(RuntimeCredentialSchema).max(4).optional(),
  })
  .strict();

export type CreateResponseBody = z.infer<typeof CreateResponseBodySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Response Resource
// ─────────────────────────────────────────────────────────────────────────────

export const ResponseStatusSchema = z.enum([
  "in_progress",
  "completed",
  "failed",
  "cancelled",
  "incomplete",
]);

export type ResponseStatus = z.infer<typeof ResponseStatusSchema>;

export const OutputItemSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("message"),
      id: z.string(),
      role: z.literal("assistant"),
      content: z.array(OutputTextContentPartSchema),
      status: z.enum(["in_progress", "completed"]).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("function_call"),
      id: z.string(),
      call_id: z.string(),
      name: z.string(),
      arguments: z.string(),
      status: z.enum(["in_progress", "completed"]).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("reasoning"),
      id: z.string(),
      content: z.string().optional(),
      summary: z.string().optional(),
    })
    .strict(),
]);

export type OutputItem = z.infer<typeof OutputItemSchema>;

export const UsageSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  cache_read_input_tokens: z.number().int().nonnegative().optional(),
  cache_creation_input_tokens: z.number().int().nonnegative().optional(),
});

export type Usage = z.infer<typeof UsageSchema>;

export const ResponseResourceSchema = z.object({
  id: z.string(),
  object: z.literal("response"),
  created_at: z.number().int(),
  status: ResponseStatusSchema,
  model: z.string(),
  output: z.array(OutputItemSchema),
  usage: UsageSchema,
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ResponseResource = z.infer<typeof ResponseResourceSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Streaming Event Types
// ─────────────────────────────────────────────────────────────────────────────

export const ResponseCreatedEventSchema = z.object({
  type: z.literal("response.created"),
  response: ResponseResourceSchema,
});

export const ResponseInProgressEventSchema = z.object({
  type: z.literal("response.in_progress"),
  response: ResponseResourceSchema,
});

export const ResponseCompletedEventSchema = z.object({
  type: z.literal("response.completed"),
  response: ResponseResourceSchema,
});

export const ResponseFailedEventSchema = z.object({
  type: z.literal("response.failed"),
  response: ResponseResourceSchema,
});

export const OutputItemAddedEventSchema = z.object({
  type: z.literal("response.output_item.added"),
  output_index: z.number().int().nonnegative(),
  item: OutputItemSchema,
});

export const OutputItemDoneEventSchema = z.object({
  type: z.literal("response.output_item.done"),
  output_index: z.number().int().nonnegative(),
  item: OutputItemSchema,
});

export const ContentPartAddedEventSchema = z.object({
  type: z.literal("response.content_part.added"),
  item_id: z.string(),
  output_index: z.number().int().nonnegative(),
  content_index: z.number().int().nonnegative(),
  part: OutputTextContentPartSchema,
});

export const ContentPartDoneEventSchema = z.object({
  type: z.literal("response.content_part.done"),
  item_id: z.string(),
  output_index: z.number().int().nonnegative(),
  content_index: z.number().int().nonnegative(),
  part: OutputTextContentPartSchema,
});

export const OutputTextStartEventSchema = z.object({
  type: z.literal("response.output_text.start"),
  item_id: z.string(),
  output_index: z.number().int().nonnegative(),
  content_index: z.number().int().nonnegative(),
});

export const OutputTextDeltaEventSchema = z.object({
  type: z.literal("response.output_text.delta"),
  item_id: z.string(),
  output_index: z.number().int().nonnegative(),
  content_index: z.number().int().nonnegative(),
  delta: z.string(),
});

export const OutputTextDoneEventSchema = z.object({
  type: z.literal("response.output_text.done"),
  item_id: z.string(),
  output_index: z.number().int().nonnegative(),
  content_index: z.number().int().nonnegative(),
  text: z.string(),
});

export const ToolStartEventSchema = z.object({
  type: z.literal("response.tool.start"),
  name: z.string(),
  tool_call_id: z.string().optional(),
  args: z.unknown().optional(),
});

export const ToolUpdateEventSchema = z.object({
  type: z.literal("response.tool.update"),
  name: z.string(),
  tool_call_id: z.string().optional(),
  partial_result: z.unknown().optional(),
});

export const ToolArgsDeltaEventSchema = z.object({
  type: z.literal("response.tool_args.delta"),
  name: z.string(),
  tool_call_id: z.string().optional(),
  partial_json: z.string().optional(),
});

export const ToolDoneEventSchema = z.object({
  type: z.literal("response.tool.done"),
  name: z.string(),
  tool_call_id: z.string().optional(),
  is_error: z.boolean().optional(),
  action: z.string().optional(),
  args: z.unknown().optional(),
  result: z.unknown().optional(),
});

export const ReasoningDeltaEventSchema = z.object({
  type: z.literal("response.reasoning.delta"),
  delta: z.string(),
  text: z.string(),
});

export type StreamingEvent =
  | z.infer<typeof ResponseCreatedEventSchema>
  | z.infer<typeof ResponseInProgressEventSchema>
  | z.infer<typeof ResponseCompletedEventSchema>
  | z.infer<typeof ResponseFailedEventSchema>
  | z.infer<typeof OutputItemAddedEventSchema>
  | z.infer<typeof OutputItemDoneEventSchema>
  | z.infer<typeof ContentPartAddedEventSchema>
  | z.infer<typeof ContentPartDoneEventSchema>
  | z.infer<typeof OutputTextStartEventSchema>
  | z.infer<typeof OutputTextDeltaEventSchema>
  | z.infer<typeof OutputTextDoneEventSchema>
  | z.infer<typeof ToolStartEventSchema>
  | z.infer<typeof ToolUpdateEventSchema>
  | z.infer<typeof ToolDoneEventSchema>
  | z.infer<typeof ReasoningDeltaEventSchema>;
