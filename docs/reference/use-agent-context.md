# useAgentContextRegistry

Headless, Vue-scoped application context for chat and agent requests.

It does not create a Copilot UI, call a provider, or require a global provider.
Use it to collect reactive app state from your component tree, serialize it into
a stable system message, and pass that context into `useChat()` or your own
agent/proxy layer.

Public exports: `useAgentContextRegistry`, `useAgentContext`,
`formatAgentContexts`, `createAgentContextMessage`,
`withAgentContextMessage`, `resolveAgentContexts`, `AgentContextInput`,
`AgentContextSnapshot`, `AgentContextRegistry`, `AgentContextMessageOptions`,
`AgentContextSerializable`, and `AgentContextSource`.

## Usage with useChat

```ts
import { useAgentContext, useAgentContextRegistry, useChat } from 'vue-ai-hooks'

const agentContext = useAgentContextRegistry()

useAgentContext(agentContext, {
  description: 'Current dashboard filters',
  value: () => ({
    status: selectedStatus.value,
    owner: selectedOwner.value
  })
})

const chat = useChat({
  api: '/api/chat',
  agentContext,
  agentContextMessage: {
    title: 'Runtime context'
  }
})
```

When a chat request is prepared, `useChat()` inserts one system message after any
leading system messages:

```txt
Runtime context
- Current dashboard filters: {"status":"open","owner":"me"}
```

The context message is part of the provider request only. It is not appended to
the visible `messages` history.

## Registering context

```ts
const unregister = useAgentContext(agentContext, {
  id: 'route',
  description: computed(() => `Route ${route.name}`),
  value: () => ({
    path: route.fullPath,
    selectedId: selectedTicketId.value
  }),
  enabled: () => Boolean(selectedTicketId.value)
})
```

`useAgentContext()` returns an `unregister()` function. When called inside a Vue
effect scope or component setup, it also unregisters automatically on scope
cleanup.

## Registry API

| Property or method             | Type                                             | Description                                         |
| ------------------------------ | ------------------------------------------------ | --------------------------------------------------- |
| `contexts`                     | `ComputedRef<AgentContextSnapshot[]>`            | Current serializable context snapshots.             |
| `register(input)`              | `(AgentContextInput) => () => void`              | Register a context entry and return unregister.     |
| `toJSON()`                     | `() => AgentContextSnapshot[]`                   | Clone snapshots for request bodies or logs.         |
| `toText(opts?)`                | `() => string`                                   | Format snapshots as model-readable text.            |
| `toSystemMessage(opts?)`       | `() => Message \| null`                          | Build a `system` message or `null` when empty.      |
| `withContextMessage(messages)` | `(ChatRequestMessage[]) => ChatRequestMessage[]` | Insert the context message into a request snapshot. |
| `clear()`                      | `() => void`                                     | Remove every registered context entry.              |

## Options

### AgentContextInput

| Name          | Type                                            | Default | Description                                              |
| ------------- | ----------------------------------------------- | ------- | -------------------------------------------------------- |
| `id`          | `string`                                        | auto    | Stable id for the context entry.                         |
| `description` | `MaybeRefOrGetter<string \| null \| undefined>` | -       | Human-readable label shown to the model.                 |
| `value`       | `MaybeRefOrGetter<AgentContextSerializable>`    | -       | Serializable value. Refs, computeds, and getters update. |
| `enabled`     | `MaybeRefOrGetter<boolean \| null>`             | `true`  | Set false to omit the entry without unregistering it.    |

### AgentContextMessageOptions

| Name        | Type     | Default                 | Description                               |
| ----------- | -------- | ----------------------- | ----------------------------------------- |
| `id`        | `string` | `'agent-context'`       | Message id used to avoid duplicate rows.  |
| `title`     | `string` | `'Application context'` | First line of the generated text.         |
| `createdAt` | `Date`   | `new Date()`            | Timestamp copied onto the system message. |

## Manual request shaping

You can skip `useChat({ agentContext })` and use the helpers directly:

```ts
const body = {
  tenantId,
  context: agentContext.toJSON()
}

const messages = agentContext.withContextMessage(chat.messages.value)
```

Use this when your backend expects structured context in `body` instead of a
system message.
