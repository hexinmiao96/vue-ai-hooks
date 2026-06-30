export function mergeHeaders(...sources: Array<HeadersInit | undefined>): Record<string, string> {
  const merged: Record<string, string> = {}
  const names: Record<string, string> = {}

  for (const source of sources) {
    for (const [key, value] of headerEntries(source)) {
      const lowerKey = key.toLowerCase()
      const existingKey = names[lowerKey]
      if (existingKey) delete merged[existingKey]
      names[lowerKey] = key
      merged[key] = value
    }
  }

  return merged
}

export function headersToRecord(
  source: HeadersInit | undefined
): Record<string, string> | undefined {
  if (!source) return undefined
  return mergeHeaders(source)
}

function headerEntries(source: HeadersInit | undefined): Array<[string, string]> {
  if (!source) return []
  if (typeof Headers !== 'undefined' && source instanceof Headers) {
    const entries: Array<[string, string]> = []
    source.forEach((value, key) => entries.push([key, value]))
    return entries
  }
  if (Array.isArray(source)) return source.map(([key, value]) => [key, value])
  return Object.entries(source)
}
