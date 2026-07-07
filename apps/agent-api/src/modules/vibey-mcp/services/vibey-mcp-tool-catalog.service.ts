import { Injectable } from '@nestjs/common'
import { MCP_V1_TOOL_CATALOG, type Action } from '@vibey/agent-policy'
import {
  ACTION_SCHEMAS,
  type ActionParamType,
  type ActionSchema,
} from '../../artifacts/services/artifact-action-schemas'

type JsonSchemaProperty = {
  type: string
  description?: string
  format?: string
  enum?: string[]
  additionalProperties?: boolean
  items?: JsonSchemaProperty
}

type ToolInputSchema = {
  type: 'object'
  description?: string
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
  additionalProperties: boolean
}

function typeToJsonSchema(type: ActionParamType, description?: string): JsonSchemaProperty {
  if (type === 'iso_date') return { type: 'string', format: 'date-time', description }
  if (type === 'platform') return { type: 'string', enum: ['instagram', 'linkedin'], description }
  if (type === 'object') return { type: 'object', additionalProperties: true, description }
  if (type === 'object_array') {
    return {
      type: 'array',
      description,
      items: { type: 'object', additionalProperties: true },
    }
  }
  if (type === 'string_array') return { type: 'array', description, items: { type: 'string' } }
  return { type, description }
}

function requiredKeys(schema: ActionSchema): string[] {
  return schema.required.filter((key): key is string => typeof key === 'string')
}

function propertyKeys(schema: ActionSchema): string[] {
  return [
    ...new Set([
      ...schema.required.flatMap((requirement) =>
        Array.isArray(requirement) ? requirement : [requirement],
      ),
      ...(schema.optional ?? []),
      ...Object.keys(schema.types ?? {}),
    ]),
  ]
}

function schemaDescription(description: string, schema: ActionSchema | undefined): string {
  if (!schema) return `${description} Call describe_vibey_action for the action contract.`
  const notes = [
    description,
    ...(schema.useWhen?.map((item) => `Use when: ${item}`) ?? []),
    ...(schema.doNotUseWhen?.map((item) => `Do not use when: ${item}`) ?? []),
    ...schema.required.filter(Array.isArray).map((keys) => `Requires one of: ${keys.join(', ')}.`),
  ]
  return notes.join(' ')
}

function buildInputSchema(action: Action, description: string): ToolInputSchema {
  const schema = ACTION_SCHEMAS[action]
  if (!schema) {
    return {
      type: 'object',
      description: schemaDescription(description, undefined),
      additionalProperties: true,
    }
  }

  const properties = Object.fromEntries(
    propertyKeys(schema).map((key) => {
      const type = schema.types?.[key] ?? 'string'
      return [
        key,
        {
          ...typeToJsonSchema(type, schema.descriptions?.[key]),
          ...(schema.allowedValues?.[key] ? { enum: schema.allowedValues[key] } : {}),
        },
      ]
    }),
  )

  return {
    type: 'object',
    description: schemaDescription(description, schema),
    properties,
    required: requiredKeys(schema),
    additionalProperties: true,
  }
}

@Injectable()
export class VibeyMcpToolCatalogService {
  listTools() {
    return MCP_V1_TOOL_CATALOG.map((tool) => ({
      name: tool.toolName,
      description: tool.description,
      inputSchema: buildInputSchema(tool.action, tool.description),
    }))
  }
}
