import { z } from "zod";
import { ToolPolicySchema } from "./zod-schema.agent-runtime.js";
import { ChannelHeartbeatVisibilitySchema } from "./zod-schema.channels.js";
import {
  BlockStreamingCoalesceSchema,
  DmConfigSchema,
  DmPolicySchema,
  GroupPolicySchema,
  HexColorSchema,
  MarkdownConfigSchema,
  ProviderCommandsSchema,
  ReplyToModeSchema,
  RetryConfigSchema,
  requireOpenAllowFrom,
} from "./zod-schema.core.js";
import { sensitive } from "./zod-schema.sensitive.js";

const ToolPolicyBySenderSchema = z.record(z.string(), ToolPolicySchema).optional();

export const DiscordDmSchema = z
  .object({
    enabled: z.boolean().optional(),
    policy: DmPolicySchema.optional(),
    allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    groupEnabled: z.boolean().optional(),
    groupChannels: z.array(z.union([z.string(), z.number()])).optional(),
  })
  .strict();

export const DiscordGuildChannelSchema = z
  .object({
    allow: z.boolean().optional(),
    requireMention: z.boolean().optional(),
    tools: ToolPolicySchema,
    toolsBySender: ToolPolicyBySenderSchema,
    skills: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
    users: z.array(z.union([z.string(), z.number()])).optional(),
    roles: z.array(z.union([z.string(), z.number()])).optional(),
    systemPrompt: z.string().optional(),
    includeThreadStarter: z.boolean().optional(),
    autoThread: z.boolean().optional(),
  })
  .strict();

export const DiscordGuildSchema = z
  .object({
    slug: z.string().optional(),
    requireMention: z.boolean().optional(),
    tools: ToolPolicySchema,
    toolsBySender: ToolPolicyBySenderSchema,
    reactionNotifications: z.enum(["off", "own", "all", "allowlist"]).optional(),
    users: z.array(z.union([z.string(), z.number()])).optional(),
    roles: z.array(z.union([z.string(), z.number()])).optional(),
    channels: z.record(z.string(), DiscordGuildChannelSchema.optional()).optional(),
  })
  .strict();

const DiscordUiSchema = z
  .object({
    components: z
      .object({
        accentColor: HexColorSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .optional();

export const DiscordAccountSchema = z
  .object({
    name: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
    markdown: MarkdownConfigSchema,
    enabled: z.boolean().optional(),
    commands: ProviderCommandsSchema,
    configWrites: z.boolean().optional(),
    token: z.string().optional().register(sensitive),
    proxy: z.string().optional(),
    allowBots: z.boolean().optional(),
    groupPolicy: GroupPolicySchema.optional().default("allowlist"),
    historyLimit: z.number().int().min(0).optional(),
    dmHistoryLimit: z.number().int().min(0).optional(),
    dms: z.record(z.string(), DmConfigSchema.optional()).optional(),
    textChunkLimit: z.number().int().positive().optional(),
    chunkMode: z.enum(["length", "newline"]).optional(),
    blockStreaming: z.boolean().optional(),
    blockStreamingCoalesce: BlockStreamingCoalesceSchema.optional(),
    maxLinesPerMessage: z.number().int().positive().optional(),
    mediaMaxMb: z.number().positive().optional(),
    retry: RetryConfigSchema,
    actions: z
      .object({
        reactions: z.boolean().optional(),
        stickers: z.boolean().optional(),
        emojiUploads: z.boolean().optional(),
        stickerUploads: z.boolean().optional(),
        polls: z.boolean().optional(),
        permissions: z.boolean().optional(),
        messages: z.boolean().optional(),
        threads: z.boolean().optional(),
        pins: z.boolean().optional(),
        search: z.boolean().optional(),
        memberInfo: z.boolean().optional(),
        roleInfo: z.boolean().optional(),
        roles: z.boolean().optional(),
        channelInfo: z.boolean().optional(),
        voiceStatus: z.boolean().optional(),
        events: z.boolean().optional(),
        moderation: z.boolean().optional(),
        channels: z.boolean().optional(),
        presence: z.boolean().optional(),
      })
      .strict()
      .optional(),
    replyToMode: ReplyToModeSchema.optional(),
    // Aliases for channels.discord.dm.policy / channels.discord.dm.allowFrom. Prefer these for
    // inheritance in multi-account setups (shallow merge works; nested dm object doesn't).
    dmPolicy: DmPolicySchema.optional(),
    allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    dm: DiscordDmSchema.optional(),
    guilds: z.record(z.string(), DiscordGuildSchema.optional()).optional(),
    heartbeat: ChannelHeartbeatVisibilitySchema,
    execApprovals: z
      .object({
        enabled: z.boolean().optional(),
        approvers: z.array(z.union([z.string(), z.number()])).optional(),
        agentFilter: z.array(z.string()).optional(),
        sessionFilter: z.array(z.string()).optional(),
        cleanupAfterResolve: z.boolean().optional(),
        target: z.enum(["dm", "channel", "both"]).optional(),
      })
      .strict()
      .optional(),
    ui: DiscordUiSchema,
    intents: z
      .object({
        presence: z.boolean().optional(),
        guildMembers: z.boolean().optional(),
      })
      .strict()
      .optional(),
    pluralkit: z
      .object({
        enabled: z.boolean().optional(),
        token: z.string().optional().register(sensitive),
      })
      .strict()
      .optional(),
    responsePrefix: z.string().optional(),
    ackReaction: z.string().optional(),
    activity: z.string().optional(),
    status: z.enum(["online", "dnd", "idle", "invisible"]).optional(),
    activityType: z
      .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
      .optional(),
    activityUrl: z.string().url().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const activityText = typeof value.activity === "string" ? value.activity.trim() : "";
    const hasActivity = Boolean(activityText);
    const hasActivityType = value.activityType !== undefined;
    const activityUrl = typeof value.activityUrl === "string" ? value.activityUrl.trim() : "";
    const hasActivityUrl = Boolean(activityUrl);

    if ((hasActivityType || hasActivityUrl) && !hasActivity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "channels.discord.activity is required when activityType or activityUrl is set",
        path: ["activity"],
      });
    }

    if (value.activityType === 1 && !hasActivityUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "channels.discord.activityUrl is required when activityType is 1 (Streaming)",
        path: ["activityUrl"],
      });
    }

    if (hasActivityUrl && value.activityType !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "channels.discord.activityType must be 1 (Streaming) when activityUrl is set",
        path: ["activityType"],
      });
    }

    const dmPolicy = value.dmPolicy ?? value.dm?.policy ?? "pairing";
    const allowFrom = value.allowFrom ?? value.dm?.allowFrom;
    const allowFromPath =
      value.allowFrom !== undefined ? (["allowFrom"] as const) : (["dm", "allowFrom"] as const);
    requireOpenAllowFrom({
      policy: dmPolicy,
      allowFrom,
      ctx,
      path: [...allowFromPath],
      message:
        'channels.discord.dmPolicy="open" requires channels.discord.allowFrom (or channels.discord.dm.allowFrom) to include "*"',
    });
  });

export const DiscordConfigSchema = DiscordAccountSchema.extend({
  accounts: z.record(z.string(), DiscordAccountSchema.optional()).optional(),
});
