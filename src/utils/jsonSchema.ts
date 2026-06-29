export function validateJsonSchema(
  value: unknown,
  schema: Record<string, unknown>,
  path = 'object'
): string | null {
  const types = schemaTypes(schema.type)
  if (types.length && !types.some((type) => matchesJsonType(value, type))) {
    return `${path} must be ${types.join(' or ')}`
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((item) => sameJsonValue(item, value))) {
    return `${path} must be one of ${schema.enum.map(formatJsonValue).join(', ')}`
  }

  const objectSchema =
    recordSchema(schema.properties) || Array.isArray(schema.required) || schema.additionalProperties
  if (objectSchema) {
    if (!isJsonObject(value)) return `${path} must be object`
    const properties = recordSchema(schema.properties) ?? {}
    const required = schema.required
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
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) return `${path}.${key} is not allowed`
      }
    } else if (isJsonObject(schema.additionalProperties)) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) {
          const error = validateJsonSchema(
            value[key],
            schema.additionalProperties,
            `${path}.${key}`
          )
          if (error) return error
        }
      }
    }
  }

  if (Array.isArray(value) && isJsonObject(schema.items)) {
    for (let index = 0; index < value.length; index += 1) {
      const error = validateJsonSchema(value[index], schema.items, `${path}[${index}]`)
      if (error) return error
    }
  }

  return null
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
