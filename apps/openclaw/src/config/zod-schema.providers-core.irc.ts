import { z } from "zod";
import { ToolPolicySchema } from "./zod-schema.agent-runtime.js";
import { ChannelHeartbeatVisibilitySchema } from "./zod-schema.channels.js";
import {
  BlockStreamingCoalesceSchema,
  DmConfigSchema,
  DmPolicySchema,
  GroupPolicySchema,
  MarkdownConfigSchema,
  requireOpenAllowFrom,
} from "./zod-schema.core.js";
import { sensitive } from "./zod-schema.sensitive.js";

const ToolPolicyBySenderSchema = z.record(z.string(), ToolPolicySchema).optional();

export const IrcGroupSchema = z
  .object({
    requireMention: z.boolean().optional(),
    tools: ToolPolicySchema,
    toolsBySender: ToolPolicyBySenderSchema,
    skills: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
    allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    systemPrompt: z.string().optional(),
  })
  .strict();

export const IrcNickServSchema = z
  .object({
    enabled: z.boolean().optional(),
    service: z.string().optional(),
    password: z.string().optional().register(sensitive),
    passwordFile: z.string().optional(),
    register: z.boolean().optional(),
    registerEmail: z.string().optional(),
  })
  .strict();

export const IrcAccountSchemaBase = z
  .object({
    name: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
    markdown: MarkdownConfigSchema,
    enabled: z.boolean().optional(),
    configWrites: z.boolean().optional(),
    host: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
    tls: z.boolean().optional(),
    nick: z.string().optional(),
    username: z.string().optional(),
    realname: z.string().optional(),
    password: z.string().optional().register(sensitive),
    passwordFile: z.string().optional(),
    nickserv: IrcNickServSchema.optional(),
    channels: z.array(z.string()).optional(),
    dmPolicy: DmPolicySchema.optional().default("pairing"),
    allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    groupAllowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    groupPolicy: GroupPolicySchema.optional().default("allowlist"),
    groups: z.record(z.string(), IrcGroupSchema.optional()).optional(),
    mentionPatterns: z.array(z.string()).optional(),
    historyLimit: z.number().int().min(0).optional(),
    dmHistoryLimit: z.number().int().min(0).optional(),
    dms: z.record(z.string(), DmConfigSchema.optional()).optional(),
    textChunkLimit: z.number().int().positive().optional(),
    chunkMode: z.enum(["length", "newline"]).optional(),
    blockStreaming: z.boolean().optional(),
    blockStreamingCoalesce: BlockStreamingCoalesceSchema.optional(),
    mediaMaxMb: z.number().positive().optional(),
    heartbeat: ChannelHeartbeatVisibilitySchema,
    responsePrefix: z.string().optional(),
  })
  .strict();

type IrcBaseConfig = z.infer<typeof IrcAccountSchemaBase>;

function refineIrcAllowFromAndNickserv(value: IrcBaseConfig, ctx: z.RefinementCtx): void {
  requireOpenAllowFrom({
    policy: value.dmPolicy,
    allowFrom: value.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.irc.dmPolicy="open" requires channels.irc.allowFrom to include "*"',
  });
  if (value.nickserv?.register && !value.nickserv.registerEmail?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nickserv", "registerEmail"],
      message: "channels.irc.nickserv.register=true requires channels.irc.nickserv.registerEmail",
    });
  }
}

export const IrcAccountSchema = IrcAccountSchemaBase.superRefine((value, ctx) => {
  refineIrcAllowFromAndNickserv(value, ctx);
});

export const IrcConfigSchema = IrcAccountSchemaBase.extend({
  accounts: z.record(z.string(), IrcAccountSchema.optional()).optional(),
}).superRefine((value, ctx) => {
  refineIrcAllowFromAndNickserv(value, ctx);
});
