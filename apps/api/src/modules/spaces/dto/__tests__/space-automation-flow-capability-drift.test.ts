import { FLOW_CAPABILITY_CATALOG, type FlowCapabilityKind } from '@vibey/api-shared'
import { describe, expect, it } from 'vitest'
import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod'
import { AutomationActionSchema } from '../space-automation-action.dto'
import { AutomationTriggerSchema } from '../space-automation-trigger.dto'

type SchemaFieldSet = {
  required: Set<string>
  optional: Set<string>
}

type DriftRow = {
  kind: FlowCapabilityKind
  type: string
  missingInCatalog: string[]
  catalogOnly: string[]
  requirednessMismatches: string[]
}

const EXPECTED_FLOW_CAPABILITY_DRIFT: string[] = []

describe('space automation Flow capability drift', () => {
  it('keeps a known-gap baseline between Loop-visible capabilities and DTO schemas', () => {
    const driftRows = [
      ...compareCapabilityDrift(
        'action',
        schemaFieldSets(AutomationActionSchema),
        catalogFieldSets('action'),
      ),
      ...compareCapabilityDrift(
        'trigger',
        schemaFieldSets(AutomationTriggerSchema),
        catalogFieldSets('trigger'),
      ),
    ]

    expect(driftRows.map(formatDriftRow)).toEqual(EXPECTED_FLOW_CAPABILITY_DRIFT)
  })
})

function compareCapabilityDrift(
  kind: FlowCapabilityKind,
  schemaFields: Map<string, SchemaFieldSet>,
  catalogFields: Map<string, SchemaFieldSet>,
): DriftRow[] {
  const rows: DriftRow[] = []
  const sortedSchemaEntries = [...schemaFields.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )

  for (const [type, schema] of sortedSchemaEntries) {
    const catalog = catalogFields.get(type) ?? emptySchemaFieldSet()
    const schemaFieldNames = new Set([...schema.required, ...schema.optional])
    const catalogFieldNames = new Set([...catalog.required, ...catalog.optional])
    const missingInCatalog = [...schemaFieldNames]
      .filter((fieldName) => !catalogFieldNames.has(fieldName))
      .sort()
    const catalogOnly = [...catalogFieldNames]
      .filter((fieldName) => !schemaFieldNames.has(fieldName))
      .sort()
    const requirednessMismatches = [...schemaFieldNames]
      .filter((fieldName) => catalogFieldNames.has(fieldName))
      .flatMap((fieldName) => requirednessMismatch(fieldName, schema, catalog))
      .sort()

    if (missingInCatalog.length || catalogOnly.length || requirednessMismatches.length) {
      rows.push({ kind, type, missingInCatalog, catalogOnly, requirednessMismatches })
    }
  }

  return rows
}

function schemaFieldSets(schema: ZodTypeAny): Map<string, SchemaFieldSet> {
  const fieldSets = new Map<string, SchemaFieldSet>()

  for (const option of discriminatedUnionOptions(schema)) {
    const fieldSet = emptySchemaFieldSet()

    for (const [fieldName, fieldSchema] of Object.entries(option.shape)) {
      if (fieldName === 'type') continue
      if (isOptionalish(fieldSchema as ZodTypeAny)) {
        fieldSet.optional.add(fieldName)
      } else {
        fieldSet.required.add(fieldName)
      }
    }

    fieldSets.set(discriminatedUnionType(option), fieldSet)
  }

  return fieldSets
}

function catalogFieldSets(kind: FlowCapabilityKind): Map<string, SchemaFieldSet> {
  const fieldSets = new Map<string, SchemaFieldSet>()

  for (const capability of FLOW_CAPABILITY_CATALOG.filter((entry) => entry.kind === kind)) {
    const fieldSet = fieldSets.get(capability.type) ?? emptySchemaFieldSet()

    for (const fieldName of capability.requiredFields) fieldSet.required.add(fieldName)
    for (const fieldName of capability.optionalFields) fieldSet.optional.add(fieldName)

    fieldSets.set(capability.type, fieldSet)
  }

  return fieldSets
}

function discriminatedUnionOptions(schema: ZodTypeAny): ZodObject<ZodRawShape>[] {
  const options = zodDef(unwrapRefinements(schema)).options

  if (options instanceof Map) return [...options.values()] as ZodObject<ZodRawShape>[]
  if (Array.isArray(options)) return options as ZodObject<ZodRawShape>[]

  throw new Error('Unsupported Zod discriminated union options shape')
}

function unwrapRefinements(schema: ZodTypeAny): ZodTypeAny {
  let current = schema

  while (typeof zodDef(current).schema !== 'undefined') {
    current = zodDef(current).schema as ZodTypeAny
  }

  return current
}

function discriminatedUnionType(option: ZodObject<ZodRawShape>): string {
  const typeValue = zodDef(option.shape.type).value
  if (typeof typeValue !== 'string') throw new Error('Expected string literal union type')
  return typeValue
}

function isOptionalish(schema: ZodTypeAny): boolean {
  if (schema.isOptional()) return true
  const typeName = zodDef(schema).typeName
  return typeName === 'ZodDefault' || typeName === 'ZodOptional'
}

function requirednessMismatch(
  fieldName: string,
  schema: SchemaFieldSet,
  catalog: SchemaFieldSet,
): string[] {
  if (schema.required.has(fieldName) && catalog.optional.has(fieldName)) {
    return [`${fieldName}: schema_required/catalog_optional`]
  }
  if (schema.optional.has(fieldName) && catalog.required.has(fieldName)) {
    return [`${fieldName}: schema_optional/catalog_required`]
  }
  return []
}

function zodDef(schema: ZodTypeAny): Record<string, unknown> {
  return (schema as ZodTypeAny & { _def: Record<string, unknown> })._def
}

function emptySchemaFieldSet(): SchemaFieldSet {
  return {
    required: new Set<string>(),
    optional: new Set<string>(),
  }
}

function formatDriftRow(row: DriftRow): string {
  return [
    `${row.kind}.${row.type}`,
    `missing_in_catalog: ${formatFieldList(row.missingInCatalog)}`,
    `catalog_only: ${formatFieldList(row.catalogOnly)}`,
    `requiredness: ${formatFieldList(row.requirednessMismatches)}`,
  ].join(' | ')
}

function formatFieldList(fieldNames: string[]): string {
  return fieldNames.length ? fieldNames.join(', ') : '-'
}
