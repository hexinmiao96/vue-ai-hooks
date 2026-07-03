# usePromptSuggestions

Headless prompt suggestion state for chat composers and task starters.

It does not render UI, call a provider, or send messages for you. Use it to
normalize static, reactive, or app-loaded suggestions, filter them by the
current composer input, and track which suggestion the user selected before you
decide whether to fill `useChat().input`, call `sendMessage()`, or open a custom
workflow.

Public exports: `usePromptSuggestions`, `PromptSuggestion`,
`PromptSuggestionInput`, `PromptSuggestionFilter`,
`PromptSuggestionFilterContext`, `PromptSuggestionLoader`,
`PromptSuggestionLoaderContext`, `UsePromptSuggestionsOptions`, and
`UsePromptSuggestionsReturn`.

## Usage

```ts
import { useChat, usePromptSuggestions } from 'vue-ai-hooks'

const chat = useChat({ api: '/api/chat' })
const suggestions = usePromptSuggestions({
  input: chat.input,
  messages: chat.messages,
  suggestions: [
    'Summarize this thread',
    {
      id: 'risks',
      title: 'Find risks',
      prompt: 'Find the top risks and missing checks in this conversation.',
      description: 'Good before handoff'
    }
  ]
})

function applySuggestion(id: string) {
  const selected = suggestions.selectSuggestion(id)
  if (selected) chat.setInput(selected.prompt)
}
```

## Options

| Name          | Type                                   | Default | Description                                                                              |
| ------------- | -------------------------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `suggestions` | `MaybeRefOrGetter<PromptSuggestion[]>` | `[]`    | Static, ref, computed, or getter-backed suggestions. Strings are accepted.               |
| `input`       | `MaybeRefOrGetter<string \| null>`     | `''`    | Current composer input used by the default filter.                                       |
| `messages`    | `MaybeRefOrGetter<readonly Message[]>` | `[]`    | Optional message history passed to custom filters.                                       |
| `max`         | `MaybeRefOrGetter<number \| null>`     | `6`     | Maximum visible suggestions. Use `Infinity` for no cap.                                  |
| `filter`      | `PromptSuggestionFilter`               | text    | Custom filter. Receives the normalized suggestion, input, messages, and all suggestions. |
| `loader`      | `PromptSuggestionLoader`               | -       | Optional app-owned loader for dynamic suggestions. Receives input, messages, and signal. |
| `loadOnInit`  | `boolean`                              | `false` | Calls `reloadSuggestions()` immediately when a loader is present.                        |

String suggestions become `{ id: 'suggestion-N', title, prompt }`. Object
suggestions keep their `id`, `title`, `description`, and `metadata`; blank
prompts are skipped.

## Return value

| Property                 | Type                                             | Description                                                   |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------- |
| `suggestions`            | `ComputedRef<PromptSuggestion[]>`                | Normalized static and loaded suggestions before filtering.    |
| `visibleSuggestions`     | `ComputedRef<PromptSuggestion[]>`                | Filtered suggestions safe to render as chips or list items.   |
| `selectedSuggestion`     | `Ref<PromptSuggestion \| null>`                  | Last suggestion selected through `selectSuggestion()`.        |
| `isLoading`              | `Ref<boolean>`                                   | `true` while `loader` is resolving.                           |
| `error`                  | `Ref<Error \| null>`                             | Last non-aborted loader error.                                |
| `reloadSuggestions()`    | `() => Promise<PromptSuggestion[]>`              | Aborts the previous load, calls `loader`, and returns result. |
| `clearError()`           | `() => void`                                     | Clears the loader error without changing suggestions.         |
| `selectSuggestion(item)` | `(id \| suggestion) => PromptSuggestion \| null` | Selects by id or object and returns the normalized item.      |
| `clearSelection()`       | `() => void`                                     | Clears `selectedSuggestion`.                                  |

## Dynamic loading

```ts
const { visibleSuggestions, isLoading, error, reloadSuggestions, selectSuggestion } =
  usePromptSuggestions({
    input: chat.input,
    messages: chat.messages,
    suggestions: [{ id: 'handoff', prompt: 'Write a handoff note.' }],
    async loader({ input, messages, signal }) {
      const response = await fetch('/api/prompt-suggestions', {
        method: 'POST',
        body: JSON.stringify({ input, messages }),
        signal
      })
      return (await response.json()) as PromptSuggestionInput[]
    },
    loadOnInit: true
  })

async function refreshSuggestions() {
  await reloadSuggestions()
}
```

`reloadSuggestions()` cancels the previous in-flight load with `AbortSignal` so
stale responses cannot overwrite newer suggestions.

## Custom filtering

```ts
const { visibleSuggestions } = usePromptSuggestions({
  input: chat.input,
  messages: chat.messages,
  suggestions: [
    { id: 'checkout', prompt: 'Run the checkout approval demo.' },
    { id: 'handoff', prompt: 'Write a handoff note.' }
  ],
  filter(suggestion, context) {
    if (context.input) return suggestion.prompt.toLowerCase().includes(context.input.toLowerCase())
    return context.messages.length === 0 || suggestion.id !== 'handoff'
  }
})
```

Keep provider-backed or agent-generated suggestion loading in your app. Pass the
loader or resulting array into this composable so the Vue UI keeps one small,
predictable state layer.
