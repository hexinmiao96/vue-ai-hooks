// Tool-call delta merger. Stays in its own file so the useChat module stays small.
import type { ToolCall } from '../types'

export interface ToolCallDelta {
  index?: number
  id?: string
  type?: 'function'
  function?: { name?: string; arguments?: string }
}

/** Merge streaming tool_call deltas (OpenAI format) into a stable array. */
export function mergeDeltas(existing: ToolCall[] | undefined, delta: ToolCallDelta[] | undefined): ToolCall[] {
  const acc = existing ? [...existing] : []
  for (const d of delta ?? []) {
    const idx = d.index
    if (idx === undefined) continue
    if (!acc[idx]) {
      acc[idx] = {
        id: d.id ?? '',
        type: 'function',
        function: { name: d.function?.name ?? '', arguments: d.function?.arguments ?? '' }
      }
    } else {
      if (d.id) acc[idx].id = d.id
      if (d.function?.name) acc[idx].function.name += d.function.name
      if (d.function?.arguments) acc[idx].function.arguments += d.function.arguments
    }
  }
  return acc
}
