# Testing

`vue-ai-hooks` is designed so most application tests can use fake providers
instead of real model APIs. This keeps tests fast, deterministic, and free from
network credentials.

## Use fake providers

Every composable receives a provider object. For `useChat`, implement the
`ChatProvider` interface and yield the chunks your component should observe:

```ts
import type { ChatProvider, ChatChunk } from 'vue-ai-hooks'

function fakeChatProvider(chunks: ChatChunk[]): ChatProvider {
  return {
    id: 'fake',
    async chat() {
      return (async function* () {
        for (const chunk of chunks) {
          await Promise.resolve()
          yield chunk
        }
      })()
    },
    async completion() {
      return (async function* () {
        yield ''
      })()
    },
    async embedding() {
      return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
    }
  }
}
```

Use small chunks to verify streaming behavior:

```ts
const provider = fakeChatProvider([{ content: 'Hel' }, { content: 'lo' }])
```

## Test completions without a network

`useCompletion` only needs a provider with a `completion()` stream:

```ts
import { useCompletion } from 'vue-ai-hooks'

const provider = {
  async completion() {
    return (async function* () {
      yield 'hel'
      yield 'lo'
    })()
  }
}

const { complete, completion } = useCompletion({
  provider: provider as Parameters<typeof useCompletion>[0]['provider']
})

await complete('Say hello')
expect(completion.value).toBe('hello')
```

## Test embeddings deterministically

Embedding tests should return fixed vectors. Avoid snapshots of provider output:

```ts
import type { ChatProvider } from 'vue-ai-hooks'

const provider: ChatProvider = {
  id: 'fake-embedding',
  async chat() {
    return (async function* () {
      yield {}
    })()
  },
  async completion() {
    return (async function* () {
      yield ''
    })()
  },
  async embedding() {
    return {
      embeddings: [
        [0.1, 0.2, 0.3],
        [0.3, 0.2, 0.1]
      ],
      model: 'fake-embed',
      usage: { promptTokens: 1, totalTokens: 1 }
    }
  }
}
```

## Test provider errors

Throw normal `Error` objects from fake providers when testing error states:

```ts
const provider = {
  async completion() {
    throw new Error('quota exceeded')
  }
}
```

Your component should keep loading state, error UI, and retry controls visible
enough for users to recover.

## Test persistence with explicit storage

When testing persistence, pass an explicit storage implementation instead of
depending on global `localStorage`. For SSR or no-op tests, pass `storage: null`.

See [`usePersist`](../reference/use-persist.md) for a small in-memory storage
example.

## What not to test with real providers

Avoid real provider calls in unit tests. Put live provider checks behind manual,
nightly, or integration-only workflows because they are slower, flaky, and
require secrets.

Unit tests should cover:

- Request payloads passed to fake providers.
- Streaming chunk accumulation.
- Abort and retry UI states.
- Error normalization and rendering.
- Persistence serialization and restore behavior.
