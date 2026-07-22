/**
 * Calculates cosine similarity in the range `[-1, 1]` for two finite, non-zero vectors.
 *
 * Throws when vector lengths differ or either vector is empty, non-finite, or zero magnitude.
 */
export function cosineSimilarity(vectorA: readonly number[], vectorB: readonly number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('cosineSimilarity() vectors must have the same length')
  }
  if (!vectorA.length) {
    throw new Error('cosineSimilarity() vectors must not be empty')
  }

  let dot = 0
  let normA = 0
  let normB = 0
  for (let index = 0; index < vectorA.length; index += 1) {
    const a = vectorA[index]
    const b = vectorB[index]
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error('cosineSimilarity() vectors must contain only finite numbers')
    }
    dot += a * b
    normA += a * a
    normB += b * b
  }

  if (normA === 0 || normB === 0) {
    throw new Error('cosineSimilarity() vectors must have non-zero magnitude')
  }

  const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB))
  return Math.max(-1, Math.min(1, similarity))
}
