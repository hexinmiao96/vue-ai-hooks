import { watch, type Ref } from 'vue'

/**
 * Options for `usePersist` — drop-in localStorage persistence for a single
 * reactive ref.
 */
export interface UsePersistOptions<T> {
  /** localStorage key. Required. */
  key: string
  /**
   * Bump this when the shape of `T` changes incompatibly. The persisted
   * payload is stored under `${key}:v${version}` so old data is naturally
   * ignored. Omit to skip versioning.
   */
  version?: number
  /**
   * Custom serializer. Receives the current value, returns the JSON-safe
   * representation. Default: identity.
   */
  serialize?: (value: T) => unknown
  /**
   * Custom deserializer. Receives the parsed JSON, returns the value (or null
   * to discard it). Default: identity.
   */
  deserialize?: (raw: unknown) => T | null
  /**
   * Override the storage. Default: `window.localStorage` when available.
   * Pass an in-memory shim in tests.
   */
  storage?: Storage | null
  /**
   * Receives save errors such as quota failures.
   */
  onError?: (err: Error) => void
  /** Receives load errors such as malformed JSON. */
  onLoadError?: (err: Error) => void
  /** Receives clear errors from the underlying storage. */
  onClearError?: (err: Error) => void
}

/**
 * Wire a ref up to localStorage. Hydrates on creation, writes on every
 * mutation. Returns a `clear()` function that removes the storage entry.
 *
 * ```ts
 * const messages = ref<Message[]>([])
 * const { clear } = usePersist(messages, { key: 'my-chat' })
 * ```
 */
export function usePersist<T>(
  source: Ref<T>,
  options: UsePersistOptions<T>
): {
  clear: () => void
} {
  const { key, version, serialize, deserialize, storage, onError, onLoadError, onClearError } =
    options
  const versionedKey = version !== undefined ? `${key}:v${version}` : key
  const effectiveStorage =
    storage !== undefined ? storage : typeof window !== 'undefined' ? window.localStorage : null

  // Hydrate
  if (effectiveStorage) {
    try {
      const raw = effectiveStorage.getItem(versionedKey)
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw)
        const restored = deserialize ? deserialize(parsed) : (parsed as T)
        if (restored !== null && restored !== undefined) {
          source.value = restored
        }
      }
    } catch (err) {
      onLoadError?.(normalizePersistError(err))
    }
  }

  // Persist on change
  if (effectiveStorage) {
    watch(
      source,
      (value) => {
        try {
          const payload = serialize ? serialize(value) : value
          effectiveStorage.setItem(versionedKey, JSON.stringify(payload))
        } catch (err) {
          onError?.(normalizePersistError(err))
        }
      },
      { deep: true }
    )
  }

  function clear() {
    if (effectiveStorage) {
      try {
        effectiveStorage.removeItem(versionedKey)
      } catch (err) {
        onClearError?.(normalizePersistError(err))
      }
    }
  }

  return { clear }
}

function normalizePersistError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}
