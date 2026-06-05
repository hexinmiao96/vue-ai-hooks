/**
 * Tiny dependency-free ID generator.
 * Good enough for client-side message IDs. Not cryptographically secure.
 */
let counter = 0

export function createId(prefix = 'msg'): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`
}
