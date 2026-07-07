import { Injectable } from '@nestjs/common'
import type { LiveSession, LiveSessionScope } from './brain-live.types'

@Injectable()
export class BrainLiveToolDeclarationsService {
  buildToolDeclarations(scope: LiveSessionScope): object[] {
    const brainLabel =
      scope.label ??
      (scope.type === 'user'
        ? 'personal brain'
        : scope.type === 'company'
          ? 'Company Cortex'
          : 'this brain')

    const coreFunctions: object[] = [
      {
        name: 'save_user_memory',
        description: `Save a new memory, fact, idea, or note to the current brain (${brainLabel}).`,
        parameters: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The memory content to save. Be specific and detailed.',
            },
            memory_type: {
              type: 'string',
              description: 'Category of the memory.',
              enum: ['fact', 'decision', 'insight', 'story', 'framework', 'preference', 'event'],
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional tags for categorization.',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'search_user_brain',
        description: `Search the current brain (${brainLabel}) for relevant memories and knowledge.`,
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query describing what to find.' },
            limit: { type: 'number', description: 'Maximum number of results (default 5).' },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_brain_context',
        description:
          'Search all accessible brains for related context. Use only when the user explicitly asks to search all brains or everything they can access.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query describing what to find.' },
            limit: { type: 'number', description: 'Maximum number of results (default 5).' },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_user_brain_memories',
        description: `Get the most recently added memories from the current brain (${brainLabel}).`,
        parameters: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of recent memories to return (default 5, max 20).',
            },
          },
        },
      },
      {
        name: 'get_brain_stats',
        description: `Get statistics about the current brain (${brainLabel}) — total memories, types, etc.`,
        parameters: { type: 'object', properties: {} },
      },
      ...(scope.type !== 'company'
        ? [
            {
              name: 'crystallize_user_brain',
              description:
                'Extract deep insights and create a neural snapshot from a piece of text. Use when the user shares something profound or asks you to analyze a thought deeply.',
              parameters: {
                type: 'object',
                properties: {
                  input: {
                    type: 'string',
                    description: 'The text to crystallize into a neural snapshot.',
                  },
                },
                required: ['input'],
              },
            },
          ]
        : []),
    ]

    const crossBrainFunctions: object[] = [
      {
        name: 'list_available_brains',
        description:
          'List all brains the user has access to (personal brain + agent brains). Use when the user wants to copy, move, or save to another brain.',
        parameters: { type: 'object', properties: {} },
      },
    ]

    return [{ functionDeclarations: [...coreFunctions, ...crossBrainFunctions] }]
  }

  buildAgentToolDeclarations(_agentKey: string): object[] {
    return [
      {
        functionDeclarations: [
          {
            name: 'delegate_work',
            description:
              'Delegate a task to the agent backend. Use this whenever the user asks you to create, update, manage, search, or do anything that requires action. Describe the full task in natural language — the backend agent will handle tool selection, multi-step execution, and return the result.',
            parameters: {
              type: 'object',
              properties: {
                task: {
                  type: 'string',
                  description:
                    'A natural-language description of what the user wants done. Include all relevant details, context, and preferences mentioned by the user.',
                },
              },
              required: ['task'],
            },
          },
          {
            name: 'check_delegation',
            description:
              'Check the progress of a delegated task. Waits up to wait_seconds then returns current status. Returns early if the task finishes before the wait is up. If delegation_id is omitted, checks the most recent task.',
            parameters: {
              type: 'object',
              properties: {
                delegation_id: {
                  type: 'string',
                  description:
                    'The delegation ID from delegate_work. Omit to check the most recent task.',
                },
                wait_seconds: {
                  type: 'number',
                  description:
                    'Seconds to wait before returning. Returns early if the task finishes. Use 10 for periodic checks, 0 for immediate status.',
                },
              },
            },
          },
          {
            name: 'queue_message',
            description:
              'Send a follow-up message to a task that is already running. Use this INSTEAD of delegate_work when the user wants to modify, refine, add to, or redirect work that is currently in progress. The message is injected into the running session so the agent sees it as a continuation of the same conversation.',
            parameters: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description:
                    'The follow-up instruction or correction to send to the running task.',
                },
                delegation_id: {
                  type: 'string',
                  description:
                    'The delegation ID to target. Omit to target the most recent running task.',
                },
              },
              required: ['message'],
            },
          },
          {
            name: 'read_file',
            description:
              'Read the contents of a file from your workspace. Use this to read skill instructions, examples, data files, or any workspace file.',
            parameters: {
              type: 'object',
              properties: {
                file_path: {
                  type: 'string',
                  description:
                    'Relative path to the file (e.g. "skills/offer-builder/SKILL.md", "SKILLS.md")',
                },
              },
              required: ['file_path'],
            },
          },
          {
            name: 'read_document',
            description:
              'Read a document from media assets by asset_id. Use mode=describe first, then mode=read with page_range for larger PDFs.',
            parameters: {
              type: 'object',
              properties: {
                asset_id: {
                  type: 'string',
                  description: 'Media asset UUID for the document to read',
                },
                mode: {
                  type: 'string',
                  description: 'describe | read | search',
                },
                page_range: {
                  type: 'array',
                  description: 'Optional [startPage, endPage] for PDF reads',
                  items: { type: 'number' },
                },
                query: {
                  type: 'string',
                  description: 'Required for mode=search',
                },
                max_pages: {
                  type: 'number',
                  description: 'Maximum pages to read in one call (default 20)',
                },
              },
              required: ['asset_id'],
            },
          },
        ],
      },
    ]
  }

  buildToolsForSession(session: LiveSession): object[] {
    const { scope } = session
    if (scope.type === 'agent' && scope.agentId) {
      return this.buildAgentToolDeclarations(scope.agentId)
    }
    return this.buildToolDeclarations(scope)
  }
}
