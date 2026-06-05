# useCompletion

Vue 3 composable for single-shot streaming completions.

## Usage

```ts
import { useCompletion, openai } from 'vue-ai-hooks'

const { completion, complete, isLoading, error } = useCompletion({
  provider: openai({ apiKey: '...' })
})

await complete('Write a haiku about TypeScript:')
```

## Options

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `provider` | `ChatProvider` | required | The provider to use. |
| `initialCompletion` | `string` | `''` | Seed the completion. |
| `defaultRequest` | `Partial<CompletionRequest>` | `{}` | Default options. |
| `onFinish` | `(completion: string) => void` | — | Called once the completion is finished. |
| `onError` | `(e: Error) => void` | — | Called on any error. |

## Return value

| Property | Type | Description |
|---|---|---|
| `completion` | `Ref<string>` | The current completion (grows during streaming). |
| `input` | `Ref<string>` | The prompt, if not passed inline to `complete()`. |
| `isLoading` | `Ref<boolean>` | True while a stream is in flight. |
| `error` | `Ref<Error \| null>` | Last error. |
| `complete(prompt?, opts?)` | `(string?, Partial<CompletionRequest>) => Promise<string>` | Run a completion. Resolves to the final string. |
| `stop()` | `() => void` | Abort the in-flight stream. |
| `setCompletion(value)` | `(string) => void` | Replace the completion (e.g. on reset). |
| `abortController` | `Ref<AbortController \| null>` | Exposed for advanced use cases. |

## Notes

- Anthropic has no `/v1/completions` endpoint. `useCompletion` with the Anthropic
  provider routes through `/v1/messages` as a single-turn chat.
- The completion is reset to `''` at the start of each `complete()` call.
