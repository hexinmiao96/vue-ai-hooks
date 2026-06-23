# usePersist

Small persistence helper for wiring any Vue `Ref` to `localStorage`.

`useChat` uses this helper internally when you pass the `persist` option, but it
is also exported for app state that needs the same save-and-restore behavior.

Public TypeScript type: `UsePersistOptions`.

## Usage

```ts
import { ref } from 'vue'
import { usePersist } from 'vue-ai-hooks'

const messages = ref([])
const { clear } = usePersist(messages, {
  key: 'my-app:messages',
  version: 1
})
```

`usePersist` hydrates the ref on creation, watches it deeply, and writes every
change back to storage.

## Options

| Name          | Type                          | Default                              | Description                                                                     |
| ------------- | ----------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| `key`         | `string`                      | required                             | Storage key.                                                                    |
| `version`     | `number`                      | -                                    | Adds `:v${version}` to the storage key so incompatible old data is ignored.     |
| `serialize`   | `(value: T) => unknown`       | identity                             | Convert the ref value before JSON serialization.                                |
| `deserialize` | `(raw: unknown) => T \| null` | identity                             | Convert parsed JSON back to the ref value. Return `null` to discard saved data. |
| `storage`     | `Storage \| null`             | `window.localStorage` when available | Override storage, or pass `null` for SSR/tests.                                 |
| `onError`     | `(err: Error) => void`        | -                                    | Receives save errors such as quota failures. Load errors are ignored.           |

## Return value

| Property  | Type         | Description                                  |
| --------- | ------------ | -------------------------------------------- |
| `clear()` | `() => void` | Removes the current versioned storage entry. |

## Versioning

Use `version` whenever the persisted shape changes incompatibly:

```ts
usePersist(settings, {
  key: 'my-app:settings',
  version: 2
})
```

Version `2` stores data under `my-app:settings:v2`, leaving old `:v1` data
unused instead of trying to migrate it implicitly.

## Custom serialization

```ts
const selectedIds = ref(new Set<string>())

usePersist(selectedIds, {
  key: 'selected-ids',
  serialize: (value) => [...value],
  deserialize: (raw) => (Array.isArray(raw) ? new Set(raw as string[]) : null)
})
```

`serialize` should return JSON-safe data. `deserialize` receives parsed JSON,
not the raw string.

## SSR and tests

When `window.localStorage` is unavailable, `usePersist` becomes a no-op. Pass an
in-memory `Storage` shim in tests when you want deterministic persistence:

```ts
usePersist(source, {
  key: 'test-key',
  storage: memoryStorage
})
```
