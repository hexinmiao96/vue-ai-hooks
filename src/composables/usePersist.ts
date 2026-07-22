import { watch, type Ref } from 'vue'

/**
 * Configures Web Storage persistence for a single Vue ref.
 */
export interface UsePersistOptions<T> {
  /** Sets the base storage key; `version` appends an optional suffix. */
  key: string
  /**
   * Appends `:v${version}` to the key so incompatible payload versions remain
   * isolated. Omit this option to use the key unchanged.
   */
  version?: number
  /**
   * Converts the current value to a JSON-safe representation before storage.
   * The source value is passed directly to `JSON.stringify` when omitted.
   */
  serialize?: (value: T) => unknown
  /**
   * Converts parsed JSON back to `T`; return `null` to discard the stored
   * payload. The parsed value is used unchanged when omitted.
   */
  deserialize?: (raw: unknown) => T | null
  /**
   * Overrides the storage backend. The default is `window.localStorage` when
   * available; pass `null` to disable persistence or a shim for tests.
   */
  storage?: Storage | null
  /** Receives write errors, including storage quota failures. */
  onError?: (err: Error) => void
  /** Receives load errors, including malformed JSON. */
  onLoadError?: (err: Error) => void
  /** Receives clear errors from the underlying storage. */
  onClearError?: (err: Error) => void
}

/**
 * Restores a ref from Web Storage, then watches deeply and persists subsequent
 * changes.
 *
 * The returned `clear()` function removes only the stored entry; it does not
 * reset the source ref.
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

  // Restore before installing the watcher so the initial load is not written back immediately.
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
