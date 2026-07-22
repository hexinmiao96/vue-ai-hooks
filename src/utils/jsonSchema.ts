type JsonSchemaValidationResult<T = unknown> =
  { success: true; value: T } | { success: false; error: Error }

type JsonSchemaValidator<T = unknown> = (value: unknown) => boolean | JsonSchemaValidationResult<T>

/** Wraps a JSON Schema and an optional runtime validator for typed structured output. */
export interface JsonSchemaDefinition<T = unknown> {
  readonly kind: 'json-schema'
  readonly schema: Record<string, unknown>
  readonly validate?: JsonSchemaValidator<T>
}

type JsonSchemaInput<T = unknown> = Record<string, unknown> | JsonSchemaDefinition<T>

/** Creates a typed JSON Schema definition with an optional custom validator. */
export function jsonSchema<T = unknown>(
  schema: Record<string, unknown>,
  options: { validate?: JsonSchemaValidator<T> } = {}
): JsonSchemaDefinition<T> {
  return {
    kind: 'json-schema',
    schema,
    ...(options.validate ? { validate: options.validate } : {})
  }
}

/** Unwraps a JSON Schema definition to its raw schema object. */
export function schemaToJsonSchema(schema: JsonSchemaInput): Record<string, unknown> {
  return isJsonSchemaDefinition(schema) ? schema.schema : schema
}

/** Returns whether a value is a wrapped JSON Schema definition. */
export function isJsonSchemaDefinition(value: unknown): value is JsonSchemaDefinition {
  return isJsonObject(value) && value.kind === 'json-schema' && isJsonObject(value.schema)
}

/**
 * Validates the supported JSON Schema subset and returns the first error message, or `null`.
 */
export function validateJsonSchema(
  value: unknown,
  schema: JsonSchemaInput,
  path = 'object'
): string | null {
  const jsonSchema = schemaToJsonSchema(schema)
  const types = schemaTypes(jsonSchema.type)
  if (types.length && !types.some((type) => matchesJsonType(value, type))) {
    return `${path} must be ${types.join(' or ')}`
  }

  if (
    Array.isArray(jsonSchema.enum) &&
    !jsonSchema.enum.some((item) => sameJsonValue(item, value))
  ) {
    return `${path} must be one of ${jsonSchema.enum.map(formatJsonValue).join(', ')}`
  }

  const objectSchema =
    recordSchema(jsonSchema.properties) ||
    Array.isArray(jsonSchema.required) ||
    jsonSchema.additionalProperties
  if (objectSchema) {
    if (!isJsonObject(value)) return `${path} must be object`
    const properties = recordSchema(jsonSchema.properties) ?? {}
    const required = jsonSchema.required
    if (Array.isArray(required)) {
      for (const key of required) {
        if (typeof key === 'string' && !(key in value)) return `${path}.${key} is required`
      }
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      if (key in value) {
        const error = validateJsonSchema(value[key], childSchema, `${path}.${key}`)
        if (error) return error
      }
    }
    if (jsonSchema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) return `${path}.${key} is not allowed`
      }
    } else if (isJsonObject(jsonSchema.additionalProperties)) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) {
          const error = validateJsonSchema(
            value[key],
            jsonSchema.additionalProperties,
            `${path}.${key}`
          )
          if (error) return error
        }
      }
    }
  }

  if (Array.isArray(value) && isJsonObject(jsonSchema.items)) {
    for (let index = 0; index < value.length; index += 1) {
      const error = validateJsonSchema(value[index], jsonSchema.items, `${path}[${index}]`)
      if (error) return error
    }
  }

  if (isJsonSchemaDefinition(schema) && schema.validate) {
    return validateCustomJsonSchema(value, schema.validate, path)
  }

  return null
}

function validateCustomJsonSchema(
  value: unknown,
  validate: JsonSchemaValidator,
  path: string
): string | null {
  let result: boolean | JsonSchemaValidationResult
  try {
    result = validate(value)
  } catch (err) {
    return formatCustomValidationError(path, err)
  }
  if (typeof result === 'boolean') {
    return result ? null : `${path} did not match validator`
  }
  if (isJsonObject(result) && result.success === true) return null
  if (isJsonObject(result) && result.success === false) {
    return formatCustomValidationError(path, result.error)
  }
  return null
}

function formatCustomValidationError(path: string, err: unknown) {
  if (err instanceof Error && err.message) return `${path} did not match validator: ${err.message}`
  return `${path} did not match validator`
}

function schemaTypes(type: unknown): string[] {
  if (typeof type === 'string') return [type]
  if (Array.isArray(type)) return type.filter((item): item is string => typeof item === 'string')
  return []
}

function matchesJsonType(value: unknown, type: string) {
  if (type === 'array') return Array.isArray(value)
  if (type === 'integer') return Number.isInteger(value)
  if (type === 'null') return value === null
  if (type === 'object') return isJsonObject(value)
  return typeof value === type
}

function recordSchema(value: unknown): Record<string, Record<string, unknown>> | null {
  if (!isJsonObject(value)) return null
  const entries = Object.entries(value).filter(
    (entry): entry is [string, Record<string, unknown>] => isJsonObject(entry[1])
  )
  return Object.fromEntries(entries)
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sameJsonValue(a: unknown, b: unknown) {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

function formatJsonValue(value: unknown) {
  return JSON.stringify(value)
}
