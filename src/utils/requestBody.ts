/**
 * Merges default and request-specific JSON body fields, with request values taking precedence.
 */
export function mergeRequestBody(
  defaultBody?: Record<string, unknown>,
  requestBody?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!defaultBody && !requestBody) return undefined
  return {
    ...(defaultBody ?? {}),
    ...(requestBody ?? {})
  }
}
